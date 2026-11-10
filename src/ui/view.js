// Screens, the installable app, and turning each new game state into what is on screen.
import {commit, sendIntent} from '../app/authority';
import {app, inClaude, myName} from '../app/state';
import {botDecide} from '../engine/bots';
import {START_CASH, TOKENS} from '../engine/data';
import {actorOf, apply} from '../engine/engine';
import {range} from '../engine/util';
import {fmt, t} from '../i18n/core';
import {runAnim} from './anim';
import {buildBoard, syncDpos} from './board';
import {$, esc, toast} from './dom';
import {goHome} from './home';
import {renderLangSwitch} from './lang';
import {renderLobby} from './lobby';
import {autoModals, openModal, openSeat} from './modals';
import {renderAll, renderTurn} from './render';

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
  addEventListener('beforeinstallprompt',e=>{e.preventDefault(); deferredPrompt=e; $('installBtn').hidden=false;});
  if(/iphone|ipad|ipod/i.test(navigator.userAgent)) $('installBtn').hidden=false;
  addEventListener('appinstalled',()=>{$('installBtn').hidden=true; toast(t('pwa.installed'));});
  $('installBtn').onclick=async()=>{
    if(deferredPrompt){deferredPrompt.prompt(); try{await deferredPrompt.userChoice;}catch(e){} deferredPrompt=null; $('installBtn').hidden=true; return;}
    openModal('inst',`<div class="hd"><h2>${t('pwa.title')}</h2><button class="x" data-close aria-label="${t('aria.close')}">×</button></div><div class="bd"><p>${t('pwa.ios')}</p><p>${t('pwa.android')}</p><p class="muted">${t('pwa.note')}</p></div>`);
  };
}
export function seatedIn(ns){return !!(ns&&ns.players&&ns.players.some(p=>p.cid===app.myCid));}
function guestGate(ns){
  // returns true when this state was handled by the join flow (code screen)
  if(app.MODE!=='guest'||!ns||!ns.players) return false;
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
  show('lobby');
  const code=ns.code||app.NET.code||'';
  $('lobby').innerHTML=`<div class="bar-top"><button class="btn ghost sm" data-home>${t('back')}</button><div class="sp"></div><div class="langsw"></div><span class="chipcode" dir="ltr">${esc(t('chip.game',{c:code.toUpperCase()}))}</span></div>
   <form class="card" id="pinForm" style="max-width:460px;margin:40px auto;text-align:center;display:flex;flex-direction:column;gap:12px;align-items:center" autocomplete="off">
     <div class="parade" style="margin:4px 0 6px">${[0,1,3].map((k,i)=>`<div class="coin" style="animation-delay:${i*.3}s"><img src="${TOKENS[k].img}" alt=""></div>`).join('')}</div>
     <h2 class="h2">${t('pin.title')}</h2><p class="muted" style="margin:0">${t('pin.help')}</p>
     <input class="field" id="pinInput" inputmode="numeric" pattern="[0-9]*" maxlength="6" dir="ltr" placeholder="${esc(t('pin.ph'))}" aria-label="${esc(t('pin.ph'))}" style="font-family:var(--f-display);font-size:24px;letter-spacing:.4em;text-align:center;width:220px" ${checking?'disabled':''}>
     <div class="muted" id="pinMsg" style="min-height:1.4em;color:${app.JOIN.wrong&&!checking?'var(--red-hi)':'var(--dim)'}">${checking?t('pin.checking'):app.JOIN.wrong?t('pin.wrong'):''}</div>
     <button class="btn red" type="submit" ${checking?'disabled':''}>${t('pin.join')}</button>
   </form>`;
  $('lobby').querySelectorAll('.langsw').forEach(renderLangSwitch);
  $('lobby').querySelector('[data-home]').onclick=goHome;
  const inp=$('pinInput'); if(inp&&!checking) inp.focus();
  $('pinForm').onsubmit=e=>{e.preventDefault(); const v=(inp.value||'').replace(/\D/g,''); if(v.length<4){$('pinMsg').textContent=t('pin.bad'); return;}
    app.JOIN.pin=v; app.JOIN.wrong=false; app.JOIN.sent=false; guestGate(ns);};
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
  if(app.MODE!=='guest'||ns.status!=='play'||wasSeated||!seatedIn(ns)||app.JOIN.welcomed===ns.gid) return;
  app.JOIN.welcomed=ns.gid;
  toast(t('seat.joinedMid',{a:fmt(START_CASH)}));
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
