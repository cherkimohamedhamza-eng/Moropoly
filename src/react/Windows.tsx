// Windows over the game: deed cards, the auction, trades, bankruptcy, your seat, the results, and how to
// install the app. One window shows at a time. The auction and trade windows can be shrunk to a pill to see
// the board; a shrunk window waits while another opens (a deed card, say) and comes back after it.
import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {commit, dispatch, drafting, lobbyJoin, playJoin, sendIntent} from '../app/authority';
import {app, saveName} from '../app/state';
import {BAND, BILL_DAR, BILL_RIAD, GROUPS, RAIL_RENT, RAIL_SIDE, boardOf} from '../engine/data';
import {canGhedr, canShufa, chrikaCandidates, netWorth, shufaPrice, sideBonus, tradeable} from '../engine/engine';
import type {Action, Game, GroupId} from '../engine/types';
import {alive, chrikaOf, chrikaValue, colorOf, groupIdx, isOwnable, ownedBy, priceOf, unownedCount} from '../engine/util';
import {cityN, fmt, noteN, num, spN, t, tokN} from '../i18n/core';
import type {Lobby} from '../online/table';
import {toast} from '../ui/dom';
import {goHome} from '../ui/home';
import {sfx} from '../ui/music';
import {iControl, mySeats} from '../ui/render';
import {Coin, Rich, TokenGrid} from './common';
import {firstLookAt, Guide, guideRules} from './Guide';
import {refresh, useRefresh} from './store';
import {checkTips, TipCard} from './Tips';

export type Win =
  | {kind: 'deed'; i: number}
  | {kind: 'guide'; rule?: string}
  | {kind: 'ghedr'; g: GroupId}
  | {kind: 'auction' | 'bk' | 'trade' | 'treply' | 'chrika' | 'creply' | 'seat' | 'over' | 'inst'};
type Kind = Win['kind'];
interface Slot { win: Win; min: boolean; key: number }

/** windows that can shrink to a pill */
const MINABLE: Kind[] = ['trade', 'treply', 'chrika', 'creply', 'auction'];
/** windows that only close by answering them */
const STAYS: Kind[] = ['auction', 'treply', 'creply'];

let current: Slot | null = null;
/** a shrunk window parked while another one is open */
let parked: Slot | null = null;
let opened = 0;

function changed() {
  app.modal = current ? {kind: current.win.kind, min: current.min} : null;
  refresh();
}
function openWindow(win: Win) {
  if (current && current.min && win.kind !== current.win.kind && !parked) parked = current;
  else if (parked && parked.win.kind === win.kind) parked = null;
  current = {win, min: false, key: ++opened};
  changed();
}
export function closeModal() {
  current = null;
  if (parked) { current = {...parked, min: true}; parked = null; changed(); autoModals(); return; }
  changed();
}
const shrink = () => { if (current) { current.min = true; changed(); } };
const unshrink = () => { if (current) { current.min = false; changed(); } };
const isOpen = (k: Kind) => current?.win.kind === k || parked?.win.kind === k;
function drop(k: Kind) {
  if (parked?.win.kind === k) { parked = null; changed(); }
  else if (current?.win.kind === k) closeModal();
}
const game = () => (app.V && app.V.status === 'play' ? (app.V as Game) : null);

/** after every change: open or close the auction and trade-reply windows, and show the results once */
export function autoModals() {
  const V = game(); if (!V) return;
  if (V.auction) { if (!isOpen('auction')) openAuction(); }
  else if (isOpen('auction')) drop('auction');
  if (V.trade && iControl(V.trade.to)) { if (!isOpen('treply')) openTradeReply(); }
  else if (isOpen('treply')) drop('treply');
  if (V.chrikaOffer && iControl(V.chrikaOffer.to)) { if (!isOpen('creply')) openChrikaReply(); }
  else if (isOpen('creply')) drop('creply');
  if (V.over && app.shownOver !== V.gid) { app.shownOver = V.gid; setTimeout(openGameOver, 600); }
  // the house rules guide, once per game on this device, when nothing else is open
  if (!V.over && !current && guideRules(V).length && firstLookAt(V.gid)) openGuide();
  // and the first time a house rule comes into play, a one-time tip about it
  checkTips(V, current ? current.win.kind : null);
}

