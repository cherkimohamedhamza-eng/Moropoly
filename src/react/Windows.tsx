// Windows over the game: deed cards, the auction, trades, bankruptcy, your seat, the results, and how to
// install the app. One window shows at a time. The auction and trade windows can be shrunk to a pill to see
// the board; a shrunk window waits while another opens (a deed card, say) and comes back after it.
import {useEffect, useState, type ReactNode} from 'react';
import {commit, dispatch, lobbyJoin, playJoin, sendIntent} from '../app/authority';
import {app, saveName} from '../app/state';
import {BAND, GROUPS, RAIL_RENT, SP} from '../engine/data';
import {netWorth, tradeable} from '../engine/engine';
import type {Action, Game} from '../engine/types';
import {alive, colorOf, isOwnable, ownedBy, priceOf} from '../engine/util';
import {cityN, fmt, noteN, num, spN, t, tokN} from '../i18n/core';
import type {Lobby} from '../online/table';
import {toast} from '../ui/dom';
import {goHome} from '../ui/home';
import {sfx} from '../ui/music';
import {iControl} from '../ui/render';
import {Coin, Rich, TokenGrid} from './common';
import {refresh, useRefresh} from './store';

export type Win =
  | {kind: 'deed'; i: number}
  | {kind: 'auction' | 'bk' | 'trade' | 'treply' | 'seat' | 'over' | 'inst'};
type Kind = Win['kind'];
interface Slot { win: Win; min: boolean; key: number }

/** windows that can shrink to a pill */
const MINABLE: Kind[] = ['trade', 'treply', 'auction'];
/** windows that only close by answering them */
const STAYS: Kind[] = ['auction', 'treply'];

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
  if (V.over && app.shownOver !== V.gid) { app.shownOver = V.gid; setTimeout(openGameOver, 600); }
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
export function openSeat() {
  if (!app.V || !app.V.players) return;
  if (!app.V.players.some(p => p.cid === app.myCid)) return;
  openWindow({kind: 'seat'});
}
export function openGameOver() { if (game()) openWindow({kind: 'over'}); }
export function openInstallHelp() { openWindow({kind: 'inst'}); }

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
    case 'seat': return <SeatWindow />;
    case 'over': return <GameOverWindow />;
    case 'inst': return <InstallWindow />;
  }
}

