// One-time tips: the first time a house rule comes into play at a table this device is at, a small card says what
// just happened and why, then stays out of the way. Each tip shows once per device, ever.
import {LOAN_MAX, SHUFA_MARKUP, boardOf} from '../engine/data';
import {canShufa, chrikaCandidates, rideTargets, sideBonus} from '../engine/engine';
import type {Game} from '../engine/types';
import {cityN, fmt, spN, t} from '../i18n/core';
import {iControl} from '../ui/render';
import {guideRules, RuleCard} from './Guide';
import {refresh} from './store';

/** a tip on screen: its id, the rule it is about, its text */
interface Tip { id: string; k: string; text: string; more: boolean }

type Entry = [string, Record<string, unknown>];
const SEEN = 'moropoly.tipsSeen';
const HOLD = 20000;

let showing: Tip | null = null;
let shownIn = '';
let timer = 0;

function seen(): string[] { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { return []; } }
function markSeen(id: string) { try { localStorage.setItem(SEEN, JSON.stringify([...seen().filter(x => x !== id), id])); } catch { /* storage blocked */ } }

const name = (G: Game, pid: number) => G.players[pid]?.name || '';
/** the latest matching entry among the last few in the journal, so a tip is about something that just happened */
const latest = (G: Game, ok: (e: Entry) => boolean) => (G.log as Entry[]).slice(0, 8).find(ok);
const paid = (e: Entry) => e[0] === 'pay' || e[0] === 'payShort';

/** the tips that apply right now, the ones a player can act on first. `win` is the window open, if any. */
function candidates(G: Game, win: string | null): Tip[] {
  const s = G.settings, out: Tip[] = [], cur = G.cur;
  const myTurn = iControl(cur) && !G.players[cur]?.bankrupt;
  const calm = !G.auction && !G.trade && !G.chrikaOffer && !G.pending && (G.phase === 'roll' || G.phase === 'end');
  // while you write a trade offer: the timer has stopped (the guide explains itself, so not while reading it)
  if (s.timer && (win === 'trade' || win === 'chrika') && G.drafting != null && iControl(G.drafting))
    out.push({id: 'pause', k: 'pause', text: t('tip.pause'), more: false});
  if (win) return out;
  if (s.chrika && G.ghedrOpen)
    out.push({id: 'ghedrOpen', k: 'chrika', text: t('tip.ghedrOpen'), more: true});
  if (s.chrika && myTurn && calm) {
    const cands = chrikaCandidates(G, cur);
    if (cands.length) out.push({id: 'chrika', k: 'chrika', text: t('tip.chrika', {p: name(G, cur), o: name(G, cands[0].other), g: cityN(cands[0].g)}), more: true});
  }
  if (s.train && myTurn) {
    const to = rideTargets(G, cur);
    if (to.length) out.push({id: 'ride', k: 'train', text: t('tip.ride', {p: name(G, cur), s: to.map(x => spN(x, G)).join(', ')}), more: true});
  }
  if (s.shufa && myTurn && calm && Object.keys(G.props).some(i => canShufa(G, cur, +i)))
    out.push({id: 'shufa', k: 'shufa', text: t('tip.shufa', {p: name(G, cur), n: Math.round(SHUFA_MARKUP * 100)}), more: true});
  if (s.credit) {
    const p = G.players.find(q => iControl(q.id) && !q.bankrupt && q.cash < 0 && (q.loan || 0) < LOAN_MAX);
    if (p) out.push({id: 'credit', k: 'credit', text: t('tip.credit', {p: p.name, a: fmt(LOAN_MAX - (p.loan || 0))}), more: true});
  }
  if (s.bills) {
    const e = latest(G, x => paid(x) && x[1].why === 'bill');
    if (e) out.push({id: 'bills', k: 'bills', text: t('tip.bills', {p: e[1].p as string, o: e[1].to as string, a: fmt(e[1].a as number)}), more: true});
  }
  if (s.solidarity) {
    const e = latest(G, x => x[0] === 'passGoSolidarity');
    if (e) out.push({id: 'solidarity', k: 'solidarity', text: t('tip.solidarity', {p: e[1].p as string, a: fmt(e[1].a as number)}), more: true});
  }
  if (s.train) {
    const rails = boardOf(G).rails;
    const e = latest(G, x => paid(x) && x[1].why === 'rent' && rails.includes(x[1].s as number) && sideBonus(G, x[1].s as number) > 0);
    if (e) out.push({id: 'rail', k: 'train', text: t('tip.rail', {p: e[1].p as string, o: e[1].to as string, a: fmt(e[1].a as number), s: spN(e[1].s as number, G)}), more: true});
  }
  return out;
}

/** after every change (with no animation playing): show the first tip this device has not seen yet */
export function checkTips(G: Game | null, win: string | null) {
  if (!G || G.over) { if (showing) hideTip(); return; }
  if (showing && shownIn !== G.gid) hideTip();
  if (showing) return;
  const done = seen(), tip = candidates(G, win).find(x => !done.includes(x.id) && guideRules(G).some(r => r.k === x.k));
  if (!tip) return;
  markSeen(tip.id);
  showing = tip; shownIn = G.gid;
  clearTimeout(timer); timer = window.setTimeout(hideTip, HOLD);
  refresh();
}
export function hideTip() { clearTimeout(timer); showing = null; refresh(); }

/** the tip card, above everything, at the top of the screen */
export function TipCard({G, more}: {G: Game | null; more: (k: string) => void}) {
  const tip = showing;
  if (!tip || !G || shownIn !== G.gid) return null;
  const r = guideRules(G).find(x => x.k === tip.k);
  if (!r) return null;
  return (
    <div className="tip" role="status" key={tip.id}>
      <div className="tip-card"><RuleCard r={r} small /></div>
      <div className="tip-body">
        <span className="g-lab">{t('tip.lab')} · {t('gd.' + r.k)}</span>
        <p>{tip.text}</p>
        <div className="tip-btns">
          {tip.more && <button className="btn sm ghost" onClick={() => { hideTip(); more(r.k); }}>{t('tip.more')}</button>}
          <button className="btn sm gold" onClick={hideTip}>{t('tip.ok')}</button>
        </div>
      </div>
      <i className="tip-time" style={{animationDuration: HOLD + 'ms'}} />
    </div>
  );
}