export function openDeed(i: number) { if (app.V) openWindow({kind: 'deed', i}); }
export function openAuction() { openWindow({kind: 'auction'}); }
export function openConfirmBankrupt() { openWindow({kind: 'bk'}); }
export function openTrade() {
  const V = game(); if (!V) return;
  const me = V.players[V.cur]; if (!iControl(me.id)) return;
  if (!alive(V).some(o => o.id !== me.id)) return;
  openWindow({kind: 'trade'});
}
export function openTradeReply() { if (game()?.trade) openWindow({kind: 'treply'}); }
export function openChrika() {
  const V = game(); if (!V || !V.settings.chrika) return;
  openWindow({kind: 'chrika'});
}
export function openChrikaReply() { if (game()?.chrikaOffer) openWindow({kind: 'creply'}); }
export function openGhedr(g: GroupId) { if (game()) openWindow({kind: 'ghedr', g}); }
export function openSeat() {
  if (!app.V || !app.V.players) return;
  if (!app.V.players.some(p => p.cid === app.myCid)) return;
  openWindow({kind: 'seat'});
}
export function openGameOver() { if (game()) openWindow({kind: 'over'}); }
export function openInstallHelp() { openWindow({kind: 'inst'}); }
/** the house rules guide, at the page about `rule` if given */
export function openGuide(rule?: string) { if (game()) openWindow({kind: 'guide', rule}); }

/* ---------- the host ---------- */
export function Windows() {
  useRefresh();
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && current && !STAYS.includes(current.win.kind)) closeModal(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  const c = current;
  return (
    <div id="modalRoot" className={c?.min ? 'min' : undefined}>
      {c && <WindowFor key={c.key} win={c.win} />}
      <TipCard G={game()} more={openGuide} />
    </div>
  );
}

function WindowFor({win}: {win: Win}) {
  switch (win.kind) {
    case 'deed': return <DeedWindow i={win.i} />;
    case 'auction': return <AuctionWindow />;
    case 'bk': return <BankruptWindow />;
    case 'trade': return <TradeWindow />;
    case 'treply': return <TradeReplyWindow />;
    case 'chrika': return <ChrikaWindow />;
    case 'creply': return <ChrikaReplyWindow />;
    case 'ghedr': return <GhedrWindow g={win.g} />;
    case 'seat': return <SeatWindow />;
    case 'over': return <GameOverWindow />;
    case 'inst': return <InstallWindow />;
    case 'guide': return <GuideWindow rule={win.rule} />;
  }
}

/** the window itself: a header with the title, shrink and close buttons, the body and the buttons below */
function Frame({kind, title, children, footer, mine, cls}: {kind: Kind; title: ReactNode; children: ReactNode; footer?: ReactNode; mine?: boolean; cls?: string}) {
  const minable = MINABLE.includes(kind), closable = !STAYS.includes(kind);
  return (
    <>
      <div className="veil" onClick={e => { if (e.target === e.currentTarget && closable) closeModal(); }}>
        <div className={`modal${cls ? ' ' + cls : ''}`} role="dialog" aria-modal="true">
          <div className="hd">
            <h2>{title}</h2>
            {minable && <button className="btn ghost sm" style={{marginInlineStart: 'auto'}} onClick={shrink}>▾ {t('btn.seeBoard')}</button>}
            {closable && <button className="x" aria-label={t('aria.close')} style={minable ? {marginInlineStart: 0} : undefined} onClick={closeModal}>×</button>}
          </div>
          <div className="bd">{children}</div>
          {footer && <div className="ft">{footer}</div>}
        </div>
      </div>
      {minable && <button className={`modal-pill${mine ? ' mine' : ''}`} id="modalPill" onClick={unshrink}>{t('pill.' + kind)}</button>}
    </>
  );
}