/** the window itself: a header with the title, shrink and close buttons, the body and the buttons below */
function Frame({kind, title, children, footer, mine}: {kind: Kind; title: ReactNode; children: ReactNode; footer?: ReactNode; mine?: boolean}) {
  const minable = MINABLE.includes(kind), closable = !STAYS.includes(kind);
  return (
    <>
      <div className="veil" onClick={e => { if (e.target === e.currentTarget && closable) closeModal(); }}>
        <div className="modal" role="dialog" aria-modal="true">
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
  const s = SP[i], nm = spN(i), ar = app.LANG === 'ar';
  const props = V && V.status === 'play' ? V.props : null;
  let head: ReactNode = null, rows: ReactNode = null, note = '';
  const row = (k: string | number, a: ReactNode, b: ReactNode, cls?: string) => <tr key={k} className={cls}><td>{a}</td><td>{b}</td></tr>;
  if (s.t === 'prop') {
    const pr = props ? props[i] : null, gr = GROUPS[s.g];
    const level = pr ? pr.houses : -1, labels = t('dm.labels') as unknown as string[];
    head = <div className="head" style={{background: gr.color, color: ['lblue', 'yellow', 'pink'].includes(s.g) ? '#15181d' : '#fff'}}><div className="ar">{gr.ar} – {s.ar}</div>{!ar && <div className="lt">{cityN(s.g)} · {nm}</div>}</div>;
    rows = [
      row('p', t('dm.price'), fmt(s.price)),
      ...s.rent.map((r, k) => row(k, labels[k], fmt(r), k === level ? 'hit' : '')),
      row('c', t('dm.allCity', {c: cityN(s.g)}), fmt(s.rent[0] * 2)),
      row('e', t('dm.each'), fmt(gr.house)),
      row('r', t('dm.rahn'), fmt(s.price / 2)),
    ];
    note = noteN(i);
  } else if (s.t === 'rail') {
    head = <div className="head" style={{background: BAND.rail}}><div className="ar">{s.ar}</div>{!ar && <div className="lt">🚄 {nm}</div>}</div>;
    rows = [row('p', t('dm.price'), fmt(s.price)), ...RAIL_RENT.map((r, k) => row(k, t('dm.stations', {n: k + 1}), fmt(r)))];
    note = t('dm.railNote');
  } else if (s.t === 'util') {
    head = <div className="head" style={{background: s.band || BAND.util}}><div className="ar">{s.ar}</div>{!ar && <div className="lt">{s.glyph} {nm}</div>}</div>;
    rows = [row('p', t('dm.price'), fmt(s.price)), row('1', t('dm.util1'), t('dm.x40')), row('2', t('dm.util2'), t('dm.x100'))];
    note = noteN(i);
  } else {
    note = s.t === 'tax' ? t('info.tax', {a: fmt(s.amount || 0), d: V && V.settings && V.settings.daret ? t('info.taxDaret') : ''}) : t('info.' + s.t);
    head = <div className="head" style={{background: BAND[s.t] || (s.t === 'go' || s.t === 'gojail' ? 'var(--red)' : 'var(--green)')}}><div className="ar">{s.ar}</div>{!ar && <div className="lt">{nm}</div>}</div>;
  }
  const pr = props && isOwnable(i) ? props[i] : null;
  const owner = pr ? (pr.owner >= 0 ? t('dm.owned', {p: V!.players[pr.owner].name, m: pr.mort ? t('dm.mortSuffix') : ''}) : t('dm.forSale')) : '';
  return (
    <Frame kind="deed" title={nm}>
      <div className="deed">
        {s.art && <div className="artbig"><img src={s.art} alt={nm} /></div>}
        <div style={{minWidth: 0, gridColumn: s.art ? undefined : '1/-1'}}>
          {head}
          {rows && <table><tbody>{rows}</tbody></table>}
          {note && <p className="muted" style={{fontSize: 13}}>{note}</p>}
          {owner && <p style={{fontSize: 13}}>{owner}</p>}
        </div>
      </div>
    </Frame>
  );
}

/* ---------- auction ---------- */
let lastHigh = -1;
function AuctionWindow() {
  const V = game(), a = V?.auction;
  useEffect(() => { if (a && a.high !== lastHigh) { if (a.high > 0) sfx('gavel'); lastHigh = a.high; } });
  if (!V || !a) return null;
  const s = SP[a.idx], p = V.players[a.bidders[a.turn]], me = iControl(p.id) && !app.playing;
  const footer = (
    <>
      {[100, 500, 1000].map(inc => (
        <button key={inc} className={`btn ${inc === 100 ? 'red' : ''}`} disabled={!me || a.high + inc > p.cash} onClick={() => dispatch({t: 'bid', inc}, p.id)}>+{num(inc)}</button>
      ))}
      <button className="btn ghost" disabled={!me} onClick={() => dispatch({t: 'pass'}, p.id)}>{t('btn.leaveAuc')}</button>
    </>
  );
  return (
    <Frame kind="auction" title={t('au.title', {s: spN(a.idx)})} footer={footer} mine={me}>
      <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
        {s.art && <img src={s.art} alt="" style={{width: 72, height: 108, objectFit: 'cover', borderRadius: 8}} />}
        <div>
          <div className="muted">{t('au.help')}</div>
          <div className="bidbig">{fmt(a.high)}</div>
          <div className="muted" style={{fontSize: 12.5}}>{a.highBidder >= 0 ? t('au.held', {p: V.players[a.highBidder].name}) : t('au.none')} · {t('au.list', {a: fmt(priceOf(a.idx))})}</div>
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
  const me = V.players[V.cur];
  const others = alive(V).filter(o => o.id !== me.id);
  const [partner, setPartner] = useState(others[0]?.id ?? -1);
  const [give, setGive] = useState<number[]>([]);
  const [get, setGet] = useState<number[]>([]);
  const [cashGive, setCashGive] = useState('0');
  const [cashGet, setCashGet] = useState('0');
  const [msg, setMsg] = useState('');
  const them = V.players[partner];
  if (!them) return null;
  /** picking someone else starts the offer again */
  const pickPartner = (id: number) => { setPartner(id); setGive([]); setGet([]); setCashGive('0'); setCashGet('0'); setMsg(''); };
  const list = (pid: number, chosen: number[], setChosen: (f: (x: number[]) => number[]) => void) => {
    const tt = tradeable(V, pid);
    if (!tt.length) return <div className="muted" style={{fontSize: 12.5}}>{t('tr.nothing')}</div>;
    return tt.map(i => (
      <label key={i}>
        <input type="checkbox" checked={chosen.includes(i)} onChange={e => { const on = e.target.checked; setChosen(x => (on ? [...x, i] : x.filter(y => y !== i))); }} />
        <span className="chip" style={{background: colorOf(i)}} />{spN(i)}{V.props[i].mort && <> <span className="muted">(rahn)</span></>}
      </label>
    ));
  };
  const send = () => {
    const o: Action = {
      t: 'trade', to: partner,
      give: tradeable(V, me.id).filter(i => give.includes(i)), get: tradeable(V, partner).filter(i => get.includes(i)),
      cashGive: Math.max(0, Math.round(+cashGive || 0)), cashGet: Math.max(0, Math.round(+cashGet || 0)),
    };
    if (!o.give!.length && !o.get!.length && !o.cashGive && !o.cashGet) { setMsg(t('tr.pick')); return; }
    if ((o.cashGive as number) > Math.max(0, me.cash) || (o.cashGet as number) > Math.max(0, them.cash)) { setMsg(t('tr.noCash')); return; }
    closeModal();
    dispatch(o, me.id);
    toast(them.human ? t('tr.sent', {p: them.name}) : t('tr.thinking', {p: them.name}));
  };
  return (
    <Frame kind="trade" title={t('tr.title')} footer={<>
      <button className="btn" onClick={closeModal}>{t('btn.cancel')}</button>
      <button className="btn red" onClick={send}>{t('btn.send')}</button>
    </>}>
      <label className="muted" style={{display: 'flex', gap: 8, alignItems: 'center'}}>
        {t('tr.with')}{' '}
        <select className="field" style={{padding: 6}} value={partner} onChange={e => pickPartner(+e.target.value)}>
          {others.map(o => <option key={o.id} value={o.id}>{o.name}{o.human ? '' : ' (' + t('lbl.computer') + ')'}</option>)}
        </select>
      </label>
      <div className="trade-cols">
        <div>
          <h4>{t('tr.gives', {p: me.name})}</h4>{list(me.id, give, setGive)}
          <label className="muted" htmlFor="trCG" style={{marginTop: 6}}>{t('tr.cash')}</label>
          <input className="field" type="number" id="trCG" min={0} step={100} value={cashGive} onChange={e => setCashGive(e.target.value)} />
        </div>
        <div>
          <h4>{t('tr.gives', {p: them.name})}</h4>{list(partner, get, setGet)}
          <label className="muted" htmlFor="trCT" style={{marginTop: 6}}>{t('tr.cash')}</label>
          <input className="field" type="number" id="trCT" min={0} step={100} value={cashGet} onChange={e => setCashGet(e.target.value)} />
        </div>
      </div>
      <div className="muted">{msg}</div>
    </Frame>
  );
}

/* ---------- answering a trade offer ---------- */
function TradeReplyWindow() {
  const V = game(), tr = V?.trade;
  if (!V || !tr) return null;
  const a = V.players[tr.from], b = V.players[tr.to];
  const list = (arr: number[]) => arr.length
    ? arr.map((i, k) => <span key={i}>{k ? (app.LANG === 'ar' ? '، ' : ', ') : ''}<span className="chip" style={{background: colorOf(i), display: 'inline-block', verticalAlign: 'middle'}} /> {spN(i)}</span>)
    : t('tr.nothingW');
  const answer = (accept: boolean) => { closeModal(); dispatch({t: 'tradeReply', accept}, tr.to); };
  return (
    <Frame kind="treply" title={t('trr.title', {p: b.name})} footer={<>
      <button className="btn" onClick={() => answer(false)}>{t('btn.refuse')}</button>
      <button className="btn green" onClick={() => answer(true)}>{t('btn.accept')}</button>
    </>}>
      {app.MODE === 'local' && <p><Rich k="trr.pass" p={{p: b.name}} /></p>}
      <div className="preview" style={{flexDirection: 'column', alignItems: 'flex-start', gap: 6}}>
        <div><b>{t('trr.receive')}</b> {list(tr.give)}{tr.cashGive ? ` + ${fmt(tr.cashGive)}` : ''}</div>
        <div><b>{t('trr.give')}</b> {list(tr.get)}{tr.cashGet ? ` + ${fmt(tr.cashGet)}` : ''}</div>
      </div>
      <p className="muted">{t('trr.from', {p: a.name})}</p>
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
function InstallWindow() {
  return (
    <Frame kind="inst" title={t('pwa.title')}>
      <p><Rich k="pwa.ios" p={{}} /></p>
      <p><Rich k="pwa.android" p={{}} /></p>
      <p className="muted">{t('pwa.note')}</p>
    </Frame>
  );
}
