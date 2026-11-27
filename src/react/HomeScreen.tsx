// The Moropoly Salon home page: full-width walnut & emerald-felt tabletop hero with a 7-card royal fan
// and flanking 3D pieces, an interactive 8-city cream-paper dossier, a Classic 40 / Grand 52 + Chrika bento,
// an interactive 11-piece 3D token showcase, and a full-size card lightbox.
import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {hostGame, joinGame} from '../app/online';
import {app} from '../app/state';
import {COLORS, GROUPS, SP_GRAND, TOKENS} from '../engine/data';
import type {GroupId, PropSpace} from '../engine/types';
import {range} from '../engine/util';
import {cityN, fmt, noteN, spN, t, tokN} from '../i18n/core';
import {reduceMotion} from '../ui/dom';
import {renderSetup} from '../ui/setup';
import {installApp, show} from '../ui/view';
import {LangSwitch, Modal, Rich} from './common';
import {useRefresh} from './store';

const GRAND_HINT = {settings: {board: 'grand' as const}};
const PROPS = SP_GRAND.map((s, i) => ({s, i})).filter((o): o is {s: PropSpace; i: number} => o.s.t === 'prop');
const GROUP_IDS = Object.keys(GROUPS) as GroupId[];
const STAR_PATH = 'M0,-0.95L0.56,0.77L-0.9,-0.29H0.9L-0.56,0.77Z';
const GRAND_NEW_IDS = new Set(['marina', 'outa', 'boujeloud', 'taghazout', 'spartel', 'oudayas', 'majorelle', 'anfa']);

const propById = (id: string) => PROPS.find(p => p.s.id === id) || PROPS[0];
const spaceById = (id: string) => SP_GRAND.find(s => s.id === id)!;

// 7 iconic modern-Morocco cards forming the hero royal arc
const ROYAL_IDS = ['06', '13', '19', '26', '32', 'majorelle', '37'];
const LEFT_PIECES = [{k: 0, c: COLORS[0]}, {k: 10, c: COLORS[1]}];
const RIGHT_PIECES = [{k: 3, c: COLORS[3]}, {k: 5, c: COLORS[4]}];
const GRAND_FAN_IDS = ['marina', 'majorelle', 'spartel', 'fuel', 'peage'];
const CLASSIC_FAN_IDS = ['06', '14', '26', '32', '39'];

function openSetup(board?: 'classic' | 'grand') {
  (app as unknown as {setupBoard?: 'classic' | 'grand'}).setupBoard = board;
  show('setup');
  renderSetup();
}

