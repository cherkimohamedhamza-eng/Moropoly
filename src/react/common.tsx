// Small pieces shared by the React screens: token coins, the language switcher, the house-rules form, windows.
import {useEffect, useState, type CSSProperties, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {app} from '../app/state';
import {BILL_DAR, BILL_RIAD, CASH_CHOICES, FINE_CHOICES, JAIL_FINE, LOAN_MAX, LOAN_RATE, RAIL_SIDE, RIAD_PREMIUM, SALARY, SALARY_CHOICES, START_CASH, TOKENS} from '../engine/data';
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

/** the house rules, organized into sleek category tabs with pill selectors and active-state highlights.
 *  Pass `hideGame` when Board/Rounds/Timer/Fast are already shown in a dedicated stage header (SetupScreen). */
export function RulesOptions({settings, onChange, hideGame}: {settings: Settings; onChange: (s: Settings) => void; hideGame?: boolean}) {
  const [tab, setTab] = useState<'rules' | 'money' | 'game' | 'all'>('rules');
  const set = (patch: Partial<Settings>) => onChange({...settings, ...patch});
  const pills = (key: 'cash' | 'salary' | 'fine', value: number, choices: number[]) => (
    <div className="pill-row">
      {choices.map(v => <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => set({[key]: v})}>{fmt(v)}</button>)}
    </div>
  );
  const sw = (on: boolean, change: (v: boolean) => void, key: string, p?: Record<string, unknown>) => (
    <label className={`opt${on ? ' on' : ''}`}>
      <input type="checkbox" className="switch" checked={on} onChange={e => change(e.target.checked)} />
      <div><b>{t('opt.' + key)}</b><span>{t('opt.' + key + 'D', p)}</span></div>
    </label>
  );
  const choice = (key: string, control: ReactNode) => (
    <div className="opt choice">
      <div style={{flex: 1}}><b>{t('opt.' + key)}</b><span>{t('opt.' + key + 'D')}</span><div style={{marginTop: 8}}>{control}</div></div>
    </div>
  );

  const rulesOn = [!!settings.chrika, !!settings.daret, !!settings.dlala, settings.riadNow !== false, settings.jailRent !== false, !!settings.shufa, !!settings.bills, !!settings.train].filter(Boolean).length;
  const moneyOn = [!!settings.goDouble, !!settings.fairStart, !!settings.credit, !!settings.solidarity, !!settings.deeds].filter(Boolean).length;
  const showRules = tab === 'rules' || tab === 'all';
  const showMoney = tab === 'money' || tab === 'all';
  const showGame = !hideGame && (tab === 'game' || tab === 'all');

  return (
    <div className="rules-wrap">
      <div className="rule-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'rules'} className={tab === 'rules' ? 'on' : ''} onClick={() => setTab('rules')}>
          {t('opt.gRules')} <small>{rulesOn}/8</small>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'money'} className={tab === 'money' ? 'on' : ''} onClick={() => setTab('money')}>
          {t('opt.gMoney')} <small>{moneyOn}/5</small>
        </button>
        {!hideGame && (
          <button type="button" role="tab" aria-selected={tab === 'game'} className={tab === 'game' ? 'on' : ''} onClick={() => setTab('game')}>
            {t('opt.gGame')}
          </button>
        )}
        <button type="button" role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
          {t('setup.allRules')}
        </button>
      </div>

      <div className="opts">
        {showRules && (
          <>
            {tab === 'all' && <div className="opt-group">{t('opt.gRules')}</div>}
            {sw(!!settings.chrika, v => set({chrika: v}), 'chrika')}
            {sw(!!settings.daret, v => set({daret: v}), 'daret')}
            {sw(!!settings.dlala, v => set({dlala: v}), 'dlala')}
            {sw(settings.riadNow !== false, v => set({riadNow: v}), 'riadNow', {n: Math.round(RIAD_PREMIUM * 100)})}
            {sw(settings.jailRent !== false, v => set({jailRent: v}), 'jailRent')}
            {sw(!!settings.shufa, v => set({shufa: v}), 'shufa')}
            {sw(!!settings.bills, v => set({bills: v}), 'bills', {a: fmt(BILL_DAR), b: fmt(BILL_RIAD)})}
            {sw(!!settings.train, v => set({train: v}), 'train', {n: Math.round(RAIL_SIDE * 100)})}
          </>
        )}
        {showMoney && (
          <>
            {tab === 'all' && <div className="opt-group">{t('opt.gMoney')}</div>}
            {choice('cash', pills('cash', settings.cash ?? START_CASH, CASH_CHOICES))}
            {choice('salary', pills('salary', settings.salary ?? SALARY, SALARY_CHOICES))}
            {choice('fine', pills('fine', settings.fine ?? JAIL_FINE, FINE_CHOICES))}
            {sw(!!settings.goDouble, v => set({goDouble: v}), 'goDouble')}
            {sw(!!settings.fairStart, v => set({fairStart: v}), 'fairStart')}
            {sw(!!settings.credit, v => set({credit: v}), 'credit', {a: fmt(LOAN_MAX), n: Math.round(LOAN_RATE * 100)})}
            {sw(!!settings.solidarity, v => set({solidarity: v}), 'solidarity')}
            {sw(!!settings.deeds, v => set({deeds: v}), 'deeds')}
          </>
        )}
        {showGame && (
          <>
            {tab === 'all' && <div className="opt-group">{t('opt.gGame')}</div>}
            {choice('board', (
              <div className="pill-row">
                <button type="button" className={settings.board !== 'grand' ? 'on' : ''} onClick={() => set({board: 'classic'})}>{t('opt.boardClassic')}</button>
                <button type="button" className={settings.board === 'grand' ? 'on' : ''} onClick={() => set({board: 'grand'})}>{t('opt.boardGrand')}</button>
              </div>
            ))}
            {choice('len', (
              <div className="pill-row">
                {[15, 25, 40, 0].map(v => <button key={v} type="button" className={+settings.rounds === v ? 'on' : ''} onClick={() => set({rounds: v})}>{v ? t('opt.rounds', {n: v}) : t('opt.until')}</button>)}
              </div>
            ))}
            {choice('timer', (
              <div className="pill-row">
                {[0, 30, 60, 90, 120].map(v => <button key={v} type="button" className={+(settings.timer || 0) === v ? 'on' : ''} onClick={() => set({timer: v})}>{v === 0 ? t('opt.off') : v < 120 ? `${v}s` : '2m'}</button>)}
              </div>
            ))}
            {sw(!!settings.fast, v => set({fast: v}), 'fast')}
          </>
        )}
      </div>
    </div>
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
