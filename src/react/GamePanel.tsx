// The game screen's side: the turn card (whose turn, what they can do, the turn timer), the tabs
// (players, my deeds, journal, rules) and the banner above the board. The board itself is not React yet.
import {useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {amHost, dispatch, hostAct} from '../app/authority';
import {hostOnline, onlineCids} from '../app/online';
import {app} from '../app/state';
import {JAIL_FINE, RIAD_PREMIUM, SP} from '../engine/data';
import {canBuild, canMort, canRiad, canSell, canUnmort, netWorth, rentFor, riadCost} from '../engine/engine';
import type {Game} from '../engine/types';
import {colorOf, groupIdx, houseCost, ownedBy, ownsGroup, priceOf, unmortCost} from '../engine/util';
import {cityN, fmt, spN, t, tl, tokN} from '../i18n/core';
import {goHome} from '../ui/home';
import {openAuction, openConfirmBankrupt, openDeed, openGameOver, openSeat, openTrade, openTradeReply} from '../ui/modals';
import {sfx} from '../ui/music';
import {iControl, mySeats, setTab} from '../ui/render';
import {TDL, seatedIn} from '../ui/view';
import {Coin, LangSwitch, Rich} from './common';
import {useRefresh} from './store';

const playingGame = (): Game | null => (app.V && app.V.status === 'play' ? (app.V as Game) : null);

const Small = ({children}: {children: ReactNode}) => <span className="muted" style={{fontSize: 11}}>· {children}</span>;

/* ---------- the bar above the board ---------- */
export function GameBar() {
  useRefresh();
  const G = playingGame();
  return (
    <>
      <span className="mini-flag"><svg viewBox="-1 -1 2 2"><path d="M0,-0.95L0.56,0.77L-0.9,-0.29H0.9L-0.56,0.77Z" fill="none" stroke="#006233" strokeWidth=".13" strokeLinejoin="miter" /></svg></span>
      <div className="wm" style={{fontSize: 16}}>MOROPOLY</div>
      <span className="muted" id="roundMeta">{G ? t('meta.round', {n: G.round, of: G.settings.rounds ? t('meta.of', {m: G.settings.rounds}) : '', a: fmt(G.daret)}) : ''}</span>
      <div className="sp" />
      {G?.code && <span className="chipcode" id="codeChip" dir="ltr">{t('chip.game', {c: G.code.toUpperCase()})}</span>}
      <LangSwitch />
      {G && app.MODE !== 'local' && seatedIn(G) && !G.over && <button className="btn ghost sm" id="mySeatBtn" onClick={openSeat}>{t('btn.mySeat')}</button>}
      <button className="btn ghost sm" id="leaveBtn" onClick={goHome}>{t('btn.leave')}</button>
    </>
  );
}

/* ---------- banner ---------- */
export function Banner() {
  useRefresh();
  const V = app.V as Game | null;
  const guest = app.MODE === 'guest' || app.MODE === 'online';
  const watching = guest && !!V && !!V.players && !seatedIn(V) && !V.over;
  if (watching && hostOnline()) {
    return <div className="banner" style={{marginBottom: 12, background: 'rgba(201,207,216,.08)', borderColor: 'var(--line-2)', color: 'var(--text)'}}>{t('watching')}</div>;
  }
  if (guest && !hostOnline()) return <div className="banner" style={{marginBottom: 12}}>{t(app.MODE === 'online' ? 'banner.offline' : 'banner.paused')}</div>;
  return null;
}

/* ---------- turn card ---------- */
export function TurnCard() {
  useRefresh();
  const G = playingGame(); if (!G) return null;
  const p = G.players[G.cur];
  const mine = iControl(G.cur) && !app.playing && !G.over;
  const btn = (key: string, cls: string, label: string, onClick: () => void, disabled = false) =>
    <button key={key} className={`btn ${cls}`} disabled={disabled} onClick={onClick}>{label}</button>;
  let status: ReactNode = null;
  const btns: ReactNode[] = [];

  if (G.over) {
    status = <Rich k="tc.wins" p={{p: G.players[G.winner!].name}} />;
    btns.push(btn('results', 'metal', t('btn.results'), openGameOver));
  } else if (app.playing) {
    status = tl(G.event);
  } else if (G.trade) {
    const tr = G.trade;
    status = <Rich k="tc.offered" p={{p: G.players[tr.from].name, o: G.players[tr.to].name}} />;
    if (iControl(tr.to)) btns.push(btn('reply', 'red', t('btn.seeOffer'), openTradeReply));
    if (iControl(tr.from)) btns.push(btn('tcancel', '', t('btn.withdraw'), () => dispatch({t: 'tradeCancel'}, tr.from)));
  } else if (G.auction) {
    const a = G.auction;
    status = <Rich k="tc.dlala" p={{s: spN(a.idx), a: fmt(a.high), by: a.highBidder >= 0 ? t('tc.by', {p: G.players[a.highBidder].name}) : ''}} />;
    btns.push(btn('auction', 'red', t('btn.openAuc'), openAuction));
  } else if (p.cash < 0) {
    status = <span className="status bad">{t('tc.owes', {p: p.name, a: fmt(-p.cash)})}</span>;
    if (mine) btns.push(btn('deeds', '', t('btn.myDeeds'), () => setTab('deeds')), btn('trade', '', t('btn.tbadel'), openTrade), btn('bankrupt', 'danger', t('btn.bankrupt'), openConfirmBankrupt));
  } else if (G.phase === 'buy') {
    const i = G.pending!.idx, s = SP[i];
    status = <Rich k="tc.forSale" p={{s: spN(i), c: s.t === 'prop' ? ' · ' + cityN(s.g) : ''}} />;
    if (mine) btns.push(
      btn('buy', 'red', t('btn.buy', {a: fmt(priceOf(i))}), () => dispatch({t: 'buy'}), p.cash < priceOf(i)),
      btn('decline', '', G.settings.dlala ? t('btn.dlala') : t('btn.pass'), () => dispatch({t: 'decline'})),
    );
  } else if (G.phase === 'roll') {
    status = p.inJail ? t('tc.inJail', {p: p.name, n: p.jailTurns + 1, a: fmt(JAIL_FINE)}) : G.rollAgain ? t('tc.again') : t('tc.toRoll', {p: p.name});
    if (mine) {
      btns.push(btn('roll', 'red', t('btn.roll'), () => dispatch({t: 'roll'})));
      if (p.inJail) {
        btns.push(btn('fine', '', t('btn.payFine', {a: fmt(JAIL_FINE)}), () => dispatch({t: 'fine'}), p.cash < JAIL_FINE));
        if (p.goojf.length) btns.push(btn('card', '', t('btn.useCard'), () => dispatch({t: 'card'})));
      }
      btns.push(btn('trade', 'ghost', t('btn.tbadel'), openTrade));
    }
  } else if (G.phase === 'end') {
    status = tl(G.event);
    if (mine) btns.push(btn('end', 'green', t('btn.end'), () => dispatch({t: 'end'})), btn('deeds', '', t('btn.build'), () => setTab('deeds')), btn('trade', 'ghost', t('btn.tbadel'), openTrade));
  }

  let preview: ReactNode = null;
  if (G.phase === 'buy' && G.pending && !app.playing) {
    const i = G.pending.idx, s = SP[i];
    preview = (
      <div className="preview">
        {s.art && <img src={s.art} alt="" />}
        <div style={{minWidth: 0}}>
          <div style={{fontWeight: 700}}>{spN(i)} {app.LANG !== 'ar' && <span style={{fontFamily: 'var(--f-ar)', color: 'var(--dim)'}}>{s.ar}</span>}</div>
          <div className="muted" style={{fontSize: 12.5}}>
            {s.t === 'prop' ? t('pv.rentProp', {a: fmt(s.rent[0]), b: fmt(s.rent[0] * 2), c: cityN(s.g)}) : s.t === 'rail' ? t('pv.rentRail') : t('pv.rentUtil')}
          </div>
          <button className="btn ghost sm" style={{marginTop: 6}} onClick={() => openDeed(i)}>{t('btn.viewDeed')}</button>
        </div>
      </div>
    );
  }
  const waiting = !mine && !G.over && !app.playing && !G.auction && !G.trade;

  return (
    <>
      <div className="who">
        <Coin token={p.token} />
        <div style={{flex: 1, minWidth: 0}}>
          <div className="n">{p.name}</div>
          <div className="muted" style={{fontSize: 12}}>{tokN(p.token)}{p.human ? '' : ' · ' + t('lbl.computer')}{iControl(p.id) && app.MODE !== 'local' ? ' · ' + t('lbl.you') : ''}</div>
        </div>
        <div className="cash">{fmt(p.cash)}</div>
      </div>
      <div className="status">{status}</div>
      {preview}
      <div className="actions">{btns}</div>
      {waiting && <div className="muted" style={{fontSize: 12.5}}>{p.human ? (app.MODE === 'local' ? '' : t('tc.waiting', {p: p.name})) : t('tc.thinking')}</div>}
      <TurnTimer />
    </>
  );
}

let warnedFor: number | null = null;
/** the turn timer's bar and clock; it buzzes once when the player's own last ten seconds start */
function TurnTimer() {
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick(x => x + 1), 250); return () => clearInterval(iv); }, []);
  const G = playingGame();
  const T = TDL as {end: number; total: number; actor: number} | null;
  const on = !!(T && G && !G.over);
  const left = on ? Math.max(0, Math.min(T!.total, T!.end - Date.now())) : 0;
  const sec = Math.ceil(left / 1000);
  const mine = on && iControl(T!.actor);
  useEffect(() => {
    if (on && mine && sec <= 10 && sec > 0 && warnedFor !== T!.end) {
      warnedFor = T!.end;
      try { navigator.vibrate && navigator.vibrate(120); } catch (e) { /* not allowed yet */ }
      sfx('pay');
    }
  });
  if (!on) return <div className="ttimer" hidden><i /><span /></div>;
  const who = G!.players[T!.actor];
  return (
    <div className={`ttimer${sec <= 10 ? ' low' : ''}${mine ? ' mine' : ''}`}>
      <i style={{transform: `scaleX(${left / T!.total})`}} />
      <span>⏱ {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}{who && !mine ? ' · ' + who.name : ''}</span>
    </div>
  );
}

