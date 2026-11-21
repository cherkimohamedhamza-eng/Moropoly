// Hosting and joining online games.
import {commit, hostHandle, lobbyJoin} from './authority';
import {app, ensureCid, myName} from './state';
import {TOKENS} from '../engine/data';
import {log} from '../engine/engine';
import {clone, rid} from '../engine/util';
import {t} from '../i18n/core';
import {rememberGame} from '../net/server';
import {newTransport} from '../net/transport';
import {$, esc, toast} from '../ui/dom';
import {goHome} from '../ui/home';
import {renderLobby} from '../ui/lobby';
import {renderBanner, renderTab} from '../ui/render';
import {onState, seatedIn, show} from '../ui/view';
import {refresh} from '../react/store';

/* ============================================================
   ONLINE: host / join
   ============================================================ */
const netErr=e=>{const k=e&&e.type; return t(k==='crypto'?'note.secure':k==='relay'?'conn.noRelay':k==='lib'?'err.lib':k==='unavailable-id'?'err.inUse':k==='browser-incompatible'?'err.browser':'err.conn');};
/* ---------- on the game server ---------- */
// the table is lost (deleted after the game, or never existed): back to the home page
const lostTable=code=>e=>{if(app.NET.code!==code) return; toast(e&&e.type==='noGame'?t('toast.noGame',{c:code.toUpperCase()}):netErr(e)); goHome();};
function serverEvents(T){T.onRejected=of=>{if(of==='move') toast(t('toast.noMove')); else if(of==='join'&&seatedIn(app.V)) toast(t('toast.taken'));};}
async function hostOnServer(){
  const name=myName()||`${t('lbl.player')} 1`;
  app.lobbyDraft={name,token:0};
  for(let attempt=0;attempt<3;attempt++){
    teardownNet();
    const T=newTransport(), code=rid(8);
    app.MODE='online'; app.G=null; app.V=null; app.NET.T=T; app.NET.code=code; serverEvents(T);
    showConnecting(code,'conn.opening','conn.serverHint'); watchConnecting(T,code);
    try{await T.create(code,{name,token:0},d=>onState(d));}
    catch(e){if(app.NET.T!==T) return; if(e&&e.type==='exists') continue; toast(netErr(e)); goHome(); return;}
    if(app.NET.T!==T) return;
    T.onFatal=lostTable(code); rememberGame(code);
    try{history.replaceState(null,'','#'+code);}catch(e){}
    return;
  }
  toast(t('err.conn')); goHome();
}
function joinOnServer(T,code){
  app.MODE='online'; app.G=null; app.V=null; app.NET.T=T; app.NET.code=code; serverEvents(T);
  try{history.replaceState(null,'','#'+code);}catch(e){}
  showConnecting(code,'conn.joining','conn.serverHint'); watchConnecting(T,code);
  T.welcomed=()=>rememberGame(code);
  T.join(code,d=>onState(d),lostTable(code));
}
/* ---------- hosting from this browser (inside Claude) ---------- */
export async function hostGame(){
  ensureCid(); teardownNet();
  const T=newTransport(); if(!T.canHost()){toast(t(T.kind==='server'?'note.secure':'toast.noHost')); return;}
  if(T.kind==='server') return hostOnServer();
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
  code=String(code||'').toLowerCase().trim(); if(!/^[a-z0-9]{4,12}$/.test(code)){toast(t('toast.code')); return;}
  ensureCid(); teardownNet();
  const T=newTransport(); if(!T.ready()){toast(t(T.kind==='server'?'note.secure':'toast.noOnline')); return;}
  if(T.kind==='server') return joinOnServer(T,code);
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
}
function showConnecting(code,msgKey,hintKey){
  app.lobbyPanel={kind:'connecting',code,title:msgKey,hint:[hintKey||'conn.hint']};
  show('lobby'); refresh();
}
function watchConnecting(T,code){
  // explain what is going on while a player waits: no internet, or the server cannot be reached
  const iv=setInterval(()=>{
    if(app.NET.T!==T||T.stopped){clearInterval(iv); return;}
    const P=app.lobbyPanel; if(P.kind!=='connecting'){if(T.gotState) clearInterval(iv); return;}
    const age=Date.now()-T.startedAt;
    const key=T.gotState?'conn.found':!T.anyUp()&&age>5000?'conn.noRelay':'conn.serverHint';
    if(P.hint[0]!==key){P.hint=[key]; refresh();}
  },500);
}
export function teardownNet(){
  app.JOIN={sent:false,pin:null,denied:0,wrong:false,welcomed:null};
  try{app.NET.T&&app.NET.T.leave();}catch(e){}
  app.NET={T:null,code:null,myQ:[],mySeq:0};
}
export function onlineCids(){return app.NET.T?app.NET.T.onlineCids():null;}
/** a guest inside Claude: is the host's browser there? Online: is this device connected to the game server? */
export function hostOnline(){if(!(app.MODE==='guest'||app.MODE==='online')||!app.NET.T) return true; return app.NET.T.hostOnline();}
let presenceRaf=0;
export function renderPresence(){cancelAnimationFrame(presenceRaf); presenceRaf=requestAnimationFrame(()=>{if(app.V&&app.V.status==='lobby') renderLobby(); else if(app.V){renderBanner(); if(app.tab==='players') renderTab();}});}
