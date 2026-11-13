// The board: forty squares with their owners, houses and mortgages, the Daret pot, the centre with the dice,
// and the pawns. React draws it from the game state; the animations (src/ui/anim.js) move the pawns, spin
// the dice and show reveals, floating money and confetti in elements React leaves alone: pawn positions,
// the dice's rotation, the caption (#eventLine) and the reveal stage (#stage).
import {useState, type CSSProperties, type ReactNode} from 'react';
import {app} from '../app/state';
import {BAND, GROUPS, SP, TOKENS} from '../engine/data';
import type {Game} from '../engine/types';
import {isOwnable, range} from '../engine/util';
import {fmt, num, spN, t} from '../i18n/core';
import {openDeed} from '../ui/modals';
import {useRefresh} from './store';

const pos2grid = (i: number) => {
  if (i === 0) return [11, 11]; if (i < 10) return [11, 11 - i]; if (i === 10) return [11, 1]; if (i < 20) return [11 - (i - 10), 1];
  if (i === 20) return [1, 1]; if (i < 30) return [1, 1 + (i - 20)]; if (i === 30) return [1, 11]; return [1 + (i - 30), 11];
};
const sideOf = (i: number) => (i < 10 ? 'b' : i < 20 ? 'l' : i < 30 ? 't' : 'r');
const STAR_PATH = 'M0,-0.95L0.56,0.77L-0.9,-0.29H0.9L-0.56,0.77Z';
const PIPS: Record<number, number[]> = {1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]};

