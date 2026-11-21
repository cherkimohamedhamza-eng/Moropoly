// The music button in the corner and its panel: music on or off, the three tracks, volume, sound effects.
// The player itself (src/ui/music.js) calls refresh() when the music starts or stops.
import {useEffect, useState} from 'react';
import {t} from '../i18n/core';
import {AU, TRACKS, curTrack, setTrack, setVolume, toggleMusic, toggleSfx, unlockAudio} from '../ui/music';
import {useRefresh} from './store';

export function MusicDock() {
  useRefresh();
  const [open, setOpen] = useState(false);
  // a tap anywhere else closes the panel
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as Element).closest?.('#dock')) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const playing = AU.set.music && AU.playing;
  return (
    <>
      {open && (
        <div className="dock-panel" id="dockPanel">
          <div className="dk-row"><b>{t('dk.music')}</b><Switch on={AU.set.music} label={t('dk.music')} onClick={() => toggleMusic()} /></div>
          <div className="dk-tracks" role="group" aria-label={t('dk.pick')}>
            {TRACKS.map((tr, i) => {
              const sel = curTrack() === tr;
              return (
                <button key={tr.k} type="button" className="dk-track" aria-pressed={sel && AU.set.music} onClick={e => { e.stopPropagation(); setTrack(i); }}>
                  <span className="ar" style={{minWidth: 'auto'}}>{tr.ic}</span>
                  <span><b>{t('trk.' + tr.k)}</b><small>{t('trk.' + tr.k + '.d')}{sel && playing ? ' · ' + t('dk.loop') : ''}</small></span>
                </button>
              );
            })}
          </div>
          <label className="dk-row" htmlFor="dkVol">
            <span>{t('dk.vol')}</span>
            <input type="range" id="dkVol" min={0} max={1} step={0.05} value={AU.set.vol} onChange={e => setVolume(+e.target.value)} />
            <span className="muted" style={{minWidth: 34, textAlign: 'end'}}>{Math.round(AU.set.vol * 100)}%</span>
          </label>
          <div className="dk-row"><b>{t('dk.sfx')}</b><Switch on={AU.set.sfx} label={t('dk.sfx')} onClick={toggleSfx} /></div>
          <div className="muted" style={{fontSize: 11.5}}>{t('dk.m')}</div>
        </div>
      )}
      <button className={`dock-btn${playing ? ' on' : ''}`} id="dockBtn" aria-label={playing ? t('dk.ariaOn') : t('dk.aria')}
        onClick={e => { e.stopPropagation(); unlockAudio(); setOpen(o => !o); }}>
        <span className="eq"><i /><i /><i /><i /></span>
        <svg className="note" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18.5a3 3 0 1 1-2-2.83V5.5l12-2.5v12a3 3 0 1 1-2-2.83V7.4l-8 1.7v9.4z" fill="#15181d" /></svg>
      </button>
    </>
  );
}

const Switch = ({on, label, onClick}: {on: boolean; label: string; onClick: () => void}) =>
  <button className="sw" role="switch" aria-checked={on} aria-label={label} onClick={onClick}><i /></button>;
