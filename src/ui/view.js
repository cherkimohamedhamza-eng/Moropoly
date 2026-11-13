// Screens, the installable app, and turning each new game state into what is on screen.
import {commit, sendIntent} from '../app/authority';
import {app, inClaude, myName} from '../app/state';
import {botDecide} from '../engine/bots';
import {TOKENS} from '../engine/data';
import {startCash} from '../engine/engine';
import {actorOf, apply} from '../engine/engine';
import {range} from '../engine/util';
import {fmt, t} from '../i18n/core';
import {runAnim} from './anim';
import {buildBoard, syncDpos} from './board';
import {$, toast} from './dom';
import {renderLobby} from './lobby';
import {autoModals, openInstallHelp, openSeat} from './modals';
import {renderAll, renderTurn} from './render';
import {refresh} from '../react/store';

/* ============================================================
   VIEW: state → screen with animations
   ============================================================ */
export function show(id){['home','setup','lobby','game'].forEach(s=>$(s).hidden=s!==id); window.scrollTo(0,0); document.body.classList.toggle('ingame',id==='game'); keepAwake(id==='game'||(id==='lobby'&&app.MODE==='host'));}
let wakeLock=null;
async function keepAwake(on){try{if(on&&'wakeLock' in navigator&&!wakeLock&&document.visibilityState==='visible'){wakeLock=await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release',()=>{wakeLock=null;});} else if(!on&&wakeLock){wakeLock.release(); wakeLock=null;}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&(!$('game').hidden||(!$('lobby').hidden&&app.MODE==='host'))) keepAwake(true);});
let deferredPrompt=null;
export function initPWA(){
  if(inClaude()) return;
  if(import.meta.env.PROD&&'serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')) navigator.serviceWorker.register('sw.js').catch(()=>{});
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(standalone) return;
  const offer=on=>{app.home.canInstall=on; refresh();};
  addEventListener('beforeinstallprompt',e=>{e.preventDefault(); deferredPrompt=e; offer(true);});
  if(/iphone|ipad|ipod/i.test(navigator.userAgent)) offer(true);
  addEventListener('appinstalled',()=>{offer(false); toast(t('pwa.installed'));});
}
/** the home page's install button: the browser's own install prompt, or how to do it by hand */
export async function installApp(){
  if(deferredPrompt){deferredPrompt.prompt(); try{await deferredPrompt.userChoice;}catch(e){} deferredPrompt=null; app.home.canInstall=false; refresh(); return;}
  openInstallHelp();
}
export function seatedIn(ns){return !!(ns&&ns.players&&ns.players.some(p=>p.cid===app.myCid));}
/** someone else runs this game: the host inside Claude, or the game server */
const isGuest=()=>app.MODE==='guest'||app.MODE==='online';
function guestGate(ns){
  // returns true when this state was handled by the join flow (code screen)
  if(!isGuest()||!ns||!ns.players) return false;
  const seated=seatedIn(ns), d=(ns.denied&&ns.denied[app.myCid])||0;
  if(app.JOIN.base==null){app.JOIN.base=d; app.JOIN.denied=d;}
  if(d>app.JOIN.denied){app.JOIN.denied=d; app.JOIN.pin=null; app.JOIN.sent=false; app.JOIN.wrong=true;}
  if(seated||ns.over) return false;
  if(ns.pinOn&&!app.JOIN.pin){app.V=null; showPinGate(ns); return true;}
  const full=ns.players.filter(p=>!p.bankrupt).length>=8||ns.players.length>=8;
  if(!full&&!app.JOIN.sent&&(ns.status==='lobby'||ns.status==='play')){
    app.JOIN.sent=true;
    const used=new Set(ns.players.filter(p=>!p.bankrupt).map(p=>p.token));
    const tok=range(TOKENS.length).find(k=>!used.has(k));
    const name=myName()||`${t('lbl.player')} ${ns.players.length+1}`;
    app.lobbyDraft={name,token:tok==null?0:tok};
    sendIntent({a:{t:'join',name,token:tok==null?0:tok,pin:app.JOIN.pin||'',auto:true}});
  }
  if(ns.pinOn&&app.JOIN.pin){app.V=null; showPinGate(ns,true); return true;}
  return false;
}
function showPinGate(ns,checking){
  const code=ns.code||app.NET.code||'';
  app.lobbyPanel={kind:'pin',code,checking:!!checking,wrong:app.JOIN.wrong,submit:v=>{app.JOIN.pin=v; app.JOIN.wrong=false; app.JOIN.sent=false; guestGate(ns);}};
  show('lobby'); refresh();
}
export let TDL=null;
export function onState(ns){
  if(!ns) return;
  TDL=(ns.tEnd&&ns.tNow&&ns.settings&&ns.settings.timer)?{end:Date.now()+(ns.tEnd-ns.tNow),total:ns.settings.timer*1000,actor:actorOf(ns)}:null;
  if(guestGate(ns)) return;
  const wasSeated=seatedIn(app.V);
  if(!app.V||ns.gid!==app.V.gid||ns.status!==app.V.status){
    app.Q=[]; app.PEND=null; app.playing=false; app.V=ns; app.lastSeen=ns.seq||0; app.shownOver=null;
    if(app.V.status==='lobby'){show('lobby'); renderLobby(); return;}
    show('game'); buildBoard(); syncDpos(); renderAll(); afterRender(); welcomeLate(ns,wasSeated); return;
  }
  if(app.V.status==='lobby'){app.V=ns; renderLobby(); return;}
  const fresh=(ns.anims||[]).filter(a=>a.n>app.lastSeen);
  app.lastSeen=Math.max(app.lastSeen,ns.seq||0);
  // trim our sent intents once acknowledged
  if(app.MODE==='guest'&&ns.ack&&app.myCid){const ack=ns.ack[app.myCid]||0; const before=app.NET.myQ.length; app.NET.myQ=app.NET.myQ.filter(x=>x.s>ack); if(before!==app.NET.myQ.length&&app.NET.T&&app.NET.T.kind==='claude') app.NET.T.send(app.NET.myQ);}
  app.PEND=ns; fresh.forEach(a=>app.Q.push(a));
  if(!app.playing) play();
  welcomeLate(ns,wasSeated);
}
function welcomeLate(ns,wasSeated){
  if(!isGuest()||ns.status!=='play'||wasSeated||!seatedIn(ns)||app.JOIN.welcomed===ns.gid) return;
  app.JOIN.welcomed=ns.gid;
  toast(t('seat.joinedMid',{a:fmt(startCash(app.V&&app.V.settings))}));
  setTimeout(()=>{if(!app.modal) openSeat();},400);
}
async function play(){
  app.playing=true; renderTurn();
  while(app.Q.length){const a=app.Q.shift(); try{await runAnim(a);}catch(e){}}
  app.playing=false;
  if(app.PEND){app.V=app.PEND; app.PEND=null;}
  if(app.LANG_DIRTY){app.LANG_DIRTY=false; buildBoard();}
  syncDpos(); renderAll(); afterRender();
}
function afterRender(){autoModals(); scheduleBot();}
function scheduleBot(){
  clearTimeout(app.botTimer);
  if(!(app.MODE==='local'||app.MODE==='host')||!app.G||app.G.status!=='play'||app.G.over||app.playing) return;
  const d=botDecide(app.G); if(!d) return;
  const fast=app.G.settings.fast;
  app.botTimer=setTimeout(()=>{if(app.playing){scheduleBot();return;} const dd=botDecide(app.G); if(dd&&apply(app.G,dd.seat,dd.a)) commit();},d.a.t==='manage'?(fast?60:250):(fast?280:900));
}
export const speed=()=>app.V&&app.V.settings&&app.V.settings.fast?0.45:1;
