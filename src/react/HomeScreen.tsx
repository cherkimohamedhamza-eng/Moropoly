// The home page: the waving flag, the headline, hosting / playing here / joining, a table with cards and pieces
// on it, the pieces on their shelf, the property marquees, and the features.
import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {hostGame, joinGame} from '../app/online';
import {app} from '../app/state';
import {COLORS, SP, TOKENS} from '../engine/data';
import type {PropSpace} from '../engine/types';
import {range} from '../engine/util';
import {cityN, spN, t, tokN} from '../i18n/core';
import {reduceMotion} from '../ui/dom';
import {renderSetup} from '../ui/setup';
import {installApp, show} from '../ui/view';
import {LangSwitch, Rich} from './common';
import {useRefresh} from './store';

export function HomeScreen() {
  useRefresh();
  const [code, setCode] = useState('');
  const H = app.home;
  return (
    <>
      <div className="home-top">
        <Flag />
        <div className="wm">MOROPOLY<span className="ar">مُوروبولي</span><span className="tif">ⵎⵓⵔⵓⴱⵓⵍⵉ</span></div>
        <div className="sp" />
        <span className="eyebrow">{t('home.players')}</span><LangSwitch />
      </div>
      <div className="hero">
        <div>
          <div className="eyebrow">{t('home.eyebrow')}</div>
          <h1><Rich k="home.h1" p={{}} /></h1>
          <p className="lead">{t('home.lead')}</p>
          <div className="ctas">
            <button className="btn red" id="hostBtn" disabled={!H.canHost} onClick={hostGame}>{t('home.host')}</button>
            <button className="btn" id="localBtn" onClick={() => { show('setup'); renderSetup(); }}>{t('home.local')}</button>
            {H.canInstall && <button className="btn ghost" id="installBtn" onClick={installApp}>{t('home.install')}</button>}
          </div>
          <form className="joinrow" id="joinForm" autoComplete="off" onSubmit={e => { e.preventDefault(); joinGame(code); }}>
            <input className="field" id="joinCode" maxLength={8} dir="ltr" placeholder={t('home.code')} aria-label={t('home.code')} value={code} onChange={e => setCode(e.target.value)} />
            <button className="btn green" type="submit">{t('home.join')}</button>
          </form>
          <div className="note" id="onlineNote">{H.note.map(k => t(k)).join('')}</div>
          <div className="mygames" id="myGames">
            {H.games.map(g => (
              <button key={g.code} className="btn sm" onClick={() => joinGame(g.code)}>
                {t('home.resume', {c: g.code.toUpperCase(), w: g.status === 'lobby' ? t('home.lobby') : t('home.round', {n: g.round})})}
              </button>
            ))}
          </div>
        </div>
        <HeroTable />
      </div>
      <div className="shelf" id="parade">
        {TOKENS.map((tk, k) => <ShelfPiece key={k} k={k} />)}
      </div>
      <Marquee cards={PROPS.slice(0, 11)} />
      <Marquee cards={PROPS.slice(11)} reverse />
      <div className="feats">
        {FEATS.map(f => (
          <div key={f.k} className="feat"><div className="k" style={{color: f.color}}>{f.ar}</div><h3>{t('feat.' + f.k)}</h3><p>{t('feat.' + f.k + 'P')}</p></div>
        ))}
      </div>
      <div className="sketch">
        <img src="assets/board.webp" alt="Moropoly board concept sketch" />
        <div><div className="eyebrow">{t('sk.eyebrow')}</div><h2 className="h2">{t('sk.h2')}</h2><p className="muted">{t('sk.p')}</p></div>
      </div>
    </>
  );
}

const FEATS = [
  {k: 'dlala', ar: 'الدلالة', color: '#c1272d'},
  {k: 'daret', ar: 'دارت', color: '#0a7a43'},
  {k: 'cards', ar: 'مكتوب · بركة', color: '#8a5a2b'},
  {k: 'jail', ar: 'عكاشة', color: '#c1272d'},
];

/** one of the pieces standing on the shelf, with its name; shows its emoji if the picture does not load */
function ShelfPiece({k}: {k: number}) {
  const [broken, setBroken] = useState(false);
  const name = tokN(k);
  return (
    <div className="sp-piece" title={name} style={{animationDelay: `${(k * 0.31).toFixed(2)}s`}}>
      <div className="fig">{broken ? <span className="g">{TOKENS[k].g}</span> : <img src={TOKENS[k].piece} srcSet={TOKENS[k].pieceSet} sizes="96px" alt={name} onError={() => setBroken(true)} />}</div>
      <span>{name}</span>
    </div>
  );
}

