// Setting up a game on this device: who plays, as which token, human or computer, and the house rules.
import {useState} from 'react';
import {COLORS} from '../engine/data';
import type {Settings} from '../engine/types';
import {t, tokN} from '../i18n/core';
import {lsGet} from '../lib/storage';
import {goHome} from '../ui/home';
import {resumeLocal, startLocal} from '../ui/setup';
import {BackButton, Coin, LangSwitch, Modal, RulesOptions, TokenGrid} from './common';
import {useRefresh} from './store';

interface SeatDraft { name: string; token: number; human: boolean; on: boolean }
const NAMES = ['Hamza', 'Salma', 'Youssef', 'Imane', 'Karim', 'Nadia', 'Omar', 'Zineb'];

export function SetupScreen() {
  useRefresh();
  const [seats, setSeats] = useState<SeatDraft[]>(() => NAMES.map((n, i) => ({name: n, token: i, human: i === 0, on: i < 4})));
  const [opts, setOpts] = useState<Settings>({daret: true, dlala: true, rounds: 25, fast: false, timer: 0});
  const [picking, setPicking] = useState<number | null>(null);

  const edit = (i: number, patch: Partial<SeatDraft>) => setSeats(s => s.map((x, j) => (j === i ? {...x, ...patch} : x)));
  /** picking a token someone else has swaps the two */
  const pick = (k: number) => {
    const i = picking!;
    setSeats(s => {
      const other = s.findIndex((x, j) => j !== i && x.token === k);
      return s.map((x, j) => (j === i ? {...x, token: k} : j === other ? {...x, token: s[i].token} : x));
    });
    setPicking(null);
  };
  const playing = seats.filter(s => s.on).length, humans = seats.filter(s => s.on && s.human).length;
  const saved = lsGet('moropoly.local.v2');
  const canResume = !!(saved && saved.status === 'play' && !saved.over);

  return (
    <>
      <div className="bar-top"><BackButton onClick={goHome} /><div className="sp" /><LangSwitch /></div>
      <div className="eyebrow">{t('setup.eyebrow')}</div>
      <h2 className="h2">{t('setup.h2')}</h2>
      <p className="muted">{t('setup.p')}</p>
      <div className="seats">
        {seats.map((s, i) => (
          <div key={i} className={`seat ${s.on ? '' : 'off'}`}>
            <button className="tok" aria-label={t('aria.seatTok', {n: i + 1})} style={{width: 56}} onClick={() => setPicking(i)}>
              <Coin token={s.token} style={{boxShadow: `0 0 0 4px ${COLORS[i]}`}} />
            </button>
            <div className="info">
              <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                <input type="checkbox" checked={s.on} aria-label={t('aria.seatOn', {n: i + 1})} onChange={e => edit(i, {on: e.target.checked})} />
                <input className="field" value={s.name} maxLength={16} aria-label={t('aria.seatName', {n: i + 1})} style={{flex: 1}} onChange={e => edit(i, {name: e.target.value})} />
              </div>
              <span className="seg">
                <button aria-pressed={s.human} onClick={() => edit(i, {human: true})}>{t('seg.human')}</button>
                <button aria-pressed={!s.human} onClick={() => edit(i, {human: false})}>{t('seg.computer')}</button>
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="sec">{t('sec.rules')}</div>
      <div className="opts"><RulesOptions settings={opts} onChange={setOpts} /></div>
      <div className="ctas" style={{marginTop: 20}}>
        <button className="btn red" disabled={playing < 2} onClick={() => startLocal(seats.filter(s => s.on), opts)}>{t('btn.startGame')}</button>
        <button className="btn" onClick={() => startLocal(seats.map(s => ({name: s.name, token: s.token, human: false})), {...opts, fast: true})}>{t('btn.demo')}</button>
        {canResume && <button className="btn" onClick={resumeLocal}>{t('btn.resume')}</button>}
        <span className="muted">{playing < 2 ? t('setup.need2') : t('setup.count', {n: playing, h: humans})}</span>
      </div>
      {picking != null && (
        <Modal title={t('tok.choose')} onClose={() => setPicking(null)}>
          <TokenGrid
            selected={seats[picking].token}
            takenBy={k => { const o = seats.findIndex((s, j) => j !== picking && s.token === k); return o >= 0 ? seats[o].name : null; }}
            disableTaken={false}
            onPick={pick}
            name={k => tokN(k)}
          />
          <p className="muted" style={{fontSize: 12.5}}>{t('tok.swap')}</p>
        </Modal>
      )}
    </>
  );
}
