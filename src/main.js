// Entry point: wires up the home screen and starts the app.
import './styles.css';
import './i18n/strings';
import {commit, dispatch, timerTick} from './app/authority';
import {hostGame, joinGame, teardownNet} from './app/online';
import {app} from './app/state';
import {botDecide} from './engine/bots';
import {apply, freshGame, goBankrupt, pay, payDebts, settle} from './engine/engine';
import {lsGet} from './lib/storage';
import {initNet} from './net/transport';
import {$} from './ui/dom';
import {drawMap, flagAnim, goHome, homeArt} from './ui/home';
import {applyLang} from './ui/lang';
import {openSeat} from './ui/modals';
import {AU, initDock} from './ui/music';
import {setTab} from './ui/render';
import {localOpts, renderSetup, seats, startLocal} from './ui/setup';
import {initPWA, show} from './ui/view';

/* ============================================================
   BOOT
   ============================================================ */
$('hostBtn').onclick=hostGame;
$('localBtn').onclick=()=>{show('setup'); renderSetup();};
$('joinForm').onsubmit=e=>{e.preventDefault(); joinGame($('joinCode').value);};
document.querySelectorAll('[data-home]').forEach(b=>b.onclick=goHome);
$('startLocal').onclick=()=>startLocal(seats.filter(s=>s.on),localOpts);
$('demoLocal').onclick=()=>{const o=Object.assign({},localOpts,{fast:true}); startLocal(seats.map((s,i)=>({name:s.name,token:s.token,human:false})),o);};
$('resumeLocal').onclick=()=>{const sv=lsGet('moropoly.local.v2'); if(sv){teardownNet(); app.MODE='local'; app.G=sv; app.V=null; commit();}};
$('leaveBtn').onclick=goHome;
$('mySeatBtn').onclick=()=>openSeat();
$('tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]'); if(b) setTab(b.dataset.tab);});
addEventListener('hashchange',()=>{const h=(location.hash||'').replace('#','').toLowerCase(); if(/^[a-z0-9]{4,8}$/.test(h)&&h!==app.NET.code) joinGame(h);});
applyLang(); drawMap(); homeArt(); flagAnim(); initDock(); initPWA();
initNet();
window.__moropoly={get AU(){return AU;},get G(){return app.G;},get V(){return app.V;},get playing(){return app.playing;},dispatch,apply,freshGame,botDecide,eng:{pay,payDebts,goBankrupt,settle,commit:()=>commit(),timerTick}};
