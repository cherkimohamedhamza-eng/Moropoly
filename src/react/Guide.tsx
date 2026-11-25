// "House rules at this table": a short step-through guide to the optional rules a game is played with, in the
// look of the property cards. It opens once per game on each device, and again from the Rules tab.
import {useState, type ReactNode} from 'react';
import {app} from '../app/state';
import {BAND, BILL_DAR, BILL_RIAD, CHRIKA_PAYOUT, FAIR_STEP, LOAN_MAX, LOAN_STEP, RAIL_RENT, RAIL_SIDE, SHUFA_FROM, SHUFA_MARKUP, boardOf} from '../engine/data';
import {interestOn, salary, startCash} from '../engine/engine';
import type {Game} from '../engine/types';
import {fmt, spN, t} from '../i18n/core';

export interface Rule { k: string; ar: string; band: string; icon: ReactNode; p?: Record<string, string | number>; ex: ReactNode }

const ico = (d: ReactNode) => <svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const ICONS: Record<string, ReactNode> = {
  fairStart: ico(<><path d="M8 38h32" /><rect x="10" y="28" width="7" height="10" /><rect x="20.5" y="21" width="7" height="17" /><rect x="31" y="14" width="7" height="24" /><path d="M13.5 22v-4M24 15v-4M34.5 8v-3" /></>),
  deeds: ico(<><rect x="9" y="11" width="18" height="26" rx="2" transform="rotate(-8 18 24)" /><rect x="21" y="11" width="18" height="26" rx="2" transform="rotate(8 30 24)" /><path d="M25 19h10M25.5 24h8" transform="rotate(8 30 24)" /></>),
  credit: ico(<><path d="M8 18 24 9l16 9" /><path d="M10 18h28" /><path d="M13 22v12M21 22v12M27 22v12M35 22v12" /><path d="M8 38h32" /></>),
  solidarity: ico(<><circle cx="18" cy="24" r="9" /><circle cx="30" cy="24" r="9" /><path d="M18 20v8M30 20v8" /></>),
  shufa: ico(<><circle cx="15" cy="24" r="7" /><path d="M22 24h18M34 24v6M39 24v4" /></>),
  bills: ico(<><path d="M20 8 12 26h10l-4 14 14-20H22l4-12z" /><path d="M36 10c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z" /></>),
  train: ico(<><rect x="13" y="8" width="22" height="26" rx="6" /><path d="M13 22h22" /><circle cx="19" cy="28" r="1.6" fill="currentColor" /><circle cx="29" cy="28" r="1.6" fill="currentColor" /><path d="M18 34l-5 7M30 34l5 7M16 39h16" /></>),
  chrika: ico(<><circle cx="17" cy="24" r="9" /><circle cx="31" cy="24" r="9" /><path d="M24 17v14" /></>),
  pause: ico(<><circle cx="24" cy="25" r="14" /><path d="M24 7v4M20 7h8" /><path d="M20.5 20v10M27.5 20v10" /></>),
};

/** the optional rules this game is played with, in the order a player meets them */
export function guideRules(G: Game): Rule[] {
  const s = G.settings, out: Rule[] = [];
  const n = G.players.length;
  if (s.fairStart && n > 1) {
    const step = FAIR_STEP[n as keyof typeof FAIR_STEP] || 400, base = startCash(s);
    out.push({k: 'fairStart', ar: 'بداية عادلة', band: '#6b4a2b', icon: ICONS.fairStart, p: {a: fmt(step)},
      ex: <div className="g-chips">{G.players.map((p, i) => <span key={p.id} className="g-chip"><i style={{background: p.color}} />{p.name}<b>{fmt(base + i * step)}</b></span>)}</div>});
  }
  if (s.deeds) out.push({k: 'deeds', ar: 'عقود البداية', band: '#8a5a2b', icon: ICONS.deeds, ex: t('gd.deeds.ex')});
  if (s.credit) out.push({k: 'credit', ar: 'الكريدي', band: '#0f5a3a', icon: ICONS.credit, p: {a: fmt(LOAN_MAX), s: fmt(LOAN_STEP)},
    ex: t('gd.credit.ex', {a: fmt(2000), b: fmt(interestOn(2000))})});
  if (s.solidarity) out.push({k: 'solidarity', ar: 'راتب التضامن', band: '#b5532a', icon: ICONS.solidarity, ex: t('gd.solidarity.ex', {a: fmt(salary(G) * 2), b: fmt(salary(G))})});
  const B = boardOf(G);
  if (s.shufa) {
    const i = Math.max(0, B.spaces.findIndex(x => x.id === '24')), price = (B.spaces[i] as {price: number}).price;
    out.push({k: 'shufa', ar: 'الشفعة', band: '#7a1f24', icon: ICONS.shufa, p: {r: SHUFA_FROM, n: Math.round(SHUFA_MARKUP * 100)},
      ex: t('gd.shufa.ex', {s: spN(i, G), a: fmt(price), b: fmt(Math.round(price * SHUFA_MARKUP))})});
  }
  if (s.bills) out.push({k: 'bills', ar: 'الفواتير', band: '#3f5b68', icon: ICONS.bills, p: {a: fmt(BILL_DAR), b: fmt(BILL_RIAD)},
    ex: t('gd.bills.ex', {a: fmt(3 * BILL_DAR + BILL_RIAD)})});
  if (s.train) {
    const rv = Math.max(0, B.spaces.findIndex(x => x.id === '15')), side = Math.floor(rv / B.side);
    let row = 0; for (let j = side * B.side + 1; j < side * B.side + B.side; j++) { const sp = B.spaces[j]; if (sp.t === 'prop') row += sp.rent[5]; }
    out.push({k: 'train', ar: 'السفر بالقطار', band: BAND.rail, icon: ICONS.train, p: {n: Math.round(RAIL_SIDE * 100)},
      ex: t('gd.train.ex', {s: spN(rv, G), a: fmt(RAIL_RENT[0]), b: fmt(RAIL_RENT[0] + Math.round(row * RAIL_SIDE / 10) * 10)})});
  }
  if (s.chrika) out.push({k: 'chrika', ar: 'الشركة والغدر', band: '#8b2635', icon: ICONS.chrika, p: {n: Math.round(CHRIKA_PAYOUT * 100)}, ex: t('gd.chrika.ex')});
  if (s.timer) out.push({k: 'pause', ar: 'توقيف المؤقت', band: '#3f4a5c', icon: ICONS.pause, ex: t('gd.pause.ex')});
  return out;
}

