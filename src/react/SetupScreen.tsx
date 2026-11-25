// Setting up a game on this device: compact single-screen Salon setup with visual 40/52 board picker,
// quick pace & presets, walnut players table, expandable House Rules modal, and launch bar.
import {useEffect, useState, type CSSProperties} from 'react';
import {app} from '../app/state';
import {COLORS, TOKENS} from '../engine/data';
import type {Settings} from '../engine/types';
import {t, tokN} from '../i18n/core';
import {lsGet} from '../lib/storage';
import {goHome} from '../ui/home';
import {resumeLocal, startLocal} from '../ui/setup';
import {BackButton, LangSwitch, Modal, RulesOptions, TokenGrid} from './common';
import {useRefresh} from './store';

interface SeatDraft { name: string; token: number; human: boolean; on: boolean }
const NAMES = ['Hamza', 'Salma', 'Youssef', 'Imane', 'Karim', 'Nadia', 'Omar', 'Zineb'];
const START_TOKENS = [0, 10, 3, 1, 4, 5, 2, 9];
const STAR_PATH = 'M0,-0.95L0.56,0.77L-0.9,-0.29H0.9L-0.56,0.77Z';

const FULL_PRESET: Partial<Settings> = {
  cash: 15000, salary: 2000, fine: 500, goDouble: false, fairStart: true, credit: true, solidarity: false, deeds: false,
  daret: true, dlala: true, riadNow: true, jailRent: true, shufa: true, bills: true, train: true, chrika: true,
};
const PURE_PRESET: Partial<Settings> = {
  cash: 15000, salary: 2000, fine: 500, goDouble: false, fairStart: false, credit: false, solidarity: false, deeds: false,
  daret: true, dlala: true, riadNow: false, jailRent: true, shufa: false, bills: false, train: false, chrika: false,
};
const RICH_PRESET: Partial<Settings> = {
  cash: 30000, salary: 3000, fine: 500, goDouble: true, fairStart: true, credit: true, solidarity: true, deeds: true,
  daret: true, dlala: true, riadNow: true, jailRent: true, shufa: true, bills: true, train: true, chrika: true,
};