export function Board() {
  useRefresh();
  const V = app.V && app.V.status === 'play' ? (app.V as Game) : null;
  if (!V) return null;
  const ar = app.LANG === 'ar', fx = app.boardFx;
  const landed = fx.hl ?? V.landed;
  return (
    <>
      {SP.map((_, i) => <Square key={i} i={i} V={V} landed={landed === i} />)}
      <div className="center" dir={ar ? 'rtl' : 'ltr'}>
        <svg className="star" viewBox="-1 -1 2 2" aria-hidden="true"><path d={STAR_PATH} fill="none" strokeWidth=".05" strokeLinejoin="miter" /></svg>
        <div className="ttl"><div className="tif">ⵎⵓⵔⵓⴱⵓⵍⵉ</div><div className="ar">مُوروبولي</div><div className="lat">MOROPOLY</div></div>
        {/* The dice. The canvas shows the 3D model (ui/dice3d.js); the CSS cubes under it are what you see until
            the model has loaded or where WebGL is missing (ui/board.js setDice turns them and shades their faces) */}
        <div className="dice" id="dice">
          <canvas className="dice-gl" id="diceGl" aria-hidden="true" />
          {[0, 1].map(k => (
            <div key={k} className="dslot">
              <div className="dview" id={'dv' + k}>
                <div className="die" id={'d' + k}>
                  {[1, 2, 3, 4, 5, 6].map(f => (
                    <div key={f} className={'face f' + f}>{range(9).map(j => <i key={j} style={{visibility: PIPS[f].includes(j) ? 'visible' : 'hidden'}} />)}</div>
                  ))}
                  {[1, 2, 3, 4, 5, 6].map(f => <span key={'c' + f} className={'core f' + f} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="event" id="eventLine" />
      </div>
      <div className="stage" id="stage" dir={ar ? 'rtl' : 'ltr'} />
      {/* pawns are placed and moved by the animation code (ui/board.js layoutPawns, ui/anim.js) */}
      <div className="pawnlayer" id="pawns">
        {V.players.filter(p => !p.bankrupt).map(p => (
          <div key={p.id} className={`pawn${p.id === V.cur && !V.over ? ' cur' : ''}${p.inJail ? ' jailed' : ''}`} id={'pw' + p.id} title={p.name}
            style={{'--pc': p.color} as CSSProperties}>
            <TokenFace key={p.token} token={p.token} />
          </div>
        ))}
      </div>
    </>
  );
}

function TokenFace({token}: {token: number}) {
  const [broken, setBroken] = useState(false);
  const tk = TOKENS[token] || TOKENS[0];
  return broken ? <span className="g">{tk.g}</span> : <img src={tk.piece} srcSet={tk.pieceSet} sizes="(max-width: 520px) 11vw, 80px" alt="" onError={() => setBroken(true)} />;   // ui/board.js layoutPawns sets the exact size
}

function Square({i, V, landed}: {i: number; V: Game; landed: boolean}) {
  const s = SP[i], fx = app.boardFx;
  const pr = isOwnable(i) ? V.props[i] : null;
  const corner = i % 10 === 0;
  let cls = 'cell';
  let body: ReactNode;
  if (corner) {
    cls += ' corner';
    if (s.t === 'go') { cls += ' c-go'; body = <><div className="big">{s.ar}</div><div className="lat">{t('b.goLat')}</div><div className="arrow">←</div><div className="tiny">{t('b.goTiny')}</div></>; }
    else if (s.t === 'jail') { cls += ' c-jail'; body = <><div className="big">{s.ar}</div><div className="bars"><img src={s.art} alt="" /></div><div className="lat">{t('b.jailLat')}</div><div className="tiny">{t('b.jailTiny')}</div></>; }
    else if (s.t === 'parking') { cls += ' c-park'; body = <><div className="big">{s.ar}</div><div className="lat">{t('b.parkLat')}</div><div className="pot" id="pot">{fmt(V.daret)}</div><div className="tiny">{t('b.parkTiny')}</div></>; }
    else { cls += ' c-gojail'; body = <><div className="big">{s.ar}</div><div className="lat">{t('b.gojailLat')}</div><div className="tiny">{t('b.gojailTiny')}</div></>; }
  } else {
    cls += ' s-' + sideOf(i);
    let inner: ReactNode = null;
    if (s.t === 'prop') {
      const houses = fx.houses[i] ?? pr!.houses;
      inner = <>
        <div className="bar" style={{background: GROUPS[s.g].color}} id={'h' + i}><Houses n={houses} pop={fx.pop === i} /></div>
        <div className="art"><img src={s.tile} srcSet={s.tileSet} sizes="(max-width: 520px) 10vw, 70px" alt="" loading="lazy" /></div>
        <div className="body"><div className="nm">{spN(i)}</div><div className="pr">{num(s.price)}</div></div>
      </>;
    }
    else if (s.tile) {
      const label = s.t === 'mektoub' ? t('b.mektoub') : s.t === 'baraka' ? t('b.baraka') : spN(i);
      const sub = s.t === 'rail' || s.t === 'util' ? num(s.price) : s.t === 'tax' ? t('b.pay', {n: num(s.amount)}) : '';
      inner = <>
        <div className="bar" style={{background: s.band || BAND[s.t]}} />
        <div className="art"><img src={s.tile} srcSet={s.tileSet} sizes="(max-width: 520px) 10vw, 70px" alt="" loading="lazy" /></div>
        <div className="body"><div className="nm">{label}</div>{sub && <div className="pr">{sub}</div>}</div>
      </>;
    }
    body = <>{inner}<div className="own" id={'o' + i} style={{background: pr && pr.owner >= 0 ? V.players[pr.owner].color : 'transparent'}} /></>;
  }
  if (landed) cls += ' land';
  if (pr && pr.mort) cls += ' mort';
  return (
    <div className={cls} data-t={s.t} id={'c' + i} style={{gridArea: pos2grid(i).join('/')}} tabIndex={0} role="button" aria-label={spN(i)}
      onClick={() => openDeed(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDeed(i); } }}>
      {body}
    </div>
  );
}

/** the dars on a property, or its riad; the one just built pops */
function Houses({n, pop}: {n: number; pop: boolean}) {
  if (n === 5) return <span className={'riad' + (pop ? ' pop' : '')} />;
  return <>{range(n).map(k => <span key={k} className={'dar' + (pop && k === n - 1 ? ' pop' : '')} />)}</>;
}