/* ---------- tabs ---------- */
const TABS = ['players', 'deeds', 'log', 'book'];
export function SideTabs() {
  useRefresh();
  const G = playingGame();
  return (
    <>
      <div className="tabs" role="tablist" id="tabs">
        {TABS.map(k => <button key={k} role="tab" aria-selected={app.tab === k} onClick={() => setTab(k)}>{t('tab.' + k)}</button>)}
      </div>
      <div className="tabpanel" id="tabpanel">
        {G && (app.tab === 'players' ? <PlayersTab G={G} /> : app.tab === 'deeds' ? <DeedsTab G={G} /> : app.tab === 'log' ? <LogTab G={G} />
          : <div style={{display: 'contents'}} dangerouslySetInnerHTML={{__html: t('book')}} />)}
      </div>
    </>
  );
}

function PlayersTab({G}: {G: Game}) {
  const on = app.MODE === 'local' ? null : onlineCids();
  return (
    <div className="plist">
      {G.players.map(p => {
        const owned = ownedBy(G, p.id).sort((a, b) => a - b);
        const hostControl = amHost() && p.cid && p.cid !== app.myCid && !p.bankrupt && !G.over;
        const ring: CSSProperties = {boxShadow: `0 0 0 2px ${p.color}`};
        return (
          <div key={p.id} className={`prow ${p.id === G.cur ? 'active' : ''} ${p.bankrupt ? 'out' : ''}`}>
            <Coin token={p.token} style={ring} />
            <div style={{minWidth: 0}}>
              <div className="nm">
                {on && p.human && <span className={`dotst ${p.cid && on.has(p.cid) ? 'on' : ''}`} />}
                {p.name} {!p.human && <Small>{t('lbl.computer')}</Small>}{iControl(p.id) && app.MODE !== 'local' && <> <Small>{t('lbl.you')}</Small></>}
              </div>
              <div className="sub">{p.bankrupt ? t('st.bankrupt') : p.inJail ? t('st.inJail') : spN(p.pos)}{p.goojf.length ? ' · ' + t('st.goojf') : ''}</div>
              <div className="chips">{owned.map(i => <span key={i} className={`chip ${G.props[i].mort ? 'm' : ''}`} title={spN(i)} style={{background: colorOf(i)}} />)}</div>
              {hostControl && <button className="btn ghost sm" style={{marginTop: 4}} onClick={() => hostAct({op: 'bot', seat: p.id})}>{p.human ? t('btn.letBot') : t('btn.handBack')}</button>}
            </div>
            <div className="money"><b>{fmt(p.cash)}</b><span className="sub">{t('st.worth', {a: fmt(netWorth(G, p))})}</span></div>
          </div>
        );
      })}
    </div>
  );
}

