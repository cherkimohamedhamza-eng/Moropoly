// Entry point: puts the React screens in the page and starts the app.
import './styles.css';
import './i18n/strings';
import {commit, dispatch, timerTick} from './app/authority';
import {joinGame} from './app/online';
import {app} from './app/state';
import {botDecide} from './engine/bots';
import {apply, freshGame, goBankrupt, pay, payDebts, settle} from './engine/engine';
import {initNet} from './net/transport';
import {mountScreens} from './react/mount';
import {applyLang} from './ui/lang';
import {AU, initDock} from './ui/music';
import {initPWA} from './ui/view';

/* ============================================================
   BOOT
   ============================================================ */
mountScreens();
addEventListener('hashchange',()=>{const h=(location.hash||'').replace('#','').toLowerCase(); if(/^[a-z0-9]{4,12}$/.test(h)&&h!==app.NET.code) joinGame(h);});
applyLang(); initDock(); initPWA();
initNet();
window.__moropoly={get AU(){return AU;},get G(){return app.G;},get V(){return app.V;},get playing(){return app.playing;},dispatch,apply,freshGame,botDecide,eng:{pay,payDebts,goBankrupt,settle,commit:()=>commit(),timerTick}};
