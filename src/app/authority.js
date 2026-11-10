// The authority for games this device runs (a local game, or hosting inside Claude): applies moves, saves
// and sends the game, runs the turn timer. In online games on the game server, requests go to the server.
import {app} from './state';
import {actorOf, apply} from '../engine/engine';
import {clone} from '../engine/util';
import {t} from '../i18n/core';
import {lsGet, lsSet} from '../lib/storage';
import {addBot, handleRequest, lobbyJoin as lobbyJoinT, playJoin as playJoinT, removeSeat, startGame, timeUp, timerStamp, toggleBot} from '../online/table';
import {toast} from '../ui/dom';
import {onState} from '../ui/view';

/* ============================================================
   AUTHORITY: commit, push, intents
   ============================================================ */
/** this device runs the game: a local game, or the host inside Claude */
const runsGame=()=>app.MODE==='local'||app.MODE==='host';
/** this device's player created the table and has the host's controls */
export const amHost=()=>app.MODE==='host'||(app.MODE==='online'&&!!app.V&&app.V.hostCid===app.myCid);

/* the host (or this device, in a local game) plays for whoever let the clock run out */
export function timerTick(){
  if(!runsGame()||!app.G) return;
  if(timeUp(app.G,Date.now())) commit();
}
setInterval(timerTick,500);
export function commit(){
  if(!app.G) return;
  app.G.updated=Date.now(); timerStamp(app.G,Date.now());
  if(app.MODE==='local') lsSet('moropoly.local.v2',app.G);
  if(app.MODE==='host'&&app.NET.T) app.NET.T.push(app.G);
  onState(clone(app.G));
}
export function hostHandle(cid,q){
  if(!app.G||!cid||!Array.isArray(q)||cid===app.myCid) return;
  let last=app.G.ack[cid]||0, changed=false;
  for(const it of q.slice(-8)){
    if(!it||typeof it.s!=='number'||it.s<=last) continue;
    last=it.s;
    if(handleRequest(app.G,cid,it,pin=>!!hostPinOf(app.G.code)&&String(pin||'')===hostPinOf(app.G.code),t('lbl.player'))) changed=true;
  }
  if(last!==(app.G.ack[cid]||0)){app.G.ack[cid]=last; changed=true;}
  if(changed) commit();
}
const hostPinOf=code=>{const v=lsGet('moropoly.pin.'+code); return v?String(v):'';};
export const lobbyJoin=(cid,a)=>lobbyJoinT(app.G,cid,a,t('lbl.player'));
export const playJoin=(G,cid,a)=>playJoinT(G,cid,a,t('lbl.player'));

/** a request from this device to whoever runs the game */
export function sendIntent(it){
  if(app.MODE==='online'){if(app.NET.T) app.NET.T.send(toServer(it)); return;}
  const ack=(app.V&&app.V.ack&&app.V.ack[app.myCid])||0;
  app.NET.mySeq=Math.max(app.NET.mySeq,ack)+1;
  app.NET.myQ=app.NET.myQ.filter(x=>x.s>ack).concat([Object.assign({s:app.NET.mySeq},it)]).slice(-6);
  if(app.NET.T) app.NET.T.send(app.NET.myQ);
}
function toServer(it){
  const a=it.a||{};
  if(a.t==='join') return {t:'join',name:a.name,token:a.token,pin:a.pin||'',auto:!!a.auto};
  if(a.t==='leave') return {t:'leave'};
  return {t:'move',seat:it.seat,a};
}
export function dispatch(a,seat){
  if(!app.V) return;
  if(seat==null) seat=actorOf(app.V);
  if(runsGame()){
    if(app.MODE==='host'&&app.G.status==='play'&&!(app.G.players[seat]&&(app.G.players[seat].cid===app.myCid))) return;
    if(apply(app.G,seat,a)) commit(); else toast(t('toast.noMove'));
  } else {
    if(app.NET.T&&!app.NET.T.hostOnline()){toast(t(app.MODE==='online'?'toast.offline':'toast.hostOff'));}
    sendIntent({seat,a});
  }
}
export function lobbyAct(a){
  if(app.MODE==='host'){
    if(a.t==='join'){if(lobbyJoin(app.myCid,a)) commit(); else toast(t('toast.taken'));}
    else if(a.t==='leave'){app.G.players=app.G.players.filter(p=>p.cid!==app.myCid); commit();}
  } else sendIntent({a});
}
/**
 * The host's controls: {op:'settings',settings}, {op:'pin',pin}, {op:'kick',index}, {op:'addBot'},
 * {op:'start'} in the lobby, and {op:'bot',seat} during the game. Online they go to the server.
 */
export function hostAct(o){
  if(app.MODE==='online'){if(app.NET.T) app.NET.T.send(Object.assign({t:'host'},o)); return;}
  if(app.MODE!=='host'||!app.G) return;
  const G=app.G; let ok=false;
  if(o.op==='settings'){G.settings=Object.assign(G.settings,o.settings); ok=true;}
  else if(o.op==='pin'){G.pinOn=!!o.pin; delete G.pinHash; ok=true;}
  else if(o.op==='kick') ok=removeSeat(G,o.index);
  else if(o.op==='addBot') ok=addBot(G);
  else if(o.op==='start'){const g=startGame(G); if(g){app.G=g; ok=true;}}
  else if(o.op==='bot') ok=toggleBot(G,o.seat);
  if(ok) commit();
}