export function HomeScreen() {
  useRefresh();
  const [code, setCode] = useState('');
  const [city, setCity] = useState<GroupId>('green'); // Marrakech featured by default
  const [boardTab, setBoardTab] = useState<'grand' | 'classic'>('grand');
  const [activeToken, setActiveToken] = useState<number>(0); // Red petit taxi
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const H = app.home;

  const cityCards = PROPS.filter(p => p.s.g === city);
  const cityInfo = GROUPS[city];
  const previewItem = previewIdx != null ? PROPS[previewIdx] : null;
  const openProp = (i: number) => {
    const k = PROPS.findIndex(p => p.i === i);
    if (k >= 0) setPreviewIdx(k);
  };
  const minPrice = Math.min(...cityCards.map(c => c.s.price));
  const maxPrice = Math.max(...cityCards.map(c => c.s.price));
  const maxRiad = Math.max(...cityCards.map(c => c.s.rent[5]));

  return (
    <div className="salon">
      {/* ---------- TOP NAV ---------- */}
      <header className="salon-nav">
        <Flag />
        <div className="wm">MOROPOLY<span className="ar">مُوروبولي</span><span className="tif">ⵎⵓⵔⵓⴱⵓⵍⵉ</span></div>
        <div className="sp" />
        <span className="home-pill">{t('home.players')}</span>
        <LangSwitch />
      </header>

      {/* ---------- GRAND TABLETOP HERO ---------- */}
      <section className="salon-hero">
        <div className="sh-felt">
          <svg className="sh-star" viewBox="-1 -1 2 2" aria-hidden="true"><path d={STAR_PATH} fill="none" strokeWidth=".035" strokeLinejoin="miter" /></svg>

          <div className="sh-head">
            <div className="sh-eyebrow">{t('home.eyebrow')}</div>
            <h1><Rich k="home.h1" p={{}} /></h1>
            <p className="sh-lead">{t('home.lead')}</p>
          </div>

          <div className="royal-fan">
            {ROYAL_IDS.map((id, n) => {
              const o = propById(id);
              return (
                <button key={id} type="button" className={'rf-card c' + n} onClick={() => openProp(o.i)} aria-label={spN(o.i, GRAND_HINT)}>
                  <img src={o.s.art} alt={spN(o.i, GRAND_HINT)} />
                </button>
              );
            })}
          </div>

          <div className="sh-stage-foot">
            <div className="sh-flank left" aria-hidden="true">
              {LEFT_PIECES.map(({k, c}, n) => (
                <div key={k} className="sh-piece" style={{'--pc': c, animationDelay: `${n * 0.45}s`} as CSSProperties}>
                  <img src={TOKENS[k].piece} srcSet={TOKENS[k].pieceSet} sizes="110px" alt="" />
                </div>
              ))}
            </div>

            <div className="salon-dock">
              <div className="dock-primary">
                <button className="btn red lg" id="hostBtn" disabled={!H.canHost} onClick={hostGame}>{t('home.host')}</button>
                <button className="btn cream lg" id="localBtn" onClick={() => openSetup()}>{t('home.local')}</button>
                {H.canInstall && <button className="btn ghost" id="installBtn" onClick={installApp}>{t('home.install')}</button>}
              </div>

              <div className="dock-sub">
                <form className="joinrow" id="joinForm" autoComplete="off" onSubmit={e => { e.preventDefault(); joinGame(code); }}>
                  <input className="field" id="joinCode" maxLength={8} dir="ltr" placeholder={t('home.code')} aria-label={t('home.code')} value={code} onChange={e => setCode(e.target.value)} />
                  <button className="btn green" type="submit">{t('home.join')}</button>
                </form>
                {H.games.length > 0 && (
                  <div className="mygames" id="myGames">
                    {H.games.map(g => (
                      <button key={g.code} className="btn sm gold" onClick={() => joinGame(g.code)}>
                        {t('home.resume', {c: g.code.toUpperCase(), w: g.status === 'lobby' ? t('home.lobby') : t('home.round', {n: g.round})})}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="note" id="onlineNote">{H.note.map(k => t(k)).join('')}</div>
            </div>

            <div className="sh-flank right" aria-hidden="true">
              {RIGHT_PIECES.map(({k, c}, n) => (
                <div key={k} className="sh-piece" style={{'--pc': c, animationDelay: `${(n + 2) * 0.45}s`} as CSSProperties}>
                  <img src={TOKENS[k].piece} srcSet={TOKENS[k].pieceSet} sizes="110px" alt="" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- INTERACTIVE 8-CITY BOARD ROUTE & CREAM DOSSIER ---------- */}
      <section className="atlas-sec">
        <div className="sec-head">
          <div>
            <div className="eyebrow">{t('home.galleryEyebrow')}</div>
            <h2 className="h2">{t('home.atlasTitle')}</h2>
          </div>
          <span className="muted" style={{fontSize: 13}}>{t('home.galleryHint')}</span>
        </div>

        <div className="city-strip" role="tablist" aria-label={t('home.atlasTitle')}>
          {GROUP_IDS.map(g => {
            const count = PROPS.filter(p => p.s.g === g).length;
            const on = city === g;
            return (
              <button key={g} type="button" role="tab" aria-selected={on} className={`tile-tab${on ? ' on' : ''}`} onClick={() => setCity(g)}>
                <span className="tt-band" style={{background: GROUPS[g].color}} />
                <span className="tt-body">
                  <span className="tt-ar">{GROUPS[g].ar}</span>
                  {app.LANG !== 'ar' && <span className="tt-nm">{cityN(g)}</span>}
                  <span className="tt-cnt">{t('home.streetsCount', {n: count})}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="dossier">
          <div className="dossier-in">
            <div className="dossier-hd" style={{'--cc': cityInfo.color} as CSSProperties}>
              <div className="dh-title">
                <span className="dh-dot" style={{background: cityInfo.color}} />
                <div>
                  <div className="dh-ar">{cityInfo.ar}</div>
                  {app.LANG !== 'ar' && <h3>{cityN(city)}</h3>}
                </div>
              </div>
              <div className="dh-stats">
                <div><span>{t('home.cityPrices')}</span><b>{fmt(minPrice)} – {fmt(maxPrice)}</b></div>
                <div><span>{t('home.cityDar')}</span><b>{fmt(cityInfo.house)}</b></div>
                <div><span>{t('home.cityMaxRent')}</span><b>{fmt(maxRiad)}</b></div>
              </div>
            </div>

            <div className={`dossier-cards n${cityCards.length}`}>
              {cityCards.map(o => {
                const isNew = !!o.s.id && GRAND_NEW_IDS.has(o.s.id);
                return (
                  <button key={o.i} type="button" className="dcard" onClick={() => openProp(o.i)}>
                    <div className="dcard-img">
                      <img src={o.s.art} alt={spN(o.i, GRAND_HINT)} loading="lazy" />
                      {isNew && <span className="dcard-badge">52</span>}
                    </div>
                    <div className="dcard-meta">
                      <b>{spN(o.i, GRAND_HINT)}</b>
                      <span>{fmt(o.s.price)}</span>
                    </div>
                    <p>{noteN(o.i, GRAND_HINT)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="ribbon-wrap">
          <div className="marquee">
            <div className="track">
              {[...PROPS, ...PROPS].map((o, k) => (
                <button key={k} type="button" className="mcard" onClick={() => openProp(o.i)} aria-label={spN(o.i, GRAND_HINT)}>
                  <img src={o.s.art} alt={spN(o.i, GRAND_HINT)} loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- ASYMMETRIC GAMEPLAY BENTO: MAPS + CHRIKA + 4 MOROCCAN RULES ---------- */}
      <section className="bento-sec">
        <div className="bento-top">
          <article className="bcard bcard-maps">
            <div className="bc-head">
              <div>
                <div className="spot-kicker">
                  <span className="spot-tag green">{t('home.newTag')}</span>
                  <span className="spot-ar">{boardTab === 'grand' ? 'خريطة 52 خانة' : 'خريطة 40 خانة'}</span>
                </div>
                <h2>{boardTab === 'grand' ? t('home.grandTitle') : t('home.classicTitle')}</h2>
              </div>
              <div className="seg" role="tablist">
                <button type="button" role="tab" aria-pressed={boardTab === 'classic'} onClick={() => setBoardTab('classic')}>40</button>
                <button type="button" role="tab" aria-pressed={boardTab === 'grand'} onClick={() => setBoardTab('grand')}>52</button>
              </div>
            </div>

            <div className="bc-map-stage">
              <svg className="spot-star" viewBox="-1 -1 2 2" aria-hidden="true"><path d={STAR_PATH} fill="none" strokeWidth=".045" strokeLinejoin="miter" /></svg>
              <div className="spot-fan">
                {(boardTab === 'grand' ? GRAND_FAN_IDS : CLASSIC_FAN_IDS).map((id, n) => {
                  const sp = spaceById(id);
                  const idx = SP_GRAND.indexOf(sp);
                  return (
                    <button key={boardTab + id} type="button" className={'sf-card c' + n} onClick={() => sp.t === 'prop' && openProp(idx)} aria-label={spN(idx, GRAND_HINT)}>
                      <img src={sp.art} alt={spN(idx, GRAND_HINT)} loading="lazy" />
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="bc-desc">{boardTab === 'grand' ? t('home.grandDesc') : t('home.classicDesc')}</p>
            <div className="bc-foot">
              <div className="spot-chips">
                {boardTab === 'grand' ? (
                  <><span>{t('home.grandChip1')}</span><span>{t('home.grandChip2')}</span><span>{t('home.grandChip3')}</span></>
                ) : (
                  <><span>{t('home.classicChip1')}</span><span>{t('home.classicChip2')}</span><span>{t('home.classicChip3')}</span></>
                )}
              </div>
              <button className="btn green sm" onClick={() => openSetup(boardTab)}>
                {boardTab === 'grand' ? t('home.playGrand') : t('home.playClassic')}
              </button>
            </div>
          </article>

          <article className="bcard bcard-chrika">
            <div className="bc-chrika-stage">
              <div className="spot-pact">
                <button type="button" className="sp-card left" onClick={() => openProp(propById('31').i)} aria-label={spN(propById('31').i, GRAND_HINT)}>
                  <img src={propById('31').s.art} alt="" loading="lazy" />
                </button>
                <div className="sp-crest" aria-hidden="true">
                  <span className="sp-crest-top">✦ {t('btn.chrika')}</span>
                  <span className="sp-crest-mid">60 / 40</span>
                  <span className="sp-crest-bot">{t('badge.gheddar')}</span>
                </div>
                <button type="button" className="sp-card right" onClick={() => openProp(propById('32').i)} aria-label={spN(propById('32').i, GRAND_HINT)}>
                  <img src={propById('32').s.art} alt="" loading="lazy" />
                </button>
              </div>
            </div>
            <div className="bc-chrika-body">
              <div className="spot-kicker"><span className="spot-tag gold">{t('home.newTag')}</span><span className="spot-ar">الشركة والغدر</span></div>
              <h2>{t('home.chrikaTitle')}</h2>
              <p className="bc-desc">{t('home.chrikaDesc')}</p>
              <ol className="chrika-steps">
                <li><b>1</b><span>{t('home.chrikaStep1')}</span></li>
                <li><b>2</b><span>{t('home.chrikaStep2')}</span></li>
                <li><b>3</b><span>{t('home.chrikaStep3')}</span></li>
              </ol>
              <button className="btn gold sm" onClick={() => openSetup('grand')}>{t('home.tryChrika')}</button>
            </div>
          </article>
        </div>

        <div className="feats">
          {FEATS.map(f => (
            <div key={f.k} className="feat">
              <div className="feat-top">
                <div className="k" style={{color: f.color}}>{f.ar}</div>
                {f.art && <img className="feat-art" src={f.art} alt="" loading="lazy" />}
              </div>
              <h3>{t('feat.' + f.k)}</h3>
              <p>{t('feat.' + f.k + 'P')}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- INTERACTIVE 11-PIECE 3D TOKEN STAGE ---------- */}
      <section className="tokens-sec">
        <div className="sec-head">
          <div>
            <div className="eyebrow">{t('home.piecesEyebrow')}</div>
            <h2 className="h2">{t('home.piecesTitle')}</h2>
          </div>
          <span className="muted" style={{fontSize: 13}}>{t('home.piecesHint')}</span>
        </div>

        <div className="token-stage">
          <div className="ts-spot">
            <div className="ts-pedestal" style={{'--pc': COLORS[activeToken % COLORS.length]} as CSSProperties}>
              <img key={activeToken} src={TOKENS[activeToken].piece} srcSet={TOKENS[activeToken].pieceSet} sizes="220px" alt={tokN(activeToken)} />
            </div>
            <div className="ts-label">
              <span className="ts-num">{String(activeToken + 1).padStart(2, '0')} / {TOKENS.length}</span>
              <h3>{tokN(activeToken)}</h3>
            </div>
          </div>

          <div className="ts-shelf" id="parade">
            {TOKENS.map((tk, k) => (
              <button
                key={k}
                type="button"
                className={`ts-item${activeToken === k ? ' on' : ''}`}
                onClick={() => setActiveToken(k)}
                onMouseEnter={() => setActiveToken(k)}
              >
                <div className="fig">
                  <img src={tk.piece} srcSet={tk.pieceSet} sizes="96px" alt={tokN(k)} loading="lazy" />
                </div>
                <span>{tokN(k)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CLOSING INVITATION ---------- */}
      <footer className="salon-foot">
        <div className="sf-text">
          <div className="wm">MOROPOLY<span className="ar">مُوروبولي</span></div>
          <p className="muted">{t('home.footLead')}</p>
        </div>
        <div className="ctas">
          <button className="btn red" disabled={!H.canHost} onClick={hostGame}>{t('home.host')}</button>
          <button className="btn cream" onClick={() => openSetup('grand')}>{t('home.playGrand')}</button>
        </div>
      </footer>

      {/* ---------- FULL-SIZE CARD LIGHTBOX ---------- */}
      {previewItem && previewIdx != null && (
        <Modal
          title={`${cityN(previewItem.s.g)} · ${spN(previewItem.i, GRAND_HINT)}`}
          onClose={() => setPreviewIdx(null)}
          footer={
            <>
              <button className="btn ghost sm" onClick={() => setPreviewIdx((previewIdx + PROPS.length - 1) % PROPS.length)}>← {t('gd.back')}</button>
              <span className="muted" style={{fontSize: 12.5, marginInline: 'auto'}}>{previewIdx + 1} / {PROPS.length}</span>
              <button className="btn ghost sm" onClick={() => setPreviewIdx((previewIdx + 1) % PROPS.length)}>{t('gd.next')} →</button>
            </>
          }
        >
          <div className="home-lightbox">
            <img src={previewItem.s.art} alt={spN(previewItem.i, GRAND_HINT)} />
            <div className="hlb-info">
              <div className="hlb-city"><i style={{background: GROUPS[previewItem.s.g].color}} />{cityN(previewItem.s.g)} · {fmt(previewItem.s.price)}</div>
              <p className="muted" style={{margin: 0}}>{noteN(previewItem.i, GRAND_HINT)}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const FEATS = [
  {k: 'dlala', ar: 'الدلالة', color: '#c1272d', art: 'assets/art-04-112.webp'},
  {k: 'daret', ar: 'دارت', color: '#0a7a43', art: 'assets/art-38-112.webp'},
  {k: 'cards', ar: 'مكتوب · بركة', color: '#8a5a2b', art: 'assets/art-mektoub-112.webp'},
  {k: 'jail', ar: 'عكاشة', color: '#c1272d', art: 'assets/art-30-112.webp'},
];

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
      if (!document.getElementById('home')!.hidden) raf = requestAnimationFrame(frame);
      else timer = window.setTimeout(() => { raf = requestAnimationFrame(frame); }, 500);
    };
    raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); clearTimeout(timer); };
  }, []);
  return <canvas id="flag" ref={ref} width={168} height={116} aria-label={t('aria.flag')} />;
}
