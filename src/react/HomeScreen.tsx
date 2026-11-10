// The home page: the waving flag, the headline, hosting / playing here / joining, the map of Morocco with
// the train, the token parade, the property marquees, and the features.
import {useEffect, useRef, useState} from 'react';
import {hostGame, joinGame} from '../app/online';
import {app} from '../app/state';
import {GROUPS, SP, TOKENS} from '../engine/data';
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
        <div className="hero-map"><MoroccoMap /></div>
      </div>
      <div className="parade" id="parade">
        {TOKENS.map((tk, k) => <ParadeCoin key={k} k={k} />)}
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
  {k: 'dlala', ar: 'الدلالة', color: 'var(--red-hi)'},
  {k: 'daret', ar: 'دارت', color: 'var(--green-hi)'},
  {k: 'cards', ar: 'مكتوب · بركة', color: 'var(--silver-hi)'},
  {k: 'jail', ar: 'عكاشة', color: 'var(--red-hi)'},
];

/** a token in the parade; shows its emoji if the picture does not load */
function ParadeCoin({k}: {k: number}) {
  const [broken, setBroken] = useState(false);
  const name = tokN(k);
  return (
    <div className="coin" style={{animationDelay: `${(k * 0.27).toFixed(2)}s`}} title={name}>
      {broken ? <span className="g">{TOKENS[k].g}</span> : <img src={TOKENS[k].img} alt={name} onError={() => setBroken(true)} />}
      <span>{name}</span>
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
            <img src={o.s.art} alt={spN(o.i)} loading="lazy" />
            <i className="bar" style={{background: GROUPS[o.s.g].color}} />
            <div className="cap" dir="auto">{spN(o.i)} · {cityN(o.s.g)}</div>
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

/* ---------- the map, with the cities and the train between them ---------- */
const COAST: [number, number][] = [[-5.92,35.79],[-5.6,35.84],[-5.4,35.92],[-5.32,35.86],[-5.33,35.68],[-5.1,35.45],[-4.67,35.21],[-4.3,35.17],[-3.93,35.25],[-3.55,35.22],[-3.0,35.42],[-2.93,35.18],[-2.6,35.12],[-2.21,35.1],
 [-1.8,34.92],[-1.75,34.5],[-1.68,33.8],[-1.55,32.75],[-1.2,32.4],[-1.18,32.1],[-2.25,31.85],[-3.65,31.65],[-3.83,31.2],[-4.5,30.6],[-5.0,29.98],[-5.6,29.6],[-6.5,29.45],[-7.6,29.38],[-8.67,28.7],[-8.67,27.67],
 [-8.67,26.0],[-12.0,26.0],[-12.0,23.45],[-13.0,21.33],[-16.95,21.33],[-17.05,20.85],[-16.98,21.4],[-16.9,21.9],[-16.5,22.4],[-16.2,23.0],[-15.95,23.7],[-15.3,24.3],[-14.9,24.8],[-14.48,26.13],[-13.95,26.6],[-13.4,27.1],[-12.92,27.94],
 [-11.9,28.2],[-11.33,28.5],[-10.6,28.95],[-10.17,29.38],[-9.85,29.83],[-9.62,30.42],[-9.89,30.63],[-9.83,31.0],[-9.77,31.51],[-9.24,32.3],[-9.27,32.55],[-8.5,33.25],[-7.59,33.6],[-7.38,33.69],[-6.84,34.02],[-6.68,34.26],[-6.29,34.88],[-6.16,35.19],[-6.03,35.46],[-5.92,35.79]];
const CITIES = [
  {n: 'Tangier', fr: 'Tanger', a: 'طنجة', p: [-5.81, 35.77], dx: -58, dy: -8},
  {n: 'Chefchaouen', a: 'شفشاون', p: [-5.27, 35.17], dx: 9, dy: 4},
  {n: 'Fès', a: 'فاس', p: [-5.0, 34.03], dx: 9, dy: 4},
  {n: 'Rabat · Salé', a: 'الرباط', p: [-6.84, 34.02], dx: -86, dy: -12},
  {n: 'Casablanca', a: 'الدار البيضاء', p: [-7.59, 33.57], dx: -82, dy: 18},
  {n: 'Marrakech', a: 'مراكش', p: [-7.99, 31.63], dx: 9, dy: 4},
  {n: 'Agadir', a: 'أكادير', p: [-9.6, 30.42], dx: -56, dy: 6},
  {n: 'Lagouira', fr: 'Lagouira', a: 'الكويرة', p: [-17.05, 20.9], dx: 9, dy: 4},
] as {n: string; fr?: string; a: string; p: [number, number]; dx: number; dy: number}[];
function proj([lo, la]: [number, number]) { const k = 27, c = Math.cos(29 * Math.PI / 180); return [((lo + 17.3) * c) * k + 14, (36.2 - la) * k + 10]; }
const LAND = COAST.map((pt, i) => (i ? 'L' : 'M') + proj(pt).map(v => v.toFixed(1)).join(',')).join('') + 'Z';
const ROUTE = ['Tangier', 'Rabat · Salé', 'Casablanca', 'Marrakech'].map(n => proj(CITIES.find(c => c.n === n)!.p));
const ROUTE_D = 'M' + ROUTE.map(p => p.map(v => v.toFixed(1)).join(',')).join('L');

function MoroccoMap() {
  const rm = reduceMotion();
  return (
    <svg id="map" viewBox="0 0 420 450" role="img" aria-label={t('aria.map')}>
      <defs>
        <linearGradient id="landGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2a3038" /><stop offset=".5" stopColor="#1b2027" /><stop offset="1" stopColor="#262c34" /></linearGradient>
        <radialGradient id="glow" cx=".55" cy=".25" r=".7"><stop offset="0" stopColor="#17a862" stopOpacity=".25" /><stop offset="1" stopColor="#17a862" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x="0" y="0" width="420" height="450" fill="url(#glow)" />
      <path className="map-land" pathLength={1} d={LAND} />
      <path className="map-route" d={ROUTE_D} />
      {CITIES.map((c, i) => {
        const [x, y] = proj(c.p);
        return (
          <g key={c.n} className="city" style={{animationDelay: `${1.6 + i * 0.18}s`}}>
            <circle className="pulse" cx={x} cy={y} r="5" style={{animationDelay: `${i * 0.35}s`}} />
            <circle className="dot" cx={x} cy={y} r="3.4" />
            {app.LANG === 'ar'
              ? <text x={x + c.dx + (c.dx < 0 ? 30 : 0)} y={y + c.dy + 6} style={{fontFamily: 'var(--f-ar)', fontSize: '12.5px'}}>{c.a}</text>
              : <><text x={x + c.dx} y={y + c.dy}>{(app.LANG === 'fr' && c.fr) || c.n}</text><text className="ar" x={x + c.dx} y={y + c.dy + 12}>{c.a}</text></>}
          </g>
        );
      })}
      <g className="train" transform={rm ? `translate(${ROUTE[0][0]},${ROUTE[0][1]})` : undefined}>
        <circle r="7" fill="#f4f6f9" stroke="#e8474d" strokeWidth="2.5" />
        <text textAnchor="middle" y="3.5" fontSize="8">🚄</text>
        {!rm && <animateMotion dur="7s" repeatCount="indefinite" path={ROUTE_D} keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="linear" />}
      </g>
    </svg>
  );
}
