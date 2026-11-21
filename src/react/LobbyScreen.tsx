// The online lobby: connecting to a table, asking for its code, then the table itself where players
// take a seat and the host sets the rules and starts.
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {amHost, hostAct, lobbyAct} from '../app/authority';
import {hostOnline, onlineCids} from '../app/online';
import {app, inClaude, inviteLink, myName, saveName, type LobbyPanel} from '../app/state';
import {TOKENS} from '../engine/data';
import {range} from '../engine/util';
import {t, tokN} from '../i18n/core';
import {lsGet, lsSet} from '../lib/storage';
import type {Lobby} from '../online/table';
import {toast} from '../ui/dom';
import {goHome} from '../ui/home';
import {BackButton, Coin, LangSwitch, RulesOptions, TokenGrid} from './common';
import {useRefresh} from './store';

export function LobbyScreen() {
  useRefresh();
  const p = app.lobbyPanel;
  if (p.kind === 'connecting') return <Connecting panel={p} />;
  if (p.kind === 'pin') return <PinGate panel={p} />;
  if (!app.V || app.V.status !== 'lobby') return null;
  return <Table V={app.V as Lobby} />;
}

const GameChip = ({code}: {code: string}) => <span className="chipcode" dir="ltr">{t('chip.game', {c: code.toUpperCase()})}</span>;
const Parade = ({tokens, style}: {tokens: number[]; style: React.CSSProperties}) => (
  <div className="parade" style={style}>
    {tokens.map((k, i) => <div key={k} className="coin" style={{animationDelay: `${i * 0.3}s`}}><img src={TOKENS[k].img} srcSet={TOKENS[k].set} sizes="64px" alt="" /></div>)}
  </div>
);

function Connecting({panel}: {panel: Extract<LobbyPanel, {kind: 'connecting'}>}) {
  return (
    <>
      <div className="bar-top"><BackButton onClick={goHome} /><div className="sp" /><GameChip code={panel.code} /></div>
      <div className="card" style={{maxWidth: 560, margin: '40px auto', textAlign: 'center'}}>
        <Parade tokens={[0, 2, 3]} style={{margin: '6px 0 18px'}} />
        <h2 className="h2">{t(panel.title)}</h2>
        <p className="muted" id="connHint">{t(panel.hint[0], panel.hint[1])}</p>
      </div>
    </>
  );
}

/** the table has a code: ask for it before joining */
function PinGate({panel}: {panel: Extract<LobbyPanel, {kind: 'pin'}>}) {
  const [msg, setMsg] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!panel.checking) input.current?.focus(); }, [panel.checking]);
  const shown = panel.checking ? t('pin.checking') : msg ?? (panel.wrong ? t('pin.wrong') : '');
  return (
    <>
      <div className="bar-top"><BackButton onClick={goHome} /><div className="sp" /><LangSwitch /><GameChip code={panel.code} /></div>
      <form className="card" autoComplete="off"
        style={{maxWidth: 460, margin: '40px auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center'}}
        onSubmit={e => {
          e.preventDefault();
          const v = (input.current?.value || '').replace(/\D/g, '');
          if (v.length < 4) { setMsg(t('pin.bad')); return; }
          setMsg(null);
          panel.submit(v);
        }}>
        <Parade tokens={[0, 1, 3]} style={{margin: '4px 0 6px'}} />
        <h2 className="h2">{t('pin.title')}</h2>
        <p className="muted" style={{margin: 0}}>{t('pin.help')}</p>
        <input ref={input} className="field" inputMode="numeric" pattern="[0-9]*" maxLength={6} dir="ltr" placeholder={t('pin.ph')} aria-label={t('pin.ph')}
          style={{fontFamily: 'var(--f-display)', fontSize: 24, letterSpacing: '.4em', textAlign: 'center', width: 220}} disabled={panel.checking} />
        <div className="muted" style={{minHeight: '1.4em', color: (panel.wrong || msg) && !panel.checking ? 'var(--red-hi)' : 'var(--dim)'}}>{shown}</div>
        <button className="btn red" type="submit" disabled={panel.checking}>{t('pin.join')}</button>
      </form>
    </>
  );
}

const Small = ({children}: {children: ReactNode}) => <> <span className="muted">· {children}</span></>;