/* ---------- deed card ---------- */
function DeedWindow({i}: {i: number}) {
  const V = app.V as Game | null;
  const B = boardOf(V), s = B.spaces[i], nm = spN(i, V), ar = app.LANG === 'ar';
  const props = V && V.status === 'play' ? V.props : null;
  let head: ReactNode = null, rows: ReactNode = null, note = '';
  const row = (k: string | number, a: ReactNode, b: ReactNode, cls?: string) => <tr key={k} className={cls}><td>{a}</td><td>{b}</td></tr>;
  if (s.t === 'prop') {
    const pr = props ? props[i] : null, gr = GROUPS[s.g];
    const level = pr ? pr.houses : -1, labels = t('dm.labels') as unknown as string[];
    const gLen = groupIdx(s.g, V).length;
    head = <div className="head" style={{background: gr.color, color: ['lblue', 'yellow', 'pink'].includes(s.g) ? '#15181d' : '#fff'}}><div className="ar">{gr.ar} – {s.ar}</div>{!ar && <div className="lt">{cityN(s.g)} · {nm}</div>}</div>;
    rows = [
      row('p', t('dm.price'), fmt(s.price)),
      ...s.rent.map((r, k) => row(k, labels[k], fmt(r), k === level ? 'hit' : '')),
      row('c', t(gLen >= 4 ? 'dm.threeCity' : 'dm.allCity', {c: cityN(s.g)}), fmt(s.rent[0] * 2)),
      row('e', t('dm.each'), fmt(gr.house)),
      row('r', t('dm.rahn'), fmt(s.price / 2)),
    ];
    note = noteN(i, V);
  } else if (s.t === 'rail') {
    head = <div className="head" style={{background: BAND.rail}}><div className="ar">{s.ar}</div>{!ar && <div className="lt">🚄 {nm}</div>}</div>;
    const train = !!V?.settings?.train;
    rows = [row('p', t('dm.price'), fmt(s.price)), ...RAIL_RENT.map((r, k) => row(k, t('dm.stations', {n: k + 1}), fmt(r))),
      ...(train ? [row('s', t('dm.side'), t('dm.sideV', {n: Math.round(RAIL_SIDE * 100)})), row('n', t('dm.sideNow'), '+' + fmt(V && props ? sideBonus(V, i) : 0)), row('t', t('dm.train'), t('dm.trainV'))] : [])];
    note = t('dm.railNote');
  } else if (s.t === 'util') {
    head = <div className="head" style={{background: BAND.util}}><div className="ar">{s.ar}</div>{!ar && <div className="lt">{s.glyph} {nm}</div>}</div>;
    rows = [row('p', t('dm.price'), fmt(s.price)), row('1', t('dm.util1'), t('dm.x40')), row('2', t('dm.util2'), t('dm.x100')),
      ...(B.utils.length >= 3 ? [row('3', t('dm.util3'), t('dm.x200'))] : []),
      ...(V?.settings?.bills ? [row('b', t('dm.bill'), t('dm.billV', {a: fmt(BILL_DAR), b: fmt(BILL_RIAD)}))] : [])];
    note = noteN(i, V);
  } else {
    note = s.t === 'tax' ? t('info.tax', {a: fmt(s.amount || 0), d: V && V.settings && V.settings.daret ? t('info.taxDaret') : ''}) : t('info.' + s.t);
    head = <div className="head" style={{background: (s.t === 'tax' ? BAND.mektoub : BAND[s.t]) || (s.t === 'go' || s.t === 'gojail' ? 'var(--red)' : 'var(--green)')}}><div className="ar">{s.ar}</div>{!ar && <div className="lt">{nm}</div>}</div>;
  }
  const pr = props && isOwnable(i, V) ? props[i] : null;
  const owner = pr ? (pr.owner >= 0 ? t('dm.owned', {p: V!.players[pr.owner].name, m: pr.mort ? t('dm.mortSuffix') : ''}) : t('dm.forSale')) : '';
  const ch = V && V.status === 'play' && s.t === 'prop' ? chrikaOf(V, s.g) : undefined;
  return (
    <Frame kind="deed" title={nm}>
      <div className="deed">
        {s.art && <div className="artbig"><img src={s.art} alt={nm} /></div>}
        <div style={{minWidth: 0, gridColumn: s.art ? undefined : '1/-1'}}>
          {head}
          {rows && <table><tbody>{rows}</tbody></table>}
          {note && <p className="muted" style={{fontSize: 13}}>{note}</p>}
          {owner && <p style={{fontSize: 13}}>{owner}</p>}
          {ch && <p className="chrika-deed">{t('ch.deedNote', {a: V!.players[ch.a].name, b: V!.players[ch.b].name, n: ch.shareA, m: 100 - ch.shareA})}</p>}
          <ShufaButton i={i} />
        </div>
      </div>
    </Frame>
  );
}

/** house rule "shufa": on the player's turn, buy this property from its owner at 150% */
function ShufaButton({i}: {i: number}) {
  const V = app.V as Game | null;
  if (!V || !V.settings.shufa || V.status !== 'play' || V.over) return null;
  const pid = V.cur;
  if (!iControl(pid) || !canShufa(V, pid, i) || V.auction || V.trade || V.chrikaOffer || V.pending || app.playing || !(V.phase === 'roll' || V.phase === 'end')) return null;
  const price = shufaPrice(i, V), short = V.players[pid].cash < price;
  return (
    <div className="shufa-box">
      <p>{t('sh.explain', {o: V.players[V.props[i].owner].name})}</p>
      <button className="btn red" disabled={short} onClick={() => { dispatch({t: 'shufa', i}, pid); closeModal(); }}>{t('sh.buy', {a: fmt(price)})}</button>
      {short && <p className="muted" style={{fontSize: 12.5}}>{t('sh.short')}</p>}
    </div>
  );
}