/** one action on a property in My deeds: what it does, and what it costs or pays */
const DeedAct = ({label, amt, off, on, cls = ''}: {label: string; amt: string; off: boolean; on: () => void; cls?: string}) =>
  <button className={'dact ' + cls} disabled={off} onClick={on}><b>{label}</b><span>{amt}</span></button>;

/** the properties of whoever plays on this device, with building, selling and mortgaging */
function DeedsTab({G}: {G: Game}) {
  const seats = mySeats();
  const pid = seats.includes(G.cur) ? G.cur : seats[0];
  if (pid == null) return <div className="muted">{t('dd.watching')}</div>;
  const p = G.players[pid];
  const owned = ownedBy(G, pid).sort((a, b) => a - b);
  if (!owned.length) return <div className="muted">{t('dd.none', {p: p.name})}</div>;
  const can = pid === G.cur && !G.auction && !G.trade && !app.playing && !G.over;
  const act = (ty: 'build' | 'riad' | 'sell' | 'mort' | 'unmort', i: number) => dispatch({t: ty, i}, pid);
  return (
    <>
      <div className="muted" style={{fontSize: 12.5, marginBottom: 8}}>{can ? t('dd.help', {n: Math.round(RIAD_PREMIUM * 100)}) : t('dd.notTurn', {p: p.name})}</div>
      <div className="deeds">
        {owned.map(i => {
          const s = SP[i], pr = G.props[i];
          const prop = s.t === 'prop' ? s : null;
          const full = !!prop && ownsGroup(G, pid, prop.g);
          const group = prop ? groupIdx(prop.g) : [];
          const level = pr.houses === 5 ? t('lv.riad') : pr.houses ? t('lv.dar', {n: pr.houses}) : t('lv.none');
          const rent = !pr.mort && s.t !== 'util' ? fmt(rentFor(G, i)) : '';
          const built = group.some(j => G.props[j].houses > 0);   // buildings have to be sold before a rahn
          return (
            <div key={i} className={'drow' + (pr.mort ? ' mort' : '')}>
              <button className="th" onClick={() => openDeed(i)} aria-label={spN(i)}>
                {s.art ? <img src={s.art} alt="" /> : <span>{s.t === 'util' ? s.glyph : '🚄'}</span>}
              </button>
              <div className="dinfo">
                <button className="dname" onClick={() => openDeed(i)}>{spN(i)}</button>
                <div className="dmeta">
                  {prop ? <><i className="dot" style={{background: colorOf(i)}} /><span>{full ? cityN(prop.g) : t('dd.part', {n: group.filter(j => G.props[j].owner === pid).length, m: group.length, c: cityN(prop.g)})}</span></>
                    : <span>{s.t === 'rail' ? t('lv.station') : t('lv.utility')}</span>}
                  {pr.mort ? <span className="tag">{t('lv.mort')}</span>
                    : full && <><span className="pips" aria-hidden="true">{pr.houses === 5 ? <b>✦</b> : [0, 1, 2, 3].map(k => <i key={k} className={k < pr.houses ? 'on' : ''} />)}</span><span>{level}</span></>}
                </div>
              </div>
              {rent && <div className="drent"><small>{t('dd.rent')}</small><b>{rent}</b></div>}
              <div className="acts">
                {prop && full && (
                  <>
                    {pr.houses < 5 && <DeedAct label={pr.houses === 4 ? t('btn.addRiad') : t('btn.addDar')} amt={fmt(houseCost(i))} off={!(can && canBuild(G, i, pid))} on={() => act('build', i)} />}
                    {pr.houses < 5 && !(pr.houses >= 4 && group.every(j => G.props[j].houses >= 4)) &&
                      <DeedAct cls="gold" label={t('btn.riadNow')} amt={fmt(riadCost(G, i))} off={!(can && canRiad(G, i, pid))} on={() => act('riad', i)} />}
                    {pr.houses > 0 && <DeedAct cls="plus" label={t('btn.sell')} amt={'+' + fmt(houseCost(i) / 2)} off={!(can && canSell(G, i, pid))} on={() => act('sell', i)} />}
                  </>
                )}
                {pr.mort
                  ? <DeedAct label={t('btn.lift')} amt={fmt(unmortCost(i))} off={!(can && canUnmort(G, i, pid))} on={() => act('unmort', i)} />
                  : !built && <DeedAct cls="plus" label={t('btn.rahn')} amt={'+' + fmt(priceOf(i) / 2)} off={!(can && canMort(G, i, pid))} on={() => act('mort', i)} />}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const LogTab = ({G}: {G: Game}) => <div className="log">{(G.log || []).map((l, k) => <div key={k}>{tl(l)}</div>)}</div>;
