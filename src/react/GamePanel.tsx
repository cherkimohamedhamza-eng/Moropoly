// The game screen's side: #1 Live HUD (compact 2x2 player scoreboard, floating glass turn deck,
// tabbed Journal / My deeds / Credit & Chrika / Rules panel, and Table Pulse footer).
import {useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {amHost, dispatch, hostAct} from '../app/authority';
import {hostOnline, onlineCids} from '../app/online';
import {app} from '../app/state';
import {LOAN_MAX, LOAN_RATE, LOAN_STEP, RAIL_RENT, RIAD_PREMIUM, SHUFA_MARKUP, boardOf} from '../engine/data';
import {canBuild, canGhedr, canMort, canRiad, canSell, canShufa, canUnmort, chrikaCandidates, interestOn, jailFine, netWorth, rentFor, riadCost, rideTargets} from '../engine/engine';
import type {Game} from '../engine/types';
import {chrikaOf, chrikaValue, colorOf, groupIdx, hasCityRights, houseCost, ownedBy, priceOf, unmortCost, unownedCount} from '../engine/util';
import {cityN, fmt, spN, t, tl} from '../i18n/core';
import {goHome} from '../ui/home';
import {layoutPawns} from '../ui/board';
import {tableView, toggleView} from '../ui/tableview';
import {openAuction, openChrika, openChrikaReply, openConfirmBankrupt, openDeed, openGameOver, openGhedr, openGuide, openSeat, openTrade, openTradeReply} from '../ui/modals';
import {sfx} from '../ui/music';
import {iControl, mySeats, setTab} from '../ui/render';
import {TDL, seatedIn} from '../ui/view';
import {Coin, LangSwitch, Rich} from './common';
import {HouseRulesList} from './Guide';
import {refresh, useRefresh} from './store';

const playingGame = (): Game | null => (app.V && app.V.status === 'play' ? (app.V as Game) : null);

/* ---------- collapsible sidebar state (focus-board mode on desktop) ---------- */
let sideCollapsed = (() => {
  try { return localStorage.getItem('moropoly-side-collapsed') === '1'; } catch { return false; }
})();

export const isSideCollapsed = () => sideCollapsed;

function syncSideBody(active: boolean) {
  document.body.classList.toggle('side-collapsed', active && sideCollapsed);
  if (active) {
    requestAnimationFrame(() => {
      layoutPawns();
      setTimeout(() => layoutPawns(), 80);
    });
  }
}

export function setSideCollapsed(next: boolean) {
  sideCollapsed = next;
  try { localStorage.setItem('moropoly-side-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
  syncSideBody(!!playingGame());
  refresh();
}

export function openSideTo(tab?: string) {
  if (tab) setTab(tab);
  if (sideCollapsed) setSideCollapsed(false);
}

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
      {G && (
        <button
          className={`btn ghost sm side-toggle-btn${sideCollapsed ? ' active' : ''}`}
          id="sideToggleBtn"
          onClick={() => setSideCollapsed(!sideCollapsed)}
        >
          {sideCollapsed ? `◧ ${t('btn.showSide')}` : `◫ ${t('btn.hideSide')}`}
        </button>
      )}
      {G && app.MODE !== 'local' && seatedIn(G) && !G.over && <button className="btn ghost sm" id="mySeatBtn" onClick={openSeat}>{t('btn.mySeat')}</button>}
      {G && <button className="btn ghost sm" id="viewBtn" onClick={() => { toggleView(); refresh(); }}>{t(tableView() ? 'btn.viewFlat' : 'btn.viewTable')}</button>}
      <button className="btn ghost sm" id="leaveBtn" onClick={goHome}>{t('btn.leave')}</button>
    </>
  );
}

/* ---------- banner ---------- */
export function Banner() {
  useRefresh();
  const V = app.V as Game | null;
  const G = playingGame();
  const guest = app.MODE === 'guest' || app.MODE === 'online';
  const watching = guest && !!V && !!V.players && !seatedIn(V) && !V.over;
  const alert = watching && hostOnline()
    ? <div className="banner" style={{marginBottom: 12, background: 'rgba(201,207,216,.08)', borderColor: 'var(--line-2)', color: 'var(--text)'}}>{t('watching')}</div>
    : guest && !hostOnline()
      ? <div className="banner" style={{marginBottom: 12}}>{t(app.MODE === 'online' ? 'banner.offline' : 'banner.paused')}</div>
      : null;
  if (!G || !sideCollapsed) return alert;
  return (
    <>
      {alert}
      <button type="button" className="side-reopen" onClick={() => setSideCollapsed(false)} aria-label={t('btn.showSide')}>
        <span>◀</span>
        <b>{t('btn.showSide')}</b>
      </button>
      {tableView() && (
        <div className="table-focus-dock">
          <FeltControls G={G} />
        </div>
      )}
    </>
  );
}

/* ---------- Live HUD sidebar (mounted in #turnCard) ---------- */
/* ---------- shared turn action builder (used by both Live HUD & Collapsed Felt Controls) ---------- */
export interface TurnAct {
  key: string;
  cls: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function buildTurnState(G: Game, onOpenDeeds = () => setTab('deeds')) {
  const p = G.players[G.cur];
  const mine = iControl(G.cur) && !app.playing && !G.over;
  let status: ReactNode = null;
  let bad = false;
  const primary: TurnAct[] = [];
  const sub: TurnAct[] = [];

  if (G.over) {
    status = <Rich k="tc.wins" p={{p: G.players[G.winner!].name}} />;
    primary.push({key: 'results', cls: 'metal', label: t('btn.results'), onClick: openGameOver});
  } else if (app.playing) {
    status = tl(G.event);
  } else if (G.trade) {
    const tr = G.trade;
    status = <Rich k="tc.offered" p={{p: G.players[tr.from].name, o: G.players[tr.to].name}} />;
    if (iControl(tr.to)) primary.push({key: 'reply', cls: 'red', label: t('btn.seeOffer'), onClick: openTradeReply});
    if (iControl(tr.from)) sub.push({key: 'tcancel', cls: 'ghost', label: t('btn.withdraw'), onClick: () => dispatch({t: 'tradeCancel'}, tr.from)});
  } else if (G.chrikaOffer) {
    const co = G.chrikaOffer;
    const share = co.shareFrom ?? 50;
    status = co.kind === 'form'
      ? <Rich k="tc.chrikaOffer" p={{p: G.players[co.from].name, o: G.players[co.to].name, g: cityN(co.g), n: String(share), m: String(100 - share)}} />
      : <Rich k="tc.chrikaExitOffer" p={{p: G.players[co.from].name, o: G.players[co.to].name, g: cityN(co.g)}} />;
    if (iControl(co.to)) primary.push({key: 'creply', cls: 'red', label: t('btn.seeOffer'), onClick: openChrikaReply});
    if (iControl(co.from)) sub.push({key: 'ccancel', cls: 'ghost', label: t('btn.withdraw'), onClick: () => dispatch({t: 'chrikaCancel'}, co.from)});
  } else if (G.auction) {
    const a = G.auction;
    status = <Rich k="tc.dlala" p={{s: spN(a.idx), a: fmt(a.high), by: a.highBidder >= 0 ? t('tc.by', {p: G.players[a.highBidder].name}) : ''}} />;
    primary.push({key: 'auction', cls: 'red', label: t('btn.openAuc'), onClick: openAuction});
  } else if (p.cash < 0) {
    bad = true;
    status = t('tc.owes', {p: p.name, a: fmt(-p.cash)});
    if (mine) {
      primary.push({key: 'deeds', cls: 'gold', label: t('btn.myDeeds'), onClick: onOpenDeeds});
      sub.push({key: 'trade', cls: 'ghost', label: t('btn.tbadel'), onClick: openTrade});
      if (G.settings.chrika && (G.chrikas || []).some(c => c.a === p.id || c.b === p.id)) {
        sub.push({key: 'chrika', cls: 'gold', label: t('btn.chrika'), onClick: openChrika});
      }
      sub.push({key: 'bankrupt', cls: 'danger', label: t('btn.bankrupt'), onClick: openConfirmBankrupt});
    }
  } else if (G.phase === 'buy') {
    const i = G.pending!.idx, s = boardOf(G).spaces[i];
    status = <Rich k="tc.forSale" p={{s: spN(i, G), c: s.t === 'prop' ? ' · ' + cityN(s.g) : ''}} />;
    if (mine) {
      primary.push(
        {key: 'buy', cls: 'red', label: t('btn.buy', {a: fmt(priceOf(i, G))}), onClick: () => dispatch({t: 'buy'}), disabled: p.cash < priceOf(i, G)},
        {key: 'decline', cls: 'ghost', label: G.settings.dlala ? t('btn.dlala') : t('btn.pass'), onClick: () => dispatch({t: 'decline'})},
      );
    }
  } else if (G.phase === 'roll') {
    status = p.inJail ? t('tc.inJail', {p: p.name, n: p.jailTurns + 1, a: fmt(jailFine(G))}) : G.rollAgain ? t('tc.again') : t('tc.toRoll', {p: p.name});
    if (mine) {
      const chReady = !!G.settings.chrika && (chrikaCandidates(G, p.id).length > 0 || (G.chrikas || []).some(c => c.a === p.id || c.b === p.id));
      primary.push({key: 'roll', cls: 'red', label: t('btn.roll'), onClick: () => dispatch({t: 'roll'})});
      if (p.inJail) {
        sub.push({key: 'fine', cls: 'gold', label: t('btn.payFine', {a: fmt(jailFine(G))}), onClick: () => dispatch({t: 'fine'}), disabled: p.cash < jailFine(G)});
        if (p.goojf.length) sub.push({key: 'card', cls: 'green', label: t('btn.useCard'), onClick: () => dispatch({t: 'card'})});
      }
      sub.push({key: 'trade', cls: 'ghost', label: t('btn.tbadel'), onClick: openTrade});
      if (G.settings.chrika) sub.push({key: 'chrika', cls: chReady ? 'gold' : 'ghost', label: t('btn.chrika'), onClick: openChrika});
    }
  } else if (G.phase === 'end') {
    status = tl(G.event);
    if (mine) {
      const chReady = !!G.settings.chrika && (chrikaCandidates(G, p.id).length > 0 || (G.chrikas || []).some(c => c.a === p.id || c.b === p.id));
      primary.push({key: 'end', cls: 'green', label: t('btn.end'), onClick: () => dispatch({t: 'end'})});
      sub.push({key: 'deeds', cls: 'ghost', label: t('btn.build'), onClick: onOpenDeeds});
      sub.push({key: 'trade', cls: 'ghost', label: t('btn.tbadel'), onClick: openTrade});
      if (G.settings.chrika) sub.push({key: 'chrika', cls: chReady ? 'gold' : 'ghost', label: t('btn.chrika'), onClick: openChrika});
    }
  }

  if (mine) {
    for (const to of rideTargets(G, G.cur)) {
      sub.push({key: 'ride' + to, cls: 'gold', label: t('btn.ride', {s: spN(to, G)}), onClick: () => dispatch({t: 'ride', to})});
    }
  }

  const buyIdx = G.phase === 'buy' && G.pending && !app.playing ? G.pending.idx : null;
  const waiting = !mine && !G.over && !app.playing && !G.auction && !G.trade && !G.chrikaOffer;
  const canRoll = mine && !G.trade && !G.chrikaOffer && !G.auction && p.cash >= 0 && G.phase === 'roll';
  return {p, mine, status, bad, primary, sub, buyIdx, waiting, canRoll};
}

/** Compact on-board felt command deck rendered inside .center when the sidebar is collapsed */
export function FeltControls({G}: {G: Game}) {
  if (!sideCollapsed) return null;
  const {p, mine, status, bad, primary, sub, buyIdx, waiting} = buildTurnState(G, () => openSideTo('deeds'));
  const hasDeals = !!(G.settings.credit || G.settings.chrika);
  return (
    <div className="felt-hud" style={{'--pc': p.color} as CSSProperties} onClick={e => e.stopPropagation()}>
      <div className="fh-top">
        <Coin token={p.token} style={{boxShadow: `0 0 0 2px ${p.color}`}} />
        <span className="fh-nm">{p.name}</span>
        <span className="fh-cash">{fmt(p.cash)}</span>
        {mine && <span className="fh-tag">{t('tc.yourTurn')}</span>}
        <button type="button" className="fh-open" onClick={() => setSideCollapsed(false)} title={t('btn.showSide')}>
          ◧ {t('btn.showSide')}
        </button>
      </div>
      {buyIdx !== null && (
        <div className="fh-buy">
          {boardOf(G).spaces[buyIdx].art && <img src={boardOf(G).spaces[buyIdx].art} alt="" />}
          <span className="fh-buy-t">{spN(buyIdx, G)}</span>
          <button type="button" className="fh-buy-v" onClick={() => openDeed(buyIdx)}>{t('btn.viewDeed')}</button>
        </div>
      )}
      {primary.length > 0 && (
        <div className={`fh-prim${primary.length > 1 ? ' split' : ''}`}>
          {primary.map(a => (
            <button key={a.key} type="button" className={`btn ${a.cls}`} disabled={a.disabled} onClick={a.onClick}>{a.label}</button>
          ))}
        </div>
      )}
      <div className="fh-sub">
        {sub.map(a => (
          <button key={a.key} type="button" className={`fh-pill ${a.cls}`} disabled={a.disabled} onClick={a.onClick}>{a.label}</button>
        ))}
        <button type="button" className="fh-pill" onClick={() => openSideTo('deeds')}>{t('tab.deeds')}</button>
        {hasDeals && <button type="button" className="fh-pill" onClick={() => openSideTo('deals')}>{t('tab.deals')}</button>}
      </div>
      {waiting && (
        <div className={`fh-wait${bad ? ' bad' : ''}`}>
          {p.human ? (app.MODE === 'local' ? status : t('tc.waiting', {p: p.name})) : t('tc.thinking')}
        </div>
      )}
      <TurnTimer />
    </div>
  );
}

function logTone(l: unknown): string {
  const k = typeof l === 'object' && l && 'k' in l ? String((l as {k: string}).k) : '';
  if (/ghedr|jail|bank|payShort|threeDoubles/i.test(k)) return 'red';
  if (/buys|build|riad|daret|passGo|win|collect|saved|chrikaFormed/i.test(k)) return 'green';
  if (/dlala|sold|deal|chrika|shufa|borrow/i.test(k)) return 'gold';
  return '';
}

export function TurnCard() {
  useRefresh();
  const G = playingGame();
  useEffect(() => {
    syncSideBody(!!G);
    return () => { document.body.classList.remove('side-collapsed'); };
  }, [!!G]);
  if (!G) return null;

  const {p, mine, status, bad, primary, sub, buyIdx, waiting} = buildTurnState(G);
  const on = app.MODE === 'local' ? null : onlineCids();
  const seats = mySeats();
  const myPid = seats.includes(G.cur) ? G.cur : seats[0];
  const myOwned = myPid != null ? ownedBy(G, myPid).sort((a, b) => a - b) : [];
  const hasDeals = !!(G.settings.credit || G.settings.chrika);
  const dealsLabel = G.settings.credit && G.settings.chrika ? t('tab.deals') : G.settings.credit ? t('cr.title') : t('btn.chrika');
  const dealsHot = hasDeals && myPid != null && (
    (G.players[myPid]?.loan || 0) > 0
    || (!!G.settings.chrika && (G.ghedrOpen || chrikaCandidates(G, myPid).length > 0))
  );
  const view = app.tab === 'deeds' || app.tab === 'book' || (app.tab === 'deals' && hasDeals) ? app.tab : 'log';
  const chOn = !!G.settings.chrika;
  const chCount = (G.chrikas || []).length;
  const ghedrLeft = chOn ? unownedCount(G) : 0;

  return (
    <div className="sb-root sb-hud">
      {/* Compact 2x2 Live Player Scoreboard */}
      <div className="hud-pgrid">
        {G.players.map(pl => {
          const ow = ownedBy(G, pl.id).sort((a, b) => a - b);
          const cur = pl.id === G.cur;
          const hostControl = amHost() && pl.cid && pl.cid !== app.myCid && !pl.bankrupt && !G.over;
          return (
            <div
              key={pl.id}
              className={`hud-p${cur ? ' act' : ''}${pl.bankrupt ? ' out' : ''}`}
              title={`${pl.name} · ${t('st.worth', {a: fmt(netWorth(G, pl))})}`}
            >
              <Coin token={pl.token} style={{boxShadow: `0 0 0 2.5px ${pl.color}`}} />
              <div className="hud-pm">
                <div className="hud-nm">
                  {on && pl.human && <span className={`dotst ${pl.cid && on.has(pl.cid) ? 'on' : ''}`} />}
                  <span>{pl.name}</span>
                  {pl.gheddar && <span className="gheddar-badge">{t('badge.gheddar')}</span>}
                </div>
                <div className="hud-cs">{fmt(pl.cash)}</div>
                <div className="hud-loc">
                  {pl.bankrupt ? t('st.bankrupt') : pl.inJail ? t('st.inJail') : spN(pl.pos, G)}
                  {pl.loan ? ` · -${fmt(pl.loan)}` : ''}
                </div>
                {ow.length > 0 && (
                  <div className="hud-pips">
                    {ow.slice(0, 8).map(i => (
                      <i key={i} className={G.props[i].mort ? 'm' : ''} title={spN(i, G)} style={{background: colorOf(i, G)}} />
                    ))}
                  </div>
                )}
                {hostControl && (
                  <button className="hud-handoff" onClick={() => hostAct({op: 'bot', seat: pl.id})}>
                    {pl.human ? t('btn.letBot') : t('btn.handBack')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Glass Turn Deck */}
      <div className="hud-hero" style={{'--pc': p.color} as CSSProperties}>
        <div className="hud-st">
          <span className={bad ? 'bad' : ''}>{status}</span>
          {mine && <span className="hud-badge">{t('tc.yourTurn')}</span>}
        </div>
        {buyIdx !== null && <BuyPreview G={G} idx={buyIdx} />}
        {primary.length > 0 && (
          <div className={`hud-prim${primary.length > 1 ? ' split' : ''}`}>
            {primary.map(a => (
              <button key={a.key} className={`btn ${a.cls}`} disabled={a.disabled} onClick={a.onClick}>{a.label}</button>
            ))}
          </div>
        )}
        {sub.length > 0 && (
          <div className={`hud-sub cols-${Math.min(3, Math.max(2, sub.length))}`}>
            {sub.map(a => (
              <button key={a.key} className={`btn ${a.cls}`} disabled={a.disabled} onClick={a.onClick}>{a.label}</button>
            ))}
          </div>
        )}
        {waiting && (
          <div className="sb-wait">{p.human ? (app.MODE === 'local' ? '' : t('tc.waiting', {p: p.name})) : t('tc.thinking')}</div>
        )}
        <TurnTimer />
      </div>

      {/* Tabbed Live Feed / My deeds / Credit & Chrika / Rules + Table Pulse */}
      <div className="hud-feedbox">
        <div className="hud-tabs" role="tablist" id="tabs">
          <button type="button" role="tab" aria-selected={view === 'log'} onClick={() => setTab('log')}>{t('tab.log')}</button>
          <button type="button" role="tab" aria-selected={view === 'deeds'} onClick={() => setTab('deeds')}>
            {t('tab.deeds')}{myOwned.length ? ` (${myOwned.length})` : ''}
          </button>
          {hasDeals && (
            <button type="button" role="tab" aria-selected={view === 'deals'} onClick={() => setTab('deals')}>
              {dealsLabel}{dealsHot && <i className="tab-dot" aria-hidden="true" />}
            </button>
          )}
          <button type="button" role="tab" aria-selected={view === 'book'} onClick={() => setTab('book')}>{t('tab.book')}</button>
        </div>

        <div className="hud-body" id="tabpanel">
          {view === 'log' ? (
            <div className="sb-feed">
              {(G.log || []).map((l, k) => (
                <div key={k} className={`sb-ev ${logTone(l)}`}>
                  <i aria-hidden="true" />
                  <span>{tl(l)}</span>
                </div>
              ))}
            </div>
          ) : view === 'deeds' ? (
            <DeedsTab G={G} />
          ) : view === 'deals' ? (
            <DealsTab G={G} />
          ) : (
            <>
              <HouseRulesList G={G} open={openGuide} />
              <div style={{display: 'contents'}} dangerouslySetInnerHTML={{__html: t('book')}} />
            </>
          )}
        </div>

        <div className="sb-pulse">
          <div className="tp-col">
            <small>{t('tp.daret')}</small>
            <strong className={G.daret > 0 ? 'g' : ''}>{fmt(G.daret)}</strong>
          </div>
          {chOn ? (
            <>
              <button type="button" className="tp-col btn" onClick={openChrika}>
                <small>{t('tp.ghedr')}</small>
                <strong className={G.ghedrOpen ? 'r' : ''}>{G.ghedrOpen ? `🔥 ${t('tp.open')}` : `🔒 ${t('tp.left', {n: ghedrLeft})}`}</strong>
              </button>
              <button type="button" className="tp-col btn" onClick={openChrika}>
                <small>{t('tp.chrikas')}</small>
                <strong className={chCount > 0 ? 'y' : ''}>{chCount}</strong>
              </button>
            </>
          ) : (
            <>
              <div className="tp-col">
                <small>{t('tp.round')}</small>
                <strong>{G.round}{G.settings.rounds ? ` / ${G.settings.rounds}` : ''}</strong>
              </div>
              <div className="tp-col">
                <small>{t('tp.board')}</small>
                <strong className="y">{t('tp.squares', {n: boardOf(G).size})}</strong>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BuyPreview({G, idx}: {G: Game; idx: number}) {
  const B = boardOf(G), s = B.spaces[idx];
  return (
    <div className="sb-buy cream">
      {s.art && <img src={s.art} alt="" />}
      <div className="sb-buy-b">
        <div className="sb-buy-t">{spN(idx, G)} {app.LANG !== 'ar' && <span className="ar">{s.ar}</span>}</div>
        <div className="sb-buy-r">
          {s.t === 'prop'
            ? t(groupIdx(s.g, G).length >= 4 ? 'pv.rentProp4' : 'pv.rentProp', {a: fmt(s.rent[0]), b: fmt(s.rent[0] * 2), c: cityN(s.g)})
            : s.t === 'rail'
              ? t('pv.rentRail', {a: fmt(RAIL_RENT[0]), b: fmt(RAIL_RENT[3])}) + (G.settings.train ? t('pv.railSide') : '')
              : t(B.utils.length >= 3 ? 'pv.rentUtil3' : 'pv.rentUtil')}
        </div>
        <button type="button" className="sb-buy-lnk" onClick={() => openDeed(idx)}>{t('btn.viewDeed')}</button>
      </div>
    </div>
  );
}

let warnedFor: number | null = null;
/** the turn timer's bar and clock; it buzzes once when the player's own last ten seconds start */
function TurnTimer() {
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick(x => x + 1), 250); return () => clearInterval(iv); }, []);
  const G = playingGame();
  const T = TDL as {end: number; total: number; actor: number; pause: {left: number; until: number} | null} | null;
  const on = !!(T && G && !G.over);
  const paused = on && !!T!.pause && Date.now() < T!.pause.until;   // stopped while a trade offer is written
  const left = on ? Math.max(0, Math.min(T!.total, paused ? T!.pause!.left : T!.end - Date.now())) : 0;
  const sec = Math.ceil(left / 1000);
  const mine = on && iControl(T!.actor);
  useEffect(() => {
    if (on && mine && !paused && sec <= 10 && sec > 0 && warnedFor !== T!.end) {
      warnedFor = T!.end;
      try { navigator.vibrate && navigator.vibrate(120); } catch (e) { /* not allowed yet */ }
      sfx('pay');
    }
  });
  if (!on) return <div className="ttimer" hidden><i /><span /></div>;
  const who = G!.players[T!.actor];
  return (
    <div className={`ttimer${sec <= 10 && !paused ? ' low' : ''}${mine ? ' mine' : ''}${paused ? ' paused' : ''}`}>
      <i style={{transform: `scaleX(${left / T!.total})`}} />
      <span>{paused ? '⏸' : '⏱'} {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}{paused ? ' · ' + t('tm.paused', {p: who ? who.name : ''}) : who && !mine ? ' · ' + who.name : ''}</span>
    </div>
  );
}

/* ---------- legacy mount slot (handled inside TurnCard Live HUD) ---------- */
export function SideTabs() {
  useRefresh();
  return null;
}

/** one action on a property in My deeds: what it does, and what it costs or pays */
const DeedAct = ({label, amt, off, on, cls = ''}: {label: string; amt: string; off: boolean; on: () => void; cls?: string}) =>
  <button className={'dact ' + cls} disabled={off} onClick={on}><b>{label}</b><span>{amt}</span></button>;

/** house rule "credit": Bank vault card with quick-tap amount chips + live debt bar */
function CreditPanel({G, pid, can}: {G: Game; pid: number; can: boolean}) {
  const p = G.players[pid];
  const [amt, setAmt] = useState(LOAN_MAX);
  if (!G.settings.credit) return null;
  const loan = p.loan || 0;
  const steps = Array.from({length: LOAN_MAX / LOAN_STEP}, (_, k) => (k + 1) * LOAN_STEP);
  const pct = Math.min(100, Math.round((loan / LOAN_MAX) * 100));
  return (
    <div className={`credit-card${loan ? ' active' : ''}`}>
      <div className="cc-hd">
        <span className="cc-ico" aria-hidden="true">🏦</span>
        <div className="cc-ttl">
          <b>{t('cr.title')}</b>
          <small>{loan ? t('cr.owes', {a: fmt(loan), b: fmt(interestOn(loan))}) : `${Math.round(LOAN_RATE * 100)}% / lap · max ${fmt(LOAN_MAX)}`}</small>
        </div>
        <span className={`cc-pill${loan ? ' debt' : ''}`}>
          {loan ? fmt(loan) : fmt(LOAN_MAX)}
        </span>
      </div>
      {loan ? (
        <>
          <div className="cc-bar"><i style={{width: `${pct}%`}} /></div>
          <div className="cc-repay">
            <button className="cc-btn" disabled={!can || p.cash < Math.min(loan, LOAN_STEP)} onClick={() => dispatch({t: 'repay', a: Math.min(loan, LOAN_STEP)}, pid)}>
              {t('cr.repay', {a: fmt(Math.min(loan, LOAN_STEP))})}
            </button>
            <button className="cc-btn green" disabled={!can || p.cash < loan} onClick={() => dispatch({t: 'repay', a: loan}, pid)}>
              {t('cr.repayAll')}
            </button>
          </div>
        </>
      ) : (
        <div className="cc-borrow">
          <div className="cc-chips" role="group" aria-label={t('cr.amount')}>
            {steps.map(v => (
              <button key={v} type="button" className={`cc-chip${amt === v ? ' on' : ''}`} onClick={() => setAmt(v)}>
                {v >= 1000 ? `${v / 1000}k` : v}
              </button>
            ))}
          </div>
          <button className="cc-go" disabled={!can} onClick={() => dispatch({t: 'borrow', a: amt}, pid)}>
            {t('cr.borrow')} · {fmt(amt)}
          </button>
        </div>
      )}
    </div>
  );
}

/** house rule "chrika": city pact & L'Ghedr countdown card */
function ChrikaSummary({G, pid, can}: {G: Game; pid: number; can: boolean}) {
  if (!G.settings.chrika) return null;
  const mine = (G.chrikas || []).filter(c => c.a === pid || c.b === pid);
  const cands = chrikaCandidates(G, pid);
  const totalBuyable = boardOf(G).spaces.filter(s => s.t === 'prop' || s.t === 'rail' || s.t === 'util').length;
  const left = unownedCount(G);
  const bought = Math.max(0, totalBuyable - left);
  const pct = totalBuyable ? Math.round((bought / totalBuyable) * 100) : 0;
  return (
    <div className={`chrika-card-hud${G.ghedrOpen ? ' open' : ''}`}>
      <div className="ch-hd">
        <span className="ch-ico" aria-hidden="true">{G.ghedrOpen ? '🗡️' : '🤝'}</span>
        <div className="ch-ttl">
          <b>{t('btn.chrika')} <span className="ch-ar">شركة</span></b>
          <small className={G.ghedrOpen ? 'open' : ''}>
            {G.ghedrOpen ? t('ch.unlocked') : t('ch.locked', {n: left})}
          </small>
        </div>
        <button className={`ch-cta${cands.length || G.ghedrOpen ? ' hot' : ''}`} onClick={openChrika}>
          {cands.length ? t('btn.chrikaPropose') : `${mine.length ? `${mine.length} · ` : ''}Open →`}
        </button>
      </div>
      <div className="ch-prog" title={`${bought} / ${totalBuyable}`}>
        <div className="ch-pbar"><i style={{width: `${G.ghedrOpen ? 100 : pct}%`}} /></div>
        <span>{G.ghedrOpen ? '100%' : `${bought}/${totalBuyable}`}</span>
      </div>
      {mine.map(c => {
        const other = c.a === pid ? c.b : c.a;
        const myShare = c.a === pid ? c.shareA : 100 - c.shareA;
        const {payout} = chrikaValue(G, c.g);
        const canBetray = can && canGhedr(G, pid, c.g);
        const col = colorOf(groupIdx(c.g, G)[0], G);
        return (
          <div key={c.g} className="ch-pact" style={{'--cc': col} as CSSProperties}>
            <div className="ch-ptop">
              <i className="dot" style={{background: col}} />
              <b>{cityN(c.g)}</b>
              <span className="ch-with">with {G.players[other].name}</span>
              <span className="ch-ratio">{myShare}/{100 - myShare}</span>
            </div>
            <div className="ch-splitbar"><i style={{width: `${myShare}%`, background: col}} /></div>
            {canBetray && (
              <button className="ch-betray" onClick={() => openGhedr(c.g)}>
                🗡️ {t('btn.ghedrGo', {a: fmt(payout)})}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** dedicated tab for Bank Credit & Chrika city pacts */
function DealsTab({G}: {G: Game}) {
  const seats = mySeats();
  const pid = seats.includes(G.cur) ? G.cur : seats[0];
  if (pid == null) return <div className="muted">{t('dd.watching')}</div>;
  const can = pid === G.cur && !G.auction && !G.trade && !G.chrikaOffer && !app.playing && !G.over;
  return (
    <div className="deals-tab">
      <CreditPanel G={G} pid={pid} can={can} />
      <ChrikaSummary G={G} pid={pid} can={can} />
    </div>
  );
}

/** the properties of whoever plays on this device, with building, selling and mortgaging */
function DeedsTab({G}: {G: Game}) {
  const seats = mySeats();
  const pid = seats.includes(G.cur) ? G.cur : seats[0];
  if (pid == null) return <div className="muted">{t('dd.watching')}</div>;
  const p = G.players[pid];
  const owned = ownedBy(G, pid).sort((a, b) => a - b);
  const can = pid === G.cur && !G.auction && !G.trade && !G.chrikaOffer && !app.playing && !G.over;
  const shufa = Object.keys(G.props).some(i => canShufa(G, pid, +i))
    ? <div className="shufa-hint">{t('dd.shufa', {n: Math.round(SHUFA_MARKUP * 100)})}</div>
    : null;
  if (!owned.length) {
    return (
      <>
        {shufa}
        <div className="deeds-empty">
          <span aria-hidden="true">🏛️</span>
          <p>{t('dd.none', {p: p.name})}</p>
        </div>
      </>
    );
  }
  const act = (ty: 'build' | 'riad' | 'sell' | 'mort' | 'unmort', i: number) => dispatch({t: ty, i}, pid);
  return (
    <>
      {shufa}
      <div className="muted" style={{fontSize: 12.5, marginBottom: 8}}>{can ? t('dd.help', {n: Math.round(RIAD_PREMIUM * 100)}) : t('dd.notTurn', {p: p.name})}</div>
      <div className="deeds">
        {owned.map(i => {
          const s = boardOf(G).spaces[i], pr = G.props[i];
          const prop = s.t === 'prop' ? s : null;
          const ch = prop ? chrikaOf(G, prop.g) : undefined;
          const full = !!prop && hasCityRights(G, pid, prop.g);
          const group = prop ? groupIdx(prop.g, G) : [];
          const level = pr.houses === 5 ? t('lv.riad') : pr.houses ? t('lv.dar', {n: pr.houses}) : t('lv.none');
          const rent = !pr.mort && s.t !== 'util' ? fmt(rentFor(G, i)) : '';
          const built = group.some(j => G.props[j].houses > 0);   // buildings have to be sold before a rahn
          const myGroup = ch ? group.filter(j => G.props[j].owner === pid) : group;
          const partnerName = ch ? G.players[ch.a === pid ? ch.b : ch.a].name : '';
          return (
            <div key={i} className={'drow' + (pr.mort ? ' mort' : '')}>
              <button className="th" onClick={() => openDeed(i)} aria-label={spN(i, G)}>
                {s.art ? <img src={s.art} alt="" /> : <span>{s.t === 'util' ? s.glyph : '🚄'}</span>}
              </button>
              <div className="dinfo">
                <button className="dname" onClick={() => openDeed(i)}>{spN(i, G)}</button>
                <div className="dmeta">
                  {prop ? <><i className="dot" style={{background: colorOf(i, G)}} /><span>{ch ? `${cityN(prop.g)} · ${t('btn.chrika')} (${partnerName})` : full ? cityN(prop.g) : t('dd.part', {n: group.filter(j => G.props[j].owner === pid).length, m: group.length, c: cityN(prop.g)})}</span></>
                    : <span>{s.t === 'rail' ? t('lv.station') : t('lv.utility')}</span>}
                  {pr.mort ? <span className="tag">{t('lv.mort')}</span>
                    : full && <><span className="pips" aria-hidden="true">{pr.houses === 5 ? <b>✦</b> : [0, 1, 2, 3].map(k => <i key={k} className={k < pr.houses ? 'on' : ''} />)}</span><span>{level}</span></>}
                </div>
              </div>
              {rent && <div className="drent"><small>{t('dd.rent')}</small><b>{rent}</b></div>}
              <div className="acts">
                {prop && full && (
                  <>
                    {pr.houses < 5 && <DeedAct label={pr.houses === 4 ? t('btn.addRiad') : t('btn.addDar')} amt={fmt(houseCost(i, G))} off={!(can && canBuild(G, i, pid))} on={() => act('build', i)} />}
                    {G.settings.riadNow !== false && pr.houses < 5 && !(pr.houses >= 4 && myGroup.every(j => G.props[j].houses >= 4)) &&
                      <DeedAct cls="gold" label={t('btn.riadNow')} amt={fmt(riadCost(G, i))} off={!(can && canRiad(G, i, pid))} on={() => act('riad', i)} />}
                    {!ch && pr.houses > 0 && <DeedAct cls="plus" label={t('btn.sell')} amt={'+' + fmt(houseCost(i, G) / 2)} off={!(can && canSell(G, i, pid))} on={() => act('sell', i)} />}
                  </>
                )}
                {!ch && (pr.mort
                  ? <DeedAct label={t('btn.lift')} amt={fmt(unmortCost(i, G))} off={!(can && canUnmort(G, i, pid))} on={() => act('unmort', i)} />
                  : !built && <DeedAct cls="plus" label={t('btn.rahn')} amt={'+' + fmt(priceOf(i, G) / 2)} off={!(can && canMort(G, i, pid))} on={() => act('mort', i)} />)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
