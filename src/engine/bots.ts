/* ---------- computer players ---------- */
import {GROUPS, JAIL_FINE, RAILS, SP} from './data';
import {actorOf} from './engine';
import {groupIdx, ownedBy, ownsGroup, priceOf} from './util';
import type {Action, Game, GroupId, Trade} from './types';

const GROUP_IDS=Object.keys(GROUPS) as GroupId[];

function wantValue(G: Game,pid: number,i: number){
  const s=SP[i]; let v=priceOf(i);
  if(s.t==='prop'){const gi=groupIdx(s.g),mine=gi.filter(j=>G.props[j].owner===pid).length; const others=new Set(gi.map(j=>G.props[j].owner).filter(o=>o>=0&&o!==pid));
    if(mine===gi.length-1) v*=1.6; else if(mine>0) v*=1.2;
    if(others.size===1&&gi.filter(j=>G.props[j].owner===[...others][0]).length===gi.length-1) v*=1.3;}
  if(s.t==='rail') v*=1+0.15*RAILS.filter(r=>G.props[r].owner===pid).length;
  return v;
}
function botTradeValue(G: Game,t: Trade){
  const bot=t.to,from=t.from; let v=t.cashGive-t.cashGet;
  const val=(i: number)=>G.props[i].mort?priceOf(i)*0.5:priceOf(i);
  t.give.forEach(i=>v+=val(i)); t.get.forEach(i=>v-=val(i)*1.1);
  const groupsAfter=(pid: number,add: number[],rem: number[])=>{const own=new Set(ownedBy(G,pid).filter(i=>!rem.includes(i)).concat(add)); return GROUP_IDS.filter(g=>groupIdx(g).every(i=>own.has(i))).length;};
  const cnt=(pid: number)=>GROUP_IDS.filter(g=>ownsGroup(G,pid,g)).length;
  v+=(groupsAfter(bot,t.give,t.get)-cnt(bot))*3000; v-=(groupsAfter(from,t.get,t.give)-cnt(from))*4000;
  return v;
}
/** the computer's next move when it is a computer player's turn, otherwise null */
export function botDecide(G: Game): {seat: number; a: Action} | null{
  const seat=actorOf(G); if(seat<0) return null; const p=G.players[seat]; if(!p||p.human) return null;
  const res=G.round<6?1500:2500;
  if(G.trade) return {seat,a:{t:'tradeReply',accept:botTradeValue(G,G.trade)>=300}};
  if(G.auction){const au=G.auction; const cap=Math.min(wantValue(G,seat,au.idx)*(0.85+Math.random()*0.3),p.cash-res/2); const gap=cap-au.high; return {seat,a:gap>=100?{t:'bid',inc:gap>1500?500:100}:{t:'pass'}};}
  if(p.mt!==`${G.turn}:${G.phase}`&&(G.phase==='roll'||G.phase==='end')) return {seat,a:{t:'manage'}};
  if(G.phase==='roll'){
    if(p.inJail){if(p.goojf.length) return {seat,a:{t:'card'}}; if(p.cash>JAIL_FINE+res&&G.round<12) return {seat,a:{t:'fine'}};}
    return {seat,a:{t:'roll'}};
  }
  if(G.phase==='buy'){const i=G.pending!.idx,price=priceOf(i); const want=wantValue(G,seat,i)>=price*1.15||p.cash-price>=res; return {seat,a:{t:(want&&p.cash>=price)?'buy':'decline'}};}
  if(G.phase==='end') return {seat,a:{t:'end'}};
  return null;
}