/* ---------- the table in the hero: three property cards fanned out, and pieces standing in front of them ---------- */
const HERO_CARDS = [32, 26, 39];                          // Jemaa el-Fna, Hassan Tower (in front), Ain Diab
const HERO_PIECES = [{k: 0, c: COLORS[0]}, {k: 10, c: COLORS[1]}, {k: 3, c: COLORS[3]}, {k: 5, c: COLORS[4]}];
function HeroTable() {
  return (
    <div className="hero-table" aria-hidden="true">
      <div className="ht-cards">
        {HERO_CARDS.map((i, n) => <img key={i} className={'ht-card c' + n} src={SP[i].art} alt="" />)}
      </div>
      <div className="ht-pieces">
        {HERO_PIECES.map(({k, c}, n) => (
          <div key={k} className="ht-piece" style={{'--pc': c, animationDelay: `${n * 0.4}s`} as CSSProperties}>
            <img src={TOKENS[k].piece} srcSet={TOKENS[k].pieceSet} sizes="(max-width: 900px) 22vw, 140px" alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- property marquees ---------- */
const PROPS = SP.map((s, i) => ({s, i})).filter((o): o is {s: PropSpace; i: number} => o.s.t === 'prop');
function Marquee({cards, reverse}: {cards: typeof PROPS; reverse?: boolean}) {
  // each row is drawn twice so it can scroll without a gap
  return (
    <div className={`marquee${reverse ? ' rev' : ''}`}>
      <div className="track">
        {[...cards, ...cards].map((o, k) => (
          <div key={k} className="mcard">
            <img src={o.s.art} alt={spN(o.i) + ' · ' + cityN(o.s.g)} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- the flag, waving on a canvas ---------- */
function Flag() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const x = cv.getContext('2d')!; const W = cv.width, H = cv.height;
    const off = document.createElement('canvas'); const fw = W - 24, fh = H - 28; off.width = fw; off.height = fh; const o = off.getContext('2d')!;
    o.fillStyle = '#c1272d'; o.fillRect(0, 0, fw, fh);
    const cx = fw / 2, cy = fh / 2, R = fh * 0.32;
    const pts = range(5).map(k => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R] as const; });
    o.strokeStyle = '#006233'; o.lineWidth = R * 0.13; o.lineJoin = 'miter'; o.beginPath();
    [0, 2, 4, 1, 3, 0].forEach((k, j) => (j ? o.lineTo(...pts[k]) : o.moveTo(...pts[k]))); o.closePath(); o.stroke();
    const t0 = performance.now(), rm = reduceMotion();
    let stopped = false, timer = 0, raf = 0;
    const frame = (now: number) => {
      if (stopped) return;
      const t = (now - t0) / 1000; x.clearRect(0, 0, W, H);
      const pg = x.createLinearGradient(0, 0, 8, 0); pg.addColorStop(0, '#8f97a2'); pg.addColorStop(0.5, '#f4f6f9'); pg.addColorStop(1, '#7f8792');
      x.fillStyle = pg; x.fillRect(6, 4, 6, H - 6); x.beginPath(); x.arc(9, 5, 4.5, 0, 7); x.fillStyle = '#e7eaee'; x.fill();
      for (let i = 0; i < fw; i += 2) {
        const k = i / fw, ph = t * 3.2 - i * 0.06, dy = rm ? 0 : Math.sin(ph) * 5 * k, sh = rm ? 0 : Math.cos(ph) * 0.16 * k;
        x.drawImage(off, i, 0, 2, fh, 12 + i, 10 + dy, 2, fh);
        x.fillStyle = sh > 0 ? `rgba(255,255,255,${sh})` : `rgba(0,0,0,${-sh})`; x.fillRect(12 + i, 10 + dy, 2, fh);
      }
      if (rm) return;
      // waves only while the home page is showing; checks back twice a second otherwise
      if (!document.getElementById('home')!.hidden) raf = requestAnimationFrame(frame);
      else timer = window.setTimeout(() => { raf = requestAnimationFrame(frame); }, 500);
    };
    raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); clearTimeout(timer); };
  }, []);
  return <canvas id="flag" ref={ref} width={168} height={116} aria-label={t('aria.flag')} />;
}