export function SetupScreen() {
  useRefresh();
  const [seats, setSeats] = useState<SeatDraft[]>(() => NAMES.map((n, i) => ({name: n, token: START_TOKENS[i], human: i === 0, on: i < 4})));
  const [opts, setOpts] = useState<Settings>({
    board: 'classic', daret: true, dlala: true, rounds: 25, fast: false, timer: 0,
    fairStart: true, credit: true, shufa: true, bills: true, train: true, chrika: true,
  });
  const [picking, setPicking] = useState<number | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const wantBoard = (app as unknown as {setupBoard?: 'classic' | 'grand'}).setupBoard;
  useEffect(() => {
    if (wantBoard) {
      setOpts(o => ({...o, board: wantBoard}));
      delete (app as unknown as {setupBoard?: 'classic' | 'grand'}).setupBoard;
    }
  }, [wantBoard]);

  const set = (patch: Partial<Settings>) => setOpts(o => ({...o, ...patch}));
  const edit = (i: number, patch: Partial<SeatDraft>) => setSeats(s => s.map((x, j) => (j === i ? {...x, ...patch} : x)));
  const pick = (k: number) => {
    const i = picking!;
    setSeats(s => {
      const other = s.findIndex((x, j) => j !== i && x.token === k);
      return s.map((x, j) => (j === i ? {...x, token: k} : j === other ? {...x, token: s[i].token} : x));
    });
    setPicking(null);
  };
  const setCount = (n: number) => setSeats(s => {
    const active = s.map((x, i) => ({x, i})).filter(o => o.x.on).map(o => o.i);
    if (active.length === n) return s;
    if (active.length > n) {
      const keep = new Set(active.slice(0, n));
      return s.map((x, i) => ({...x, on: keep.has(i)}));
    }
    const next = [...s];
    for (let i = 0; i < next.length && active.length < n; i++) {
      if (!next[i].on) { next[i] = {...next[i], on: true}; active.push(i); }
    }
    return next;
  });
  const addSeat = () => setSeats(s => {
    const idx = s.findIndex(x => !x.on);
    return idx < 0 ? s : s.map((x, j) => (j === idx ? {...x, on: true} : x));
  });

  const activeSeats = seats.map((s, i) => ({s, i})).filter(x => x.s.on);
  const playing = activeSeats.length;
  const humans = activeSeats.filter(x => x.s.human).length;
  const isGrand = opts.board === 'grand';
  const saved = lsGet('moropoly.local.v2');
  const canResume = !!(saved && saved.status === 'play' && !saved.over);
  const activeRuleCount = [
    !!opts.chrika, !!opts.daret, !!opts.dlala, opts.riadNow !== false, opts.jailRent !== false,
    !!opts.shufa, !!opts.bills, !!opts.train, !!opts.goDouble, !!opts.fairStart, !!opts.credit, !!opts.solidarity, !!opts.deeds,
  ].filter(Boolean).length;

  const matchPreset = (p: Partial<Settings>) =>
    (['credit', 'shufa', 'chrika', 'deeds', 'goDouble', 'fairStart'] as const).every(k => !!opts[k] === !!p[k])
    && (opts.cash ?? 15000) === (p.cash ?? 15000);

  return (
    <div className="setup-salon">
      {/* ---------- TOP BAR ---------- */}
      <header className="setup-nav">
        <BackButton onClick={goHome} />
        <div className="wm" style={{fontSize: 16}}>MOROPOLY<span className="ar">مُوروبولي</span></div>
        <div className="sp" />
        <span className="home-pill">{t('setup.eyebrow')}</span>
        <LangSwitch />
      </header>

      {/* ---------- COMPACT BOARD & PACE STAGE ---------- */}
      <section className="setup-stage">
        <div className="ss-felt">
          <svg className="ss-star" viewBox="-1 -1 2 2" aria-hidden="true"><path d={STAR_PATH} fill="none" strokeWidth=".04" strokeLinejoin="miter" /></svg>
          <div className="ss-grid">
            <div className="ss-boards">
              <div className="board-cards" role="radiogroup" aria-label={t('opt.board')}>
                <button type="button" role="radio" aria-checked={!isGrand} className={`bpick${!isGrand ? ' on' : ''}`} onClick={() => set({board: 'classic'})}>
                  <div className="bp-top">
                    <span className="bp-num">40</span>
                    <div>
                      <b>{t('setup.classicName')}</b>
                      <span className="bp-sub">{t('setup.classicMeta')}</span>
                    </div>
                  </div>
                  <div className="bp-cards" aria-hidden="true">
                    <img src="assets/card-26.webp" alt="" />
                    <img src="assets/card-32.webp" alt="" />
                    <img src="assets/card-37.webp" alt="" />
                  </div>
                </button>

                <button type="button" role="radio" aria-checked={isGrand} className={`bpick grand${isGrand ? ' on' : ''}`} onClick={() => set({board: 'grand'})}>
                  <span className="bp-new">{t('home.newTag')}</span>
                  <div className="bp-top">
                    <span className="bp-num">52</span>
                    <div>
                      <b>{t('setup.grandName')}</b>
                      <span className="bp-sub">{t('setup.grandMeta')}</span>
                    </div>
                  </div>
                  <div className="bp-cards" aria-hidden="true">
                    <img src="assets/card-majorelle.webp" alt="" />
                    <img src="assets/card-spartel.webp" alt="" />
                    <img src="assets/card-fuel.webp" alt="" />
                  </div>
                </button>
              </div>
            </div>

            <div className="ss-pace">
              <div className="pace-row">
                <span className="pace-lbl">{t('opt.len')}</span>
                <div className="pill-row">
                  {[15, 25, 40, 0].map(v => (
                    <button key={v} type="button" className={+opts.rounds === v ? 'on' : ''} onClick={() => set({rounds: v})}>
                      {v ? String(v) : '∞'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pace-row">
                <span className="pace-lbl">{t('opt.timer')}</span>
                <div className="pill-row">
                  {[0, 30, 60, 90, 120].map(v => (
                    <button key={v} type="button" className={+(opts.timer || 0) === v ? 'on' : ''} onClick={() => set({timer: v})}>
                      {v === 0 ? t('opt.off') : v < 120 ? `${v}s` : '2m'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="preset-bar">
                <span className="pace-lbl">{t('setup.presets')}</span>
                <div className="pill-row">
                  <button type="button" className={matchPreset(FULL_PRESET) ? 'on' : ''} onClick={() => set(FULL_PRESET)}>{t('setup.presetFull')}</button>
                  <button type="button" className={matchPreset(PURE_PRESET) ? 'on' : ''} onClick={() => set(PURE_PRESET)}>{t('setup.presetPure')}</button>
                  <button type="button" className={matchPreset(RICH_PRESET) ? 'on' : ''} onClick={() => set(RICH_PRESET)}>{t('setup.presetRich')}</button>
                </div>
              </div>
              <div className="pace-extras">
                <label className="pace-fast-inline">
                  <input type="checkbox" className="switch" checked={!!opts.fast} onChange={e => set({fast: e.target.checked})} />
                  <span>{t('opt.fast')}</span>
                </label>
                <button type="button" className="btn sm gold" onClick={() => setRulesOpen(true)}>
                  ⚙ {t('setup.customizeRules', {n: activeRuleCount})}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- WALNUT PLAYERS TABLE ---------- */}
      <section className="players-sec">
        <div className="sec-head" style={{marginBottom: 10}}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap'}}>
            <h2 className="h2" style={{margin: 0}}>{t('setup.h2')}</h2>
            <span className="muted" style={{fontSize: 13}}>{t('setup.p')}</span>
          </div>
          <div className="seat-quick">
            <div className="pill-row">
              {[2, 3, 4, 6, 8].map(n => (
                <button key={n} type="button" className={playing === n ? 'on' : ''} onClick={() => setCount(n)}>{n}</button>
              ))}
            </div>
            {playing < 8 && (
              <button type="button" className="btn sm gold" onClick={addSeat}>+ {t('setup.addPlayer')}</button>
            )}
          </div>
        </div>

        <div className="players-table">
          <div className="seats">
            {activeSeats.map(({s, i}) => (
              <div key={i} className="seat" style={{'--pc': COLORS[i]} as CSSProperties}>
                {playing > 2 && (
                  <button type="button" className="seat-rm" aria-label={t('btn.remove')} title={t('btn.remove')} onClick={() => edit(i, {on: false})}>×</button>
                )}
                <button type="button" className="seat-piece" aria-label={t('aria.seatTok', {n: i + 1})} title={t('aria.seatTok', {n: i + 1})} onClick={() => setPicking(i)}>
                  <img src={TOKENS[s.token].piece} srcSet={TOKENS[s.token].pieceSet} sizes="154px" alt="" />
                  <span className="seat-change" aria-hidden="true">⇄ {t('setup.change')}</span>
                </button>
                <div className="seat-tok">{tokN(s.token)}</div>
                <input className="field" value={s.name} maxLength={16} aria-label={t('aria.seatName', {n: i + 1})} onChange={e => edit(i, {name: e.target.value})} />
                <span className="seg">
                  <button type="button" aria-pressed={s.human} onClick={() => edit(i, {human: true})}>{t('seg.human')}</button>
                  <button type="button" aria-pressed={!s.human} onClick={() => edit(i, {human: false})}>{t('seg.computer')}</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- LAUNCH BAR ---------- */}
      <div className="setup-go">
        <div className="sg-meta">
          <span className="sg-badge">{isGrand ? '52' : '40'}</span>
          <span>{playing < 2 ? t('setup.need2') : t('setup.count', {n: playing, h: humans})}</span>
        </div>
        <div className="sg-acts">
          <button className="btn ghost" onClick={() => startLocal(seats.map(s => ({name: s.name, token: s.token, human: false})), {...opts, fast: true})}>{t('btn.demo')}</button>
          {canResume && <button className="btn cream" onClick={resumeLocal}>{t('btn.resume')}</button>}
          <button className="btn red lg" disabled={playing < 2} onClick={() => startLocal(seats.filter(s => s.on), opts)}>{t('btn.startGame')} →</button>
        </div>
      </div>

      {picking != null && (
        <Modal title={t('tok.choose')} onClose={() => setPicking(null)}>
          <TokenGrid
            selected={seats[picking].token}
            takenBy={k => { const o = seats.findIndex((s, j) => j !== picking && s.on && s.token === k); return o >= 0 ? seats[o].name : null; }}
            disableTaken={false}
            onPick={pick}
            name={k => tokN(k)}
          />
          <p className="muted" style={{fontSize: 12.5}}>{t('tok.swap')}</p>
        </Modal>
      )}

      {rulesOpen && (
        <Modal title={t('setup.rulesTitle')} onClose={() => setRulesOpen(false)} footer={<button className="btn red" onClick={() => setRulesOpen(false)}>{t('btn.done')}</button>}>
          <RulesOptions settings={opts} onChange={setOpts} hideGame />
        </Modal>
      )}
    </div>
  );
}