/** a rule drawn as a small card: lattice frame, coloured band with the Arabic and Latin names, the icon */
export function RuleCard({r, small, onClick}: {r: Rule; small?: boolean; onClick?: () => void}) {
  const body = (
    <div className="rc-in">
      <div className="rc-band" style={{background: r.band}}><div className="rc-ar">{r.ar}</div>{app.LANG !== 'ar' && <div className="rc-lt">{t('gd.' + r.k)}</div>}</div>
      <div className="rc-ico">{r.icon}</div>
      {!small && <div className="rc-foot">✿ {t('gd.houseRule')} ✿</div>}
    </div>
  );
  return onClick
    ? <button className={'rulecard' + (small ? ' sm' : '')} onClick={onClick}>{body}</button>
    : <div className={'rulecard' + (small ? ' sm' : '')}>{body}</div>;
}

/** the guide's pages: an overview of the rules in play, then one page per rule */
export function Guide({G, onDone, start}: {G: Game; onDone: () => void; start?: string}) {
  const rules = guideRules(G);
  const [pg, setPg] = useState(() => rules.findIndex(x => x.k === start) + 1);
  const last = rules.length;
  const r = pg > 0 ? rules[pg - 1] : null;
  return (
    <div className="guide">
      <div className="g-page">
        {!r
          ? <div className="g-over">
              <p className="g-lead">{t('gd.intro', {n: rules.length})}</p>
              <div className="g-grid">{rules.map((x, k) => <RuleCard key={x.k} r={x} small onClick={() => setPg(k + 1)} />)}</div>
            </div>
          : <div className="g-rule">
              <RuleCard r={r} />
              <div className="g-text">
                <h3>{t('gd.' + r.k)}</h3>
                <p>{t('gd.' + r.k + '.d', r.p)}</p>
                <div className="g-ex"><span className="g-lab">{t('gd.example')}</span>{r.ex}</div>
                <p className="g-where"><span className="g-lab">{t('gd.where')}</span>{t('gd.' + r.k + '.w')}</p>
              </div>
            </div>}
      </div>
      <div className="g-nav">
        <div className="g-dots" aria-hidden="true">{Array.from({length: last + 1}, (_, k) => <i key={k} className={k === pg ? 'on' : ''} />)}</div>
        {pg > 0 && <button className="btn ghost" onClick={() => setPg(pg - 1)}>{t('gd.back')}</button>}
        {pg < last
          ? <button className="btn red" onClick={() => setPg(pg + 1)}>{pg === 0 ? t('gd.start') : t('gd.next')}</button>
          : <button className="btn green" onClick={onDone}>{t('gd.done')}</button>}
      </div>
    </div>
  );
}

/** the Rules tab's list of the house rules in play, with a button to open the guide */
export function HouseRulesList({G, open}: {G: Game; open: () => void}) {
  const rules = guideRules(G);
  if (!rules.length) return null;
  return (
    <div className="g-list">
      <div className="g-list-hd"><h3>{t('gd.title')}</h3><button className="btn sm gold" onClick={() => open()}>{t('gd.open')}</button></div>
      {rules.map(r => (
        <div key={r.k} className="g-item">
          <div className="g-item-ico" style={{background: r.band}}>{r.icon}</div>
          <div><b>{t('gd.' + r.k)}{app.LANG !== 'ar' && <span className="g-item-ar">{r.ar}</span>}</b><span>{t('gd.' + r.k + '.d', r.p)}</span></div>
        </div>
      ))}
    </div>
  );
}

const SEEN = 'moropoly.guideSeen';
/** whether this device already showed the guide for game gid; marks it shown */
export function firstLookAt(gid: string) {
  try {
    const seen: string[] = JSON.parse(localStorage.getItem(SEEN) || '[]');
    if (seen.includes(gid)) return false;
    localStorage.setItem(SEEN, JSON.stringify([...seen.slice(-19), gid]));
  } catch { /* storage blocked: show it */ }
  return true;
}
