/* ---------- computer players ---------- */
import {GROUPS, LOAN_MAX, LOAN_STEP, RAILS, SP} from './data';
import {actorOf, canShufa, jailFine, shufaPrice} from './engine';
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
/** the last few rounds of a game with a round limit: too late for loans and forced sales to pay off */
const lastRounds=(G: Game)=>!!G.settings.rounds&&G.round>G.settings.rounds-4;
/** the property a computer player would take with its Shufa, or -1: one that completes a city it is building,
    otherwise, when it owns very little, the one it values most. It keeps half its reserve. */
function shufaPick(G: Game,pid: number,res: number){
  const p=G.players[pid]; let best=-1,score=0;
  for(const k of Object.keys(G.props)){
    const i=+k; if(!canShufa(G,pid,i)) continue;
    const price=shufaPrice(i); if(p.cash-price<res/2) continue;
    const s=SP[i], completes=s.t==='prop'&&groupIdx(s.g).every(j=>j===i||G.props[j].owner===pid);
    const sc=completes?3+wantValue(G,pid,i)/price:ownedBy(G,pid).length<=2?wantValue(G,pid,i)/price:0;
    if(sc>score&&sc>=0.6){score=sc; best=i;}
  }
  return best;
}
/** the computer's next move when it is a computer player's turn, otherwise null */
export function botDecide(G: Game): {seat: number; a: Action} | null{
  const seat=actorOf(G); if(seat<0) return null; const p=G.players[seat]; if(!p||p.human) return null;
  const res=G.round<6?1500:2500;
  if(G.trade) return {seat,a:{t:'tradeReply',accept:botTradeValue(G,G.trade)>=300}};
  if(G.auction){const au=G.auction; const cap=Math.min(wantValue(G,seat,au.idx)*(0.85+Math.random()*0.3),p.cash-res/2); const gap=cap-au.high; return {seat,a:gap>=100?{t:'bid',inc:gap>1500?500:100}:{t:'pass'}};}
  if(p.mt!==`${G.turn}:${G.phase}`&&(G.phase==='roll'||G.phase==='end')) return {seat,a:{t:'manage'}};
  // credit: pay a loan back once there is money to spare, or before it costs more than the game has left to run
  if(p.loan&&(G.phase==='roll'||G.phase==='end')&&p.cash>=p.loan&&(p.cash-p.loan>=res||lastRounds(G))) return {seat,a:{t:'repay',a:p.loan}};
  // the Shufa: take a property that completes a city, or, with almost nothing, the most useful one on offer
  if(G.settings.shufa&&!p.shufaUsed&&G.phase==='roll'&&!lastRounds(G)){const i=shufaPick(G,seat,res); if(i>=0) return {seat,a:{t:'shufa',i}};}
  if(G.phase==='roll'){
    if(p.inJail){if(p.goojf.length) return {seat,a:{t:'card'}}; if(p.cash>jailFine(G)+res&&G.round<12) return {seat,a:{t:'fine'}};}
    return {seat,a:{t:'roll'}};
  }
  if(G.phase==='buy'){
    const i=G.pending!.idx,price=priceOf(i); const want=wantValue(G,seat,i)>=price*1.15||p.cash-price>=res;
    // credit: borrow the difference for a property worth having, early enough for it to pay for itself
    if(want&&p.cash<price&&G.settings.credit&&!p.loan&&!lastRounds(G)&&wantValue(G,seat,i)>=price*1.15){
      const need=Math.ceil((price-p.cash+res/2)/LOAN_STEP)*LOAN_STEP;
      if(need<=LOAN_MAX) return {seat,a:{t:'borrow',a:need}};
    }
    return {seat,a:{t:(want&&p.cash>=price)?'buy':'decline'}};
  }
  if(G.phase==='end') return {seat,a:{t:'end'}};
  return null;
}