/* ---------- auction ---------- */
let lastHigh = -1;
function AuctionWindow() {
  const V = game(), a = V?.auction;
  useEffect(() => { if (a && a.high !== lastHigh) { if (a.high > 0) sfx('gavel'); lastHigh = a.high; } });
  if (!V || !a) return null;
  const s = boardOf(V).spaces[a.idx], p = V.players[a.bidders[a.turn]], me = iControl(p.id) && !app.playing;
  const footer = (
    <>
      {[100, 500, 1000].map(inc => (
        <button key={inc} className={`btn ${inc === 100 ? 'red' : ''}`} disabled={!me || a.high + inc > p.cash} onClick={() => dispatch({t: 'bid', inc}, p.id)}>+{num(inc)}</button>
      ))}
      <button className="btn ghost" disabled={!me} onClick={() => dispatch({t: 'pass'}, p.id)}>{t('btn.leaveAuc')}</button>
    </>
  );
  return (
    <Frame kind="auction" title={t('au.title', {s: spN(a.idx, V)})} footer={footer} mine={me}>
      <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
        {s.art && <img src={s.art} alt="" style={{width: 72, height: 108, objectFit: 'cover', borderRadius: 8}} />}
        <div>
          <div className="muted">{t('au.help')}</div>
          <div className="bidbig">{fmt(a.high)}</div>
          <div className="muted" style={{fontSize: 12.5}}>{a.highBidder >= 0 ? t('au.held', {p: V.players[a.highBidder].name}) : t('au.none')} · {t('au.list', {a: fmt(priceOf(a.idx, V))})}</div>
        </div>
      </div>
      <div className="bidders">{a.bidders.map((id, k) => <span key={id} className={k === a.turn ? 'now' : ''}>{V.players[id].name}</span>)}</div>
      <div><b>{p.name}</b>{me ? t('au.yourBid', {a: fmt(p.cash)}) : t('au.deciding')}</div>
    </Frame>
  );
}

/* ---------- bankruptcy ---------- */
function BankruptWindow() {
  const V = game(); if (!V) return null;
  const p = V.players[V.cur];
  const to = typeof p.owes === 'number' && p.owes >= 0 ? V.players[p.owes].name : t('w.bank');
  return (
    <Frame kind="bk" title={t('bk.title')} footer={<>
      <button className="btn" onClick={closeModal}>{t('btn.keep')}</button>
      <button className="btn danger" onClick={() => { closeModal(); dispatch({t: 'bankrupt'}); }}>{t('btn.bankrupt')}</button>
    </>}>
      <p>{t('bk.body', {p: p.name, a: fmt(-p.cash), o: to})}</p>
    </Frame>
  );
}

