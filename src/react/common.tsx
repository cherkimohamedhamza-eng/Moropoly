// Small pieces shared by the React screens: token coins, the language switcher, the house-rules form, windows.
import {useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {app} from '../app/state';
import {CASH_CHOICES, FINE_CHOICES, JAIL_FINE, RIAD_PREMIUM, SALARY, SALARY_CHOICES, START_CASH, TOKENS} from '../engine/data';
import type {Settings} from '../engine/types';
import {LANGS, fmt, t} from '../i18n/core';
import {esc} from '../ui/dom';
import {setLang} from '../ui/lang';

/** a text with bold parts (the translations hold the markup); names and other values are escaped */
export function Rich({k, p}: {k: string; p: Record<string, string>}) {
  const safe = Object.fromEntries(Object.entries(p).map(([key, v]) => [key, esc(v)]));
  return <span dangerouslySetInnerHTML={{__html: t(k, safe)}} />;
}

/** a token in its silver coin; shows the token's emoji if the picture does not load */
export function Coin({token, style}: {token: number; style?: CSSProperties}) {
  const tk = TOKENS[token] || TOKENS[0];
  const [broken, setBroken] = useState(false);
  return (
    <span className="coin" style={style}>
      {broken ? <span className="g">{tk.g}</span> : <img src={tk.img} srcSet={tk.set} sizes="64px" alt={tk.name} onError={() => setBroken(true)} />}
    </span>
  );
}

export function LangSwitch() {
  return (
    <div className="langsw" role="group" aria-label={t('lang.aria')}>
      {(LANGS as [string, string, string][]).map(([k, s, n]) => (
        <button key={k} type="button" aria-pressed={app.LANG === k} title={n} lang={k} onClick={() => setLang(k)}>{s}</button>
      ))}
    </div>
  );
}

export function BackButton({onClick}: {onClick: () => void}) {
  return <button className="btn ghost sm" onClick={onClick}>{t('back')}</button>;
}

/** the house rules, in three groups: the money (starting money, salary, the 3okacha fine, double on Al Inṭilāq),
 *  the rules (Daret pot, dlala, "Riad now", rent from 3okacha) and the game (length, turn timer, fast animations) */
export function RulesOptions({settings, onChange}: {settings: Settings; onChange: (s: Settings) => void}) {
  const set = (patch: Partial<Settings>) => onChange({...settings, ...patch});
  const pick = (key: 'cash' | 'salary' | 'fine', value: number, choices: number[]) => (
    <select className="field" value={value} onChange={e => set({[key]: +e.target.value})}>
      {choices.map(v => <option key={v} value={v}>{fmt(v)}</option>)}
    </select>
  );
  const sw = (on: boolean, change: (v: boolean) => void, key: string, p?: Record<string, unknown>) => (
    <label className="opt"><input type="checkbox" className="switch" checked={on} onChange={e => change(e.target.checked)} /><div><b>{t('opt.' + key)}</b><span>{t('opt.' + key + 'D', p)}</span></div></label>
  );
  const choice = (key: string, control: ReactNode) => (
    <label className="opt"><div style={{flex: 1}}><b>{t('opt.' + key)}</b><span>{t('opt.' + key + 'D')}</span><div>{control}</div></div></label>
  );
  return (
    <>
      <div className="opt-group">{t('opt.gMoney')}</div>
      {choice('cash', pick('cash', settings.cash ?? START_CASH, CASH_CHOICES))}
      {choice('salary', pick('salary', settings.salary ?? SALARY, SALARY_CHOICES))}
      {choice('fine', pick('fine', settings.fine ?? JAIL_FINE, FINE_CHOICES))}
      {sw(!!settings.goDouble, v => set({goDouble: v}), 'goDouble')}
      <div className="opt-group">{t('opt.gRules')}</div>
      {sw(!!settings.daret, v => set({daret: v}), 'daret')}
      {sw(!!settings.dlala, v => set({dlala: v}), 'dlala')}
      {sw(settings.riadNow !== false, v => set({riadNow: v}), 'riadNow', {n: Math.round(RIAD_PREMIUM * 100)})}
      {sw(settings.jailRent !== false, v => set({jailRent: v}), 'jailRent')}
      <div className="opt-group">{t('opt.gGame')}</div>
      {choice('len', (
        <select className="field" value={+settings.rounds} onChange={e => set({rounds: +e.target.value})}>
          {[0, 15, 25, 40].map(v => <option key={v} value={v}>{v ? t('opt.rounds', {n: v}) : t('opt.until')}</option>)}
        </select>
      ))}
      {choice('timer', (
        <select className="field" value={+(settings.timer || 0)} onChange={e => set({timer: +e.target.value})}>
          {[0, 30, 60, 90, 120].map(v => <option key={v} value={v}>{v === 0 ? t('opt.off') : v < 120 ? t('opt.sec', {n: v}) : t('opt.min', {n: v / 60})}</option>)}
        </select>
      ))}
      {sw(!!settings.fast, v => set({fast: v}), 'fast')}
    </>
  );
}

/** a window over the page; closes with ×, Escape, or a tap outside it */
export function Modal({title, onClose, children, footer}: {title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onClose]);
  return createPortal(
    <div className="veil" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="hd"><h2>{title}</h2><button className="x" aria-label={t('aria.close')} onClick={onClose}>×</button></div>
        <div className="bd">{children}</div>
        {footer && <div className="ft">{footer}</div>}
      </div>
    </div>,
    document.getElementById('reactModal')!,
  );
}

/** the grid of tokens to pick from; `takenBy(k)` names whoever already has token k */
export function TokenGrid({selected, takenBy, disableTaken, onPick, name}: {
  selected: number; takenBy: (k: number) => string | null; disableTaken: boolean; onPick: (k: number) => void; name: (k: number) => string;
}) {
  return (
    <div className="tokgrid">
      {TOKENS.map((_, k) => {
        const taken = takenBy(k);
        return (
          <button key={k} className="tok" aria-pressed={selected === k} disabled={disableTaken && !!taken} onClick={() => onPick(k)}>
            <Coin token={k} />
            {taken && <span className="taken">{taken.slice(0, 8)}</span>}
            <span>{name(k)}</span>
          </button>
        );
      })}
    </div>
  );
}
