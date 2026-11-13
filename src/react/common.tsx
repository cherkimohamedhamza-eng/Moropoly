// Small pieces shared by the React screens: token coins, the language switcher, the house-rules form, windows.
import {useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {app} from '../app/state';
import {TOKENS} from '../engine/data';
import type {Settings} from '../engine/types';
import {LANGS, t} from '../i18n/core';
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

/** the house rules: Daret pot, dlala, game length, turn timer, fast animations */
export function RulesOptions({settings, onChange}: {settings: Settings; onChange: (s: Settings) => void}) {
  const set = (patch: Partial<Settings>) => onChange({...settings, ...patch});
  return (
    <>
      <label className="opt"><input type="checkbox" checked={!!settings.daret} onChange={e => set({daret: e.target.checked})} /><div><b>{t('opt.daret')}</b><span>{t('opt.daretD')}</span></div></label>
      <label className="opt"><input type="checkbox" checked={!!settings.dlala} onChange={e => set({dlala: e.target.checked})} /><div><b>{t('opt.dlala')}</b><span>{t('opt.dlalaD')}</span></div></label>
      <label className="opt"><div style={{flex: 1}}><b>{t('opt.len')}</b><span>{t('opt.lenD')}</span><div>
        <select className="field" value={+settings.rounds} onChange={e => set({rounds: +e.target.value})}>
          {[0, 15, 25, 40].map(v => <option key={v} value={v}>{v ? t('opt.rounds', {n: v}) : t('opt.until')}</option>)}
        </select></div></div></label>
      <label className="opt"><div style={{flex: 1}}><b>{t('opt.timer')}</b><span>{t('opt.timerD')}</span><div>
        <select className="field" value={+(settings.timer || 0)} onChange={e => set({timer: +e.target.value})}>
          {[0, 30, 60, 90, 120].map(v => <option key={v} value={v}>{v === 0 ? t('opt.off') : v < 120 ? t('opt.sec', {n: v}) : t('opt.min', {n: v / 60})}</option>)}
        </select></div></div></label>
      <label className="opt"><input type="checkbox" checked={!!settings.fast} onChange={e => set({fast: e.target.checked})} /><div><b>{t('opt.fast')}</b><span>{t('opt.fastD')}</span></div></label>
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