/* ---------- making a trade offer ---------- */
function TradeWindow() {
  const V = game()!;
  const B = boardOf(V);
  const me = V.players[V.cur];
  const others = alive(V).filter(o => o.id !== me.id);
  const [partner, setPartner] = useState(others[0]?.id ?? -1);
  const [give, setGive] = useState<number[]>([]);
  const [get, setGet] = useState<number[]>([]);
  const [cashGive, setCashGive] = useState(0);
  const [cashGet, setCashGet] = useState(0);
  const [msg, setMsg] = useState('');
  const sent = useRef(false);
  // the turn timer stops while the offer is being written
  useEffect(() => { drafting(me.id, true); return () => { if (!sent.current) drafting(me.id, false); }; }, []);
  const them = V.players[partner];
  if (!them) return null;

  /** picking someone else starts the offer again */
  const pickPartner = (id: number) => { setPartner(id); setGive([]); setGet([]); setCashGive(0); setCashGet(0); setMsg(''); };
  const toggleIdx = (i: number, setChosen: (f: (x: number[]) => number[]) => void) =>
    setChosen(x => (x.includes(i) ? x.filter(y => y !== i) : [...x, i]));

  const myMax = Math.max(0, me.cash);
  const theirMax = Math.max(0, them.cash);
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v || 0)));

  const giveVal = give.reduce((s, i) => s + priceOf(i, V), 0) + cashGive;
  const getVal = get.reduce((s, i) => s + priceOf(i, V), 0) + cashGet;
  const hasAnything = give.length > 0 || get.length > 0 || cashGive > 0 || cashGet > 0;

  const renderSide = (
    pl: typeof me,
    chosen: number[],
    setChosen: (f: (x: number[]) => number[]) => void,
    cash: number,
    setCash: (n: number) => void,
    maxCash: number,
    totalVal: number,
    sideCls: string,
  ) => {
    const tt = tradeable(V, pl.id);
    return (
      <div className={`tr-side ${sideCls}`}>
        <div className="tr-shd">
          <Coin token={pl.token} style={{boxShadow: `0 0 0 2.5px ${pl.color}`}} />
          <div className="tr-sm">
            <b>{t('tr.gives', {p: pl.name})}</b>
            <small>{fmt(pl.cash)} available</small>
          </div>
          <span className={`tr-val${totalVal > 0 ? ' on' : ''}`}>{fmt(totalVal)}</span>
        </div>

        <div className="tr-cards">
          {tt.length ? tt.map(i => {
            const s = B.spaces[i];
            const on = chosen.includes(i);
            const col = colorOf(i, V);
            return (
              <button
                key={i}
                type="button"
                className={`tr-card${on ? ' on' : ''}${V.props[i].mort ? ' mort' : ''}`}
                style={{'--cc': col} as CSSProperties}
                onClick={() => { toggleIdx(i, setChosen); setMsg(''); }}
              >
                <div className="tr-thumb">
                  {s.art ? <img src={s.art} alt="" /> : <span className="tr-dot" style={{background: col}} />}
                </div>
                <div className="tr-cinfo">
                  <span className="tr-cname">{spN(i, V)}</span>
                  <span className="tr-cmeta">
                    <i style={{background: col}} />
                    {fmt(priceOf(i, V))}{V.props[i].mort ? ' · rahn' : ''}
                  </span>
                </div>
                <span className="tr-chk" aria-hidden="true">{on ? '✓' : '+'}</span>
              </button>
            );
          }) : <div className="tr-empty">{t('tr.nothing')}</div>}
        </div>

        <div className="tr-cash">
          <div className="tr-chd">
            <span>{t('tr.cash')}</span>
            <div className="tr-cinput">
              <input
                type="number"
                min={0}
                max={maxCash}
                step={100}
                value={cash}
                onChange={e => { setCash(clamp(+e.target.value, maxCash)); setMsg(''); }}
                aria-label={`${pl.name} ${t('tr.cash')}`}
              />
              <span>DH</span>
            </div>
          </div>
          <input
            className="tr-range"
            type="range"
            min={0}
            max={maxCash}
            step={100}
            value={cash}
            disabled={maxCash <= 0}
            onChange={e => { setCash(clamp(+e.target.value, maxCash)); setMsg(''); }}
          />
          <div className="tr-chips">
            {[100, 500, 1000, 2000].map(step => (
              <button
                key={step}
                type="button"
                disabled={cash + step > maxCash}
                onClick={() => { setCash(clamp(cash + step, maxCash)); setMsg(''); }}
              >
                +{step >= 1000 ? `${step / 1000}k` : step}
              </button>
            ))}
            <button type="button" className="clr" disabled={cash === 0} onClick={() => setCash(0)}>0</button>
          </div>
        </div>
      </div>
    );
  };

  const send = () => {
    const o: Action = {
      t: 'trade', to: partner,
      give: tradeable(V, me.id).filter(i => give.includes(i)),
      get: tradeable(V, partner).filter(i => get.includes(i)),
      cashGive: clamp(cashGive, myMax),
      cashGet: clamp(cashGet, theirMax),
    };
    if (!o.give!.length && !o.get!.length && !o.cashGive && !o.cashGet) { setMsg(t('tr.pick')); return; }
    if ((o.cashGive as number) > myMax || (o.cashGet as number) > theirMax) { setMsg(t('tr.noCash')); return; }
    sent.current = true;
    closeModal();
    dispatch(o, me.id);
    toast(them.human ? t('tr.sent', {p: them.name}) : t('tr.thinking', {p: them.name}));
  };

  return (
    <Frame kind="trade" cls="wide trade-modal" title={<><span>{t('tr.title')}</span> <span className="tr-ar">تبادل</span></>} footer={<>
      {msg && <span className="tr-err">{msg}</span>}
      <button className="btn ghost" onClick={closeModal}>{t('btn.cancel')}</button>
      <button className="btn red" disabled={!hasAnything} onClick={send}>{t('btn.send')}</button>
    </>}>
      <div className="tr-partners" role="radiogroup" aria-label={t('tr.with')}>
        {others.map(o => {
          const cnt = tradeable(V, o.id).length;
          const active = o.id === partner;
          return (
            <button
              key={o.id}
              type="button"
              className={`tr-pbtn${active ? ' on' : ''}`}
              onClick={() => pickPartner(o.id)}
            >
              <Coin token={o.token} style={{boxShadow: `0 0 0 2.5px ${o.color}`}} />
              <div className="tr-pm">
                <b>{o.name}{!o.human && <small> · bot</small>}</b>
                <span>{fmt(o.cash)} · {cnt}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="tr-desk">
        {renderSide(me, give, setGive, cashGive, setCashGive, myMax, giveVal, 'mine')}
        <div className="tr-swap" aria-hidden="true">⇄</div>
        {renderSide(them, get, setGet, cashGet, setCashGet, theirMax, getVal, 'theirs')}
      </div>

      {hasAnything && (
        <div className="tr-summary">
          <div className="tr-sum-s">
            <small>{me.name}</small>
            <b>{give.length} {give.length === 1 ? 'deed' : 'deeds'}{cashGive ? ` + ${fmt(cashGive)}` : ''}</b>
          </div>
          <span className="tr-sum-mid">
            {giveVal === getVal ? 'Even value' : giveVal > getVal ? `+${fmt(giveVal - getVal)} to ${them.name}` : `+${fmt(getVal - giveVal)} to ${me.name}`}
          </span>
          <div className="tr-sum-s end">
            <small>{them.name}</small>
            <b>{get.length} {get.length === 1 ? 'deed' : 'deeds'}{cashGet ? ` + ${fmt(cashGet)}` : ''}</b>
          </div>
        </div>
      )}
    </Frame>
  );
}

/* ---------- answering a trade offer ---------- */
function TradeReplyWindow() {
  const V = game(), tr = V?.trade;
  if (!V || !tr) return null;
  const B = boardOf(V);
  const a = V.players[tr.from], b = V.players[tr.to];
  const renderOfferCol = (title: string, arr: number[], cash: number, tone: 'in' | 'out') => (
    <div className={`trr-col ${tone}`}>
      <div className="trr-hd">{title}</div>
      <div className="trr-list">
        {arr.map(i => {
          const s = B.spaces[i];
          return (
            <div key={i} className="trr-card" style={{'--cc': colorOf(i, V)} as CSSProperties}>
              {s.art && <img src={s.art} alt="" />}
              <div>
                <b>{spN(i, V)}</b>
                <small>{fmt(priceOf(i, V))}{V.props[i].mort ? ' · rahn' : ''}</small>
              </div>
            </div>
          );
        })}
        {cash > 0 && <div className="trr-cash">💰 {fmt(cash)}</div>}
        {!arr.length && !cash && <div className="tr-empty">{t('tr.nothingW')}</div>}
      </div>
    </div>
  );
  const answer = (accept: boolean) => { closeModal(); dispatch({t: 'tradeReply', accept}, tr.to); };
  return (
    <Frame kind="treply" cls="wide trade-modal" title={t('trr.title', {p: b.name})} footer={<>
      <button className="btn ghost" onClick={() => answer(false)}>{t('btn.refuse')}</button>
      <button className="btn green" onClick={() => answer(true)}>{t('btn.accept')}</button>
    </>}>
      {app.MODE === 'local' && <p style={{margin: 0}}><Rich k="trr.pass" p={{p: b.name}} /></p>}
      <div className="trr-from">
        <Coin token={a.token} style={{boxShadow: `0 0 0 2.5px ${a.color}`}} />
        <span>{t('trr.from', {p: a.name})}</span>
      </div>
      <div className="tr-desk">
        {renderOfferCol(t('trr.receive'), tr.give, tr.cashGive, 'in')}
        <div className="tr-swap" aria-hidden="true">⇄</div>
        {renderOfferCol(t('trr.give'), tr.get, tr.cashGet, 'out')}
      </div>
    </Frame>
  );
}

/* ---------- Chrika (city pacts) ---------- */
const SPLITS = [20, 30, 40, 50, 60, 70, 80];
function ChrikaWindow() {
  const V = game();
  const seats = mySeats();
  const pid = V ? (seats.includes(V.cur) ? V.cur : (seats[0] ?? V.cur)) : -1;
  const me = V?.players[pid];
  const canAct = !!V && !!me && pid === V.cur && iControl(pid) && !V.auction && !V.trade && !V.chrikaOffer && !V.pending && !app.playing && !V.over && (V.phase === 'roll' || V.phase === 'end');
  const cands = V && me ? chrikaCandidates(V, me.id) : [];
  const defaultShare = (g?: GroupId) => {
    if (!V || !me || !g) return 50;
    const gi = groupIdx(g, V), mine = gi.filter(i => V.props[i].owner === me.id).length;
    return Math.max(20, Math.min(80, Math.round((mine / gi.length) * 10) * 10));
  };
  const [city, setCity] = useState<GroupId | ''>(cands[0]?.g ?? '');
  const [share, setShare] = useState<number>(() => defaultShare(cands[0]?.g));
  const sent = useRef(false);
  useEffect(() => {
    if (!canAct || !me) return;
    drafting(me.id, true);
    return () => { if (!sent.current) drafting(me.id, false); };
  }, [canAct, me?.id]);
  if (!V || !me) return null;
  const active = (V.chrikas || []).filter(c => c.a === me.id || c.b === me.id);
  const allActive = V.chrikas || [];
  const chosen = cands.find(c => c.g === city) || cands[0] || null;
  const left = unownedCount(V);
  const pickCity = (g: GroupId) => { setCity(g); setShare(defaultShare(g)); };
  const propose = () => {
    if (!chosen || !canAct || me.cash < 0) return;
    sent.current = true;
    closeModal();
    dispatch({t: 'chrikaPropose', g: chosen.g, share}, me.id);
    toast(t('ch.sent', {p: V.players[chosen.other].name}));
  };
  const askExit = (g: GroupId, partner: number) => {
    if (!canAct) return;
    sent.current = true;
    closeModal();
    dispatch({t: 'chrikaExit', g}, me.id);
    toast(t('ch.exitSent', {p: V.players[partner].name}));
  };
  return (
    <Frame kind="chrika" title={t('ch.title')} footer={<button className="btn" onClick={closeModal}>{t('btn.done')}</button>}>
      <div className={`chrika-banner ${V.ghedrOpen ? 'open' : ''}`}>
        {V.ghedrOpen ? '🔥 ' + t('ch.unlocked') : '🔒 ' + t('ch.locked', {n: left})}
      </div>

      {active.length > 0 && (
        <div className="chrika-sec">
          <h4>{t('ch.active')}</h4>
          {active.map(c => {
            const other = c.a === me.id ? c.b : c.a;
            const myShare = c.a === me.id ? c.shareA : 100 - c.shareA;
            const {payout} = chrikaValue(V, c.g);
            const ghedrOk = canAct && canGhedr(V, me.id, c.g);
            return (
              <div key={c.g} className="chrika-card">
                <div className="chrika-card-hd">
                  <span className="chip" style={{background: GROUPS[c.g].color}} />
                  <b>{cityN(c.g)}</b>
                  <span className="muted">{t('ch.partner', {o: V.players[other].name})}</span>
                </div>
                <div className="chrika-card-meta">
                  <span>{t('ch.splitLine', {p: me.name, n: myShare, o: V.players[other].name, m: 100 - myShare})}</span>
                  <span>{t('ch.val', {a: fmt(payout)})}</span>
                </div>
                <div className="chrika-card-acts">
                  <button className="btn sm" disabled={!canAct} onClick={() => askExit(c.g, other)}>{t('btn.chrikaExit')}</button>
                  <button className="btn sm danger" disabled={!ghedrOk} title={V.ghedrOpen ? undefined : t('ch.ghedrLockedTip')} onClick={() => openGhedr(c.g)}>
                    {t('btn.ghedrGo', {a: fmt(payout)})}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {me.gheddar ? (
        <p className="chrika-warn">{t('ch.blocked')}</p>
      ) : chosen ? (
        <div className="chrika-sec">
          <h4>{t('ch.available')}</h4>
          <div className="chrika-cities">
            {cands.map(c => (
              <button key={c.g} className={`chrika-city${chosen.g === c.g ? ' on' : ''}`} onClick={() => pickCity(c.g)}>
                <span className="chip" style={{background: GROUPS[c.g].color}} />
                <b>{cityN(c.g)}</b>
                <span className="muted">· {V.players[c.other].name}</span>
              </button>
            ))}
          </div>
          <div className="chrika-split">
            <div className="muted" style={{fontSize: 12.5}}>{t('ch.split')}: <b>{t('ch.splitLine', {p: me.name, n: share, o: V.players[chosen.other].name, m: 100 - share})}</b></div>
            <div className="chrika-pills">
              {SPLITS.map(v => (
                <button key={v} type="button" className={share === v ? 'on' : ''} onClick={() => setShare(v)}>{v}/{100 - v}</button>
              ))}
            </div>
          </div>
          <button className="btn gold" style={{marginTop: 10}} disabled={!canAct || me.cash < 0} onClick={propose}>{t('btn.chrikaPropose')}</button>
        </div>
      ) : (
        <p className="muted" style={{fontSize: 13}}>{t('ch.none')}</p>
      )}

      {allActive.length > active.length && (
        <div className="chrika-sec">
          <div className="muted" style={{fontSize: 12}}>
            {allActive.filter(c => c.a !== me.id && c.b !== me.id).map(c => (
              <div key={c.g} style={{display: 'flex', alignItems: 'center', gap: 6, marginTop: 4}}>
                <span className="chip" style={{background: GROUPS[c.g].color}} />
                <b>{cityN(c.g)}</b>: {V.players[c.a].name} ({c.shareA}%) &amp; {V.players[c.b].name} ({100 - c.shareA}%)
              </div>
            ))}
          </div>
        </div>
      )}
    </Frame>
  );
}

/* ---------- answering a Chrika or Clean Exit offer ---------- */
function ChrikaReplyWindow() {
  const V = game(), o = V?.chrikaOffer;
  if (!V || !o) return null;
  const from = V.players[o.from], to = V.players[o.to];
  const share = o.shareFrom ?? 50;
  const {payout, half} = chrikaValue(V, o.g);
  const answer = (accept: boolean) => { closeModal(); dispatch({t: 'chrikaReply', accept}, o.to); };
  return (
    <Frame kind="creply" title={t(o.kind === 'form' ? 'chr.formTitle' : 'chr.exitTitle', {p: to.name})} mine footer={<>
      <button className="btn" onClick={() => answer(false)}>{t('btn.refuse')}</button>
      <button className="btn green" onClick={() => answer(true)}>{t('btn.accept')}</button>
    </>}>
      {app.MODE === 'local' && <p><Rich k="trr.pass" p={{p: to.name}} /></p>}
      <div className="preview" style={{flexDirection: 'column', alignItems: 'flex-start', gap: 8}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span className="chip" style={{background: GROUPS[o.g].color, width: 14, height: 14}} />
          <b>{cityN(o.g)}</b>
        </div>
        <div>
          {o.kind === 'form'
            ? <Rich k="chr.formBody" p={{p: from.name, o: to.name, g: cityN(o.g), n: String(share), m: String(100 - share)}} />
            : <Rich k="chr.exitBody" p={{p: from.name, g: cityN(o.g), a: fmt(payout), b: fmt(half)}} />}
        </div>
      </div>
    </Frame>
  );
}

/* ---------- confirming L'Ghedr ---------- */
function GhedrWindow({g}: {g: GroupId}) {
  const V = game(); if (!V) return null;
  const ch = chrikaOf(V, g); if (!ch) return null;
  const pid = V.cur;
  if (ch.a !== pid && ch.b !== pid) return null;
  const victim = V.players[ch.a === pid ? ch.b : ch.a];
  const {payout} = chrikaValue(V, g);
  return (
    <Frame kind="ghedr" title={t('ch.ghedrTitle', {g: cityN(g)})} footer={<>
      <button className="btn" onClick={closeModal}>{t('btn.cancel')}</button>
      <button className="btn danger" disabled={!canGhedr(V, pid, g)} onClick={() => { closeModal(); dispatch({t: 'ghedr', g}, pid); }}>{t('btn.ghedrGo', {a: fmt(payout)})}</button>
    </>}>
      <p>{t('ch.ghedrBody', {g: cityN(g), o: victim.name, a: fmt(payout)})}</p>
    </Frame>
  );
}

/* ---------- your seat (name and token) during an online game ---------- */
function seatAct(a: {t: 'join'; name: string; token: number}) {
  if (app.MODE === 'host') { if (app.G!.status === 'lobby' ? lobbyJoin(app.myCid, a) : playJoin(app.G, app.myCid, a)) commit(); }
  else sendIntent({a});
}
function SeatWindow() {
  const players = (app.V as Game | Lobby | null)?.players || [];
  const me = players.find(p => p.cid === app.myCid);
  const [name, setName] = useState(me?.name ?? '');
  const [token, setToken] = useState(me?.token ?? 0);
  if (!me) return null;
  const takenBy = (k: number) => players.find(p => p !== me && !('bankrupt' in p && p.bankrupt) && p.token === k)?.name ?? null;
  const save = () => { const n = name.trim() || me.name; saveName(n); closeModal(); seatAct({t: 'join', name: n, token}); };
  return (
    <Frame kind="seat" title={t('lb.yourSeat')} footer={<button className="btn red" onClick={save}>{t('btn.save')}</button>}>
      <p className="muted" style={{margin: 0}}>{t('seat.help')}</p>
      <label className="muted" htmlFor="stName" style={{fontSize: 12.5}}>{t('lb.name')}</label>
      <input className="field" id="stName" maxLength={16} value={name} placeholder={t('lb.namePh')} onChange={e => setName(e.target.value)} />
      <TokenGrid selected={token} takenBy={takenBy} disableTaken onPick={setToken} name={k => tokN(k)} />
    </Frame>
  );
}

/* ---------- results ---------- */
function GameOverWindow() {
  const V = game(); if (!V) return null;
  const rank = [...V.players].sort((a, b) => (+a.bankrupt - +b.bankrupt) || netWorth(V, b) - netWorth(V, a));
  return (
    <Frame kind="over" title={t('go.title', {p: rank[0].name})} footer={<>
      <button className="btn" onClick={closeModal}>{t('btn.look')}</button>
      <button className="btn red" onClick={() => { closeModal(); goHome(); }}>{t('btn.backHome')}</button>
    </>}>
      <div className="plist">
        {rank.map((p, k) => (
          <div key={p.id} className={`prow ${k === 0 ? 'active' : ''}`}>
            <Coin token={p.token} />
            <div><div className="nm">{k + 1}. {p.name}</div><div className="sub">{p.bankrupt ? t('st.bankrupt') : t('go.props', {n: ownedBy(V, p.id).length})}</div></div>
            <div className="money"><b>{fmt(p.bankrupt ? 0 : netWorth(V, p))}</b><span className="sub">{t('go.nw')}</span></div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ---------- installing the app (iPhone, or when the browser offers no install button) ---------- */
function GuideWindow({rule}: {rule?: string}) {
  const V = game();
  // reading the guide on your own turn stops your turn timer, like writing a trade offer
  const cur = V ? V.cur : -1, mine = !!V && iControl(cur);
  useEffect(() => { if (!mine) return; drafting(cur, true); return () => drafting(cur, false); }, [cur, mine]);
  if (!V) return null;
  return <Frame kind="guide" title={t('gd.title')}><Guide G={V} onDone={closeModal} start={rule} /></Frame>;
}

function InstallWindow() {
  return (
    <Frame kind="inst" title={t('pwa.title')}>
      <p><Rich k="pwa.ios" p={{}} /></p>
      <p><Rich k="pwa.android" p={{}} /></p>
      <p className="muted">{t('pwa.note')}</p>
    </Frame>
  );
}
