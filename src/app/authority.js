// The authority (this device in a local game, the host's device online): applies moves, saves and sends the game, runs the turn timer.
import {app} from './state';
import {COLORS, START_CASH, TOKENS} from '../engine/data';
import {A, actorOf, apply, log} from '../engine/engine';
import {clone, range} from '../engine/util';
import {t} from '../i18n/core';
import {lsGet, lsSet} from '../lib/storage';
import {toast} from '../ui/dom';
import {onState} from '../ui/view';

/* ============================================================
   AUTHORITY: commit, push, intents
   ============================================================ */
const TIMER_GRACE=3000; // time for the dice and pawn animations before the clock really starts
function timerStamp(G){
  const sec=+((G.settings||{}).timer||0);
  if(G.status!=='play'||G.over||!sec){G.tEnd=null; G.tk=null; return;}
  const a=actorOf(G), q=G.players[a], hum=!!(q&&q.human&&!q.bankrupt);
  const k=hum?[G.turn,G.phase,a,G.auction?G.auction.turn+':'+G.auction.high+':'+G.auction.bidders.length:'',G.trade?1:0,(G.players[G.cur]||{}).cash<0?1:0].join('|'):'';
  if(k!==G.tk){G.tk=k; G.tEnd=hum?Date.now()+sec*1000+TIMER_GRACE:null;}
  G.tNow=Date.now();
}
function timeoutAction(G,a){
  if(G.trade&&G.trade.to===a) return {t:'tradeReply',accept:false};
  if(G.auction) return {t:'pass'};
  const p=G.players[a]; if(a!==G.cur) return null;
  if(p.cash<0) return {t:'bankrupt'};
  if(G.phase==='roll') return {t:'roll'};
  if(G.phase==='buy') return {t:'decline'};
  if(G.phase==='end') return {t:'end'};
  return null;
}
/* the host (or this device, in a local game) plays for whoever let the clock run out */
export function timerTick(){
  if(!(app.MODE==='local'||app.MODE==='host')||!app.G||app.G.status!=='play'||app.G.over||!app.G.tEnd||Date.now()<app.G.tEnd) return;
  const a=actorOf(app.G), q=app.G.players[a]; app.G.tEnd=null; app.G.tk=null;
  if(!q||!q.human){commit(); return;}
  const act=timeoutAction(app.G,a); log(app.G,'timeUp',{p:q.name});
  if(!(act&&apply(app.G,a,act))&&app.G.cur===a&&app.G.phase==='end'&&q.cash>=0) apply(app.G,a,{t:'end'});
  commit();
}
setInterval(timerTick,500);
export function commit(){
  if(!app.G) return;
  app.G.updated=Date.now(); timerStamp(app.G);
  if(app.MODE==='local') lsSet('moropoly.local.v2',app.G);
  if(app.MODE==='host'&&app.NET.T) app.NET.T.push(app.G);
  onState(clone(app.G));
}
function authorized(seat,cid){const p=app.G&&app.G.players[seat]; return !!p&&p.human&&p.cid===cid;}
export function hostHandle(cid,q){
  if(!app.G||!cid||!Array.isArray(q)||cid===app.myCid) return;
  let last=app.G.ack[cid]||0, changed=false;
  for(const it of q.slice(-8)){
    if(!it||typeof it.s!=='number'||it.s<=last) continue;
    last=it.s;
    if(handleIntent(cid,it)) changed=true;
  }
  if(last!==(app.G.ack[cid]||0)){app.G.ack[cid]=last; changed=true;}
  if(changed) commit();
}
const hostPinOf=code=>{const v=lsGet('moropoly.pin.'+code); return v?String(v):'';};
function handleIntent(cid,it){
  const a=it.a||{};
  if(a.t==='join'){
    const seated=app.G.players.some(p=>p.cid===cid);
    if(app.G.pinOn&&!seated&&(!hostPinOf(app.G.code)||String(a.pin||'')!==hostPinOf(app.G.code))){app.G.denied=app.G.denied||{}; app.G.denied[cid]=(app.G.denied[cid]||0)+1; return true;}
    if(app.G.status==='lobby') return lobbyJoin(cid,a);
    if(app.G.status==='play') return playJoin(app.G,cid,a);
    return false;
  }
  if(app.G.status==='lobby'){
    if(a.t==='leave'){const n=app.G.players.length; app.G.players=app.G.players.filter(p=>p.cid!==cid); return n!==app.G.players.length;}
    return false;
  }
  if(app.G.status==='play'){
    const seat=+it.seat; if(!authorized(seat,cid)) return false;
    return apply(app.G,seat,a);
  }
  return false;
}
const freeToken=(G,want,except)=>{const used=new Set(G.players.filter(p=>p.cid!==except).map(p=>p.token)); if(want>=0&&want<TOKENS.length&&!used.has(want)) return want; const k=range(TOKENS.length).find(k=>!used.has(k)); return k==null?-1:k;};
export function lobbyJoin(cid,a){
  const name=String(a.name||'').trim().slice(0,16)||t('lbl.player');
  let tok=+a.token;
  const mine=app.G.players.find(p=>p.cid===cid);
  if(!(tok>=0&&tok<TOKENS.length)||app.G.players.some(p=>p.token===tok&&p!==mine)){if(!a.auto&&mine) return false; tok=freeToken(app.G,tok,cid);}
  if(tok<0) return false;
  if(mine){mine.name=name; mine.token=tok; return true;}
  if(app.G.players.length>=8) return false;
  app.G.players.push({cid,name,token:tok,human:true});
  log(app.G,'joins',{p:name});
  return true;
}
/* someone opens the invite link after the game has started: they get a seat at the end of the turn order */
export function playJoin(G,cid,a){
  const name=String(a.name||'').trim().slice(0,16)||t('lbl.player');
  const mine=G.players.find(p=>p.cid===cid);
  if(mine){ // changing name or token during the game
    let tok=+a.token; if(!(tok>=0&&tok<TOKENS.length)||G.players.some(p=>p!==mine&&!p.bankrupt&&p.token===tok)) tok=mine.token;
    if(mine.name===name&&mine.token===tok) return false;
    mine.name=name; mine.token=tok; return true;
  }
  if(G.over||G.players.length>=8) return false;
  const used=new Set(G.players.filter(p=>!p.bankrupt).map(p=>p.token));
  let tok=+a.token; if(!(tok>=0&&tok<TOKENS.length)||used.has(tok)) tok=range(TOKENS.length).find(k=>!used.has(k));
  if(tok==null) return false;
  const id=G.players.length;
  G.players.push({id,cid,name,token:tok,human:true,color:COLORS[id%COLORS.length],cash:START_CASH,pos:0,inJail:false,jailTurns:0,goojf:[],bankrupt:false,owes:-1,mt:'',lateRound:G.round});
  log(G,'joinsMid',{p:name});
  A(G,{k:'fx',f:'joined',pid:id});
  return true;
}
export function sendIntent(it){
  const ack=(app.V&&app.V.ack&&app.V.ack[app.myCid])||0;
  app.NET.mySeq=Math.max(app.NET.mySeq,ack)+1;
  app.NET.myQ=app.NET.myQ.filter(x=>x.s>ack).concat([Object.assign({s:app.NET.mySeq},it)]).slice(-6);
  if(app.NET.T) app.NET.T.send(app.NET.myQ);
}
export function dispatch(a,seat){
  if(!app.V) return;
  if(seat==null) seat=actorOf(app.V);
  if(app.MODE==='local'||app.MODE==='host'){
    if(app.MODE==='host'&&app.G.status==='play'&&!(app.G.players[seat]&&(app.G.players[seat].cid===app.myCid))) return;
    if(apply(app.G,seat,a)) commit(); else toast(t('toast.noMove'));
  } else {
    if(app.NET.T&&!app.NET.T.hostOnline()){toast(t('toast.hostOff'));}
    sendIntent({seat,a});
  }
}
export function lobbyAct(a){
  if(app.MODE==='host'){
    if(a.t==='join'){if(lobbyJoin(app.myCid,a)) commit(); else toast(t('toast.taken'));}
    else if(a.t==='leave'){app.G.players=app.G.players.filter(p=>p.cid!==app.myCid); commit();}
  } else sendIntent({a});
}