function Table({V}: {V: Lobby}) {
  const [, rerender] = useState(0);
  /** the player has typed a name that is not saved yet: the table must not overwrite it */
  const nameEdited = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const savedPin = () => { const v = lsGet('moropoly.pin.' + V.code); return v ? String(v) : ''; };
  const [pinDraft, setPinDraft] = useState(savedPin);

  const isHost = amHost();
  const on = onlineCids();
  // online, the game runs on the server: the host only has to be there to press start
  const hostHere = app.MODE === 'online' ? !!(on && V.hostCid && on.has(V.hostCid)) : hostOnline();
  const players = V.players;
  const mine = players.find(p => p.cid === app.myCid);

  // the seat being edited: follows the table, except for a name the player is still typing
  const d = app.lobbyDraft;
  if (mine) d.token = mine.token;
  else if (d.token < 0 || players.some(p => p.token === d.token && p.cid !== app.myCid)) d.token = range(10).find(k => !players.some(p => p.token === k)) ?? 0;
  if (mine && !nameEdited.current) d.name = mine.name;
  else if (!d.name) d.name = myName();

  const link = inviteLink(V.code);
  const saveSeat = (quiet?: boolean) => {
    const n = (d.name || '').trim();
    if (!n) { toast(t('toast.name')); nameInput.current?.focus(); return; }
    nameEdited.current = false;
    saveName(n);
    lobbyAct({t: 'join', name: n, token: d.token});
    if (!quiet) toast(mine ? t('toast.saved') : t('toast.sitting'));
  };
  const copyLink = () => {
    const done = () => toast(t('toast.copied'));
    try { navigator.clipboard.writeText(link).then(done, () => { linkInput.current?.select(); toast(t('toast.ctrlC')); }); }
    catch (e) { linkInput.current?.select(); }
  };
  const savePin = () => {
    const v = pinDraft.replace(/\D/g, '');
    if (v.length < 4 || v.length > 6) { toast(t('pin.bad')); return; }
    lsSet('moropoly.pin.' + V.code, v);
    hostAct({op: 'pin', pin: v});
    toast(t('pin.on', {c: v}));
  };
  const clearPin = () => {
    try { localStorage.removeItem('moropoly.pin.' + V.code); } catch (e) { /* storage blocked */ }
    setPinDraft('');
    hostAct({op: 'pin', pin: ''});
  };

  return (
    <>
      <div className="bar-top"><BackButton onClick={goHome} /><div className="sp" /><LangSwitch /><GameChip code={V.code} /></div>
      <div className="eyebrow">{isHost ? t('lb.hosting') : t('lb.invited')}</div>
      <h2 className="h2">{t('lb.h2')}</h2>
      <div className="lobby">
        <div className="card">
          <div className="eyebrow" style={{marginBottom: 8}}>{t('lb.invite')}</div>
          <div className="code">{V.code.toUpperCase()}</div>
          <p className="muted" style={{fontSize: 13}}>{t('lb.send')}{t('lb.lateJoin')}{inClaude() ? t('lb.claude') : app.MODE === 'online' ? t('lb.server') : t('lb.keepOpen')}</p>
          {isHost ? (
            <div className="opt" style={{flexDirection: 'column', alignItems: 'stretch', gap: 8, margin: '4px 0 6px'}}>
              <b>{t('pin.set')}</b><span>{t('pin.setHelp')}</span>
              <div className="invite">
                <input className="field" inputMode="numeric" pattern="[0-9]*" maxLength={6} dir="ltr" placeholder="1234" value={pinDraft} aria-label={t('pin.set')}
                  style={{maxWidth: 140, fontFamily: 'var(--f-display)', letterSpacing: '.3em'}} onChange={e => setPinDraft(e.target.value)} />
                <button className="btn sm" onClick={savePin}>{t('pin.save')}</button>
                {V.pinOn && <button className="btn sm ghost" onClick={clearPin}>{t('pin.remove')}</button>}
              </div>
              <span className="muted" style={{fontSize: 12}}>{V.pinOn ? t('pin.on', {c: savedPin() || '••••'}) : t('pin.off')}</span>
            </div>
          ) : V.pinOn ? <p className="muted" style={{fontSize: 12.5}}>{t('pin.onOther')}</p> : null}
          <div className="invite">
            <input ref={linkInput} className="field" readOnly dir="ltr" value={link} aria-label={t('lb.invite')} />
            <button className="btn sm metal" onClick={copyLink}>{t('btn.copy')}</button>
          </div>
          <div className="sec" style={{marginTop: 18}}>{t('lb.atTable', {n: players.length})}</div>
          <div className="roster">
            {players.length ? players.map((p, k) => (
              <div key={(p.cid || 'cpu') + k} className="rrow">
                <Coin token={p.token} />
                <div className="sp">
                  <div className="n">
                    {p.human && on && <span className={`dotst ${p.cid && on.has(p.cid) ? 'on' : ''}`} />}
                    {p.name}{p.cid === app.myCid && <Small>{t('lbl.you')}</Small>}{p.cid === V.hostCid && <Small>{t('lbl.host')}</Small>}
                  </div>
                  <div className="muted" style={{fontSize: 12}}>{tokN(p.token)}{p.human ? '' : ' · ' + t('lbl.computer')}</div>
                </div>
                {isHost && p.cid !== app.myCid && <button className="btn ghost sm" onClick={() => hostAct({op: 'kick', index: k})}>{t('btn.remove')}</button>}
              </div>
            )) : <div className="muted">{t('lb.nobody')}</div>}
          </div>
          {isHost && <div className="ctas" style={{marginTop: 12}}><button className="btn sm" disabled={players.length >= 8} onClick={() => hostAct({op: 'addBot'})}>{t('btn.addBot')}</button></div>}
        </div>
        <div className="card">
          <div className="eyebrow" style={{marginBottom: 8}}>{mine ? t('lb.yourSeat') : t('lb.takeSeat')}</div>
          <p className="muted" style={{fontSize: 12.5, margin: '0 0 10px'}}>{mine ? t('lb.autoNote') : players.length >= 8 ? t('lb.full') : t('lb.joining')}</p>
          <label className="muted" htmlFor="lbName" style={{fontSize: 12.5}}>{t('lb.name')}</label>
          <input ref={nameInput} className="field" id="lbName" maxLength={16} placeholder={t('lb.namePh')} value={d.name}
            style={{width: '100%', boxSizing: 'border-box', margin: '6px 0 14px'}}
            onChange={e => { d.name = e.target.value; nameEdited.current = true; rerender(x => x + 1); }}
            onBlur={() => { if (mine && nameEdited.current) saveSeat(true); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveSeat(); } }} />
          <div className="muted" style={{fontSize: 12.5, marginBottom: 8}}>{t('lb.token')}</div>
          <TokenGrid
            selected={d.token}
            takenBy={k => players.find(p => p.token === k && p.cid !== app.myCid)?.name ?? null}
            disableTaken
            onPick={k => { d.token = k; rerender(x => x + 1); if (mine) saveSeat(true); }}
            name={k => tokN(k)}
          />
          <div className="ctas" style={{marginTop: 16}}>
            <button className={`btn ${mine ? '' : 'red'}`} disabled={players.length >= 8 && !mine} onClick={() => saveSeat()}>{mine ? t('btn.save') : t('btn.sit')}</button>
            {mine && !isHost && <button className="btn ghost" onClick={() => lobbyAct({t: 'leave'})}>{t('btn.leaveTable')}</button>}
          </div>
          {isHost ? (
            <>
              <div className="sec">{t('sec.rules')}</div>
              <div className="opts"><RulesOptions settings={V.settings} onChange={st => hostAct({op: 'settings', settings: st})} /></div>
              <div className="ctas" style={{marginTop: 16}}>
                <button className="btn red" disabled={players.length < 2} onClick={() => hostAct({op: 'start'})}>{t('btn.start')}</button>
                <span className="muted" style={{fontSize: 12.5}}>{players.length < 2 ? t('lb.need2') : t('lb.ready', {n: players.length})}</span>
              </div>
            </>
          ) : <p className="muted" style={{marginTop: 18}}>{hostHere ? t('lb.hostStarts') : t('lb.waitHost')}</p>}
        </div>
      </div>
    </>
  );
}
