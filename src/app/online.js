// Hosting and joining online games.
import {commit, hostHandle, lobbyJoin} from './authority';
import {app, ensureCid, myName} from './state';
import {TOKENS} from '../engine/data';
import {log} from '../engine/engine';
import {clone, rid} from '../engine/util';
import {t} from '../i18n/core';
import {newTransport} from '../net/transport';
import {$, esc, toast} from '../ui/dom';
import {goHome} from '../ui/home';
import {renderLobby} from '../ui/lobby';
import {renderBanner, renderTab} from '../ui/render';
import {onState, show} from '../ui/view';

/* ============================================================
   ONLINE: host / join
   ============================================================ */
const netErr=e=>{const k=e&&e.type; return t(k==='crypto'?'note.secure':k==='relay'?'conn.noRelay':k==='lib'?'err.lib':k==='unavailable-id'?'err.inUse':k==='browser-incompatible'?'err.browser':'err.conn');};
export async function hostGame(){
  ensureCid(); teardownNet();
  const T=newTransport(); if(!T.canHost()){toast(t(T.kind==='relay'?'note.secure':'toast.noHost')); return;}
  let code=rid(6), extra={};
  if(T.makeCode){try{const r=await T.makeCode(); code=r.code; extra={nonce:r.nonce,hostKey:r.hostKey,hostDh:r.hostDh};}catch(e){toast(t('note.secure')); return;}}
  app.MODE='host';
  app.G={...extra,gid:rid(10),status:'lobby',mode:'online',code,hostCid:app.myCid,players:[],settings:{daret:true,dlala:true,rounds:25,fast:false,timer:0},seq:0,anims:[],ack:{},log:[],event:'',updated:Date.now()};
  log(app.G,'tableSet');
  app.NET.T=T; app.NET.code=code;
  showConnecting(code,'conn.opening');
  try{await T.host(code,hostHandle);}catch(e){toast(netErr(e)); goHome(); return;}
  try{history.replaceState(null,'','#'+code);}catch(e){}
  const hn=myName()||`${t('lbl.player')} 1`;
  app.lobbyDraft={name:hn,token:0};
  lobbyJoin(app.myCid,{name:hn,token:0,auto:true});
  commit();
}
export async function joinGame(code){
  code=String(code||'').toLowerCase().trim(); if(!/^[a-z0-9]{4,8}$/.test(code)){toast(t('toast.code')); return;}
  ensureCid(); teardownNet();
  const T=newTransport(); if(!T.ready()){toast(t('toast.noOnline')); return;}
  let saved=null; try{saved=await T.load(code);}catch(e){}
  app.NET.T=T; app.NET.code=code;
  try{history.replaceState(null,'','#'+code);}catch(e){}
  if(saved&&saved.hostCid===app.myCid){
    app.MODE='host'; app.G=clone(saved);
    showConnecting(code,'conn.reopen');
    try{await T.host(code,hostHandle);}catch(e){toast(netErr(e)); goHome(); return;}
    app.V=null; commit(); return;
  }
  if(T.kind==='claude'&&!saved){toast(t('toast.noGame',{c:code.toUpperCase()})); teardownNet(); return;}
  app.MODE='guest'; app.G=null; app.V=null;
  showConnecting(code,'conn.connecting');
  try{await T.join(code,d=>onState(clone(d)));}catch(e){toast(netErr(e)); goHome(); return;}
  if(saved) onState(clone(saved));
  if(T.kind==='relay') watchConnecting(T,code);
}
function showConnecting(code,msgKey){
  show('lobby');
  $('lobby').innerHTML=`<div class="bar-top"><button class="btn ghost sm" data-home>${t('back')}</button><div class="sp"></div><span class="chipcode" dir="ltr">${esc(t('chip.game',{c:code.toUpperCase()}))}</span></div>
   <div class="card" style="max-width:560px;margin:40px auto;text-align:center"><div class="parade" style="margin:6px 0 18px">${[0,2,3].map((k,i)=>`<div class="coin" style="animation-delay:${i*.3}s"><img src="${TOKENS[k].img}" alt=""></div>`).join('')}</div>
   <h2 class="h2">${esc(t(msgKey))}</h2><p class="muted" id="connHint">${esc(t('conn.hint'))}</p></div>`;
  $('lobby').querySelector('[data-home]').onclick=goHome;
}
function watchConnecting(T,code){
  // explain what is going on while a guest waits: no internet, wrong code, or host away
  const iv=setInterval(()=>{
    if(app.NET.T!==T||T.stopped){clearInterval(iv); return;}
    const h=$('connHint'); if(!h){if(T.gotState) clearInterval(iv); return;}
    const age=Date.now()-T.startedAt;
    const msg=T.gotState?t('conn.found'):!T.anyUp()?(age>7000?t('conn.noRelay'):t('conn.hint')):(age>6000?t('conn.noTable',{c:code.toUpperCase()}):t('conn.hint'));
    if(h.textContent!==msg) h.textContent=msg;
  },500);
}
export function teardownNet(){
  app.JOIN={sent:false,pin:null,denied:0,wrong:false,welcomed:null};
  try{app.NET.T&&app.NET.T.leave();}catch(e){}
  app.NET={T:null,code:null,myQ:[],mySeq:0};
}
export function onlineCids(){return app.NET.T?app.NET.T.onlineCids():null;}
export function hostOnline(){if(app.MODE!=='guest'||!app.NET.T) return true; return app.NET.T.hostOnline();}
let presenceRaf=0;
export function renderPresence(){cancelAnimationFrame(presenceRaf); presenceRaf=requestAnimationFrame(()=>{if(app.V&&app.V.status==='lobby') renderLobby(); else if(app.V){renderBanner(); if(app.tab==='players') renderTab();}});}
