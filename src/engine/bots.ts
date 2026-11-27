/* ---------- computer players ---------- */
import {GROUPS, LOAN_MAX, LOAN_STEP, boardOf} from './data';
import {actorOf, canGhedr, canShufa, chrikaCandidates, jailFine, rentFor, rideTargets, shufaPrice} from './engine';
import {chrikaExitSplit, chrikaValue, groupIdx, houseCost, ownedBy, ownsGroup, priceOf} from './util';
import type {Action, ChrikaOffer, Game, GroupId, Trade} from './types';

const GROUP_IDS=Object.keys(GROUPS) as GroupId[];

function wantValue(G: Game,pid: number,i: number){
  const B=boardOf(G), s=B.spaces[i]; let v=priceOf(i,G);
  if(s.t==='prop'){const gi=groupIdx(s.g,G),mine=gi.filter(j=>G.props[j].owner===pid).length; const others=new Set(gi.map(j=>G.props[j].owner).filter(o=>o>=0&&o!==pid));
    if(mine===gi.length-1) v*=1.6; else if(gi.length>=4&&mine===2) v*=1.35; else if(mine>0) v*=1.2;
    if(others.size===1&&gi.filter(j=>G.props[j].owner===[...others][0]).length===gi.length-1) v*=1.3;}
  if(s.t==='rail') v*=1+0.15*B.rails.filter(r=>G.props[r].owner===pid).length;
  if(s.t==='util'&&B.id==='grand') v*=1+0.15*B.utils.filter(u=>G.props[u].owner===pid).length;
  return v;
}
function botTradeValue(G: Game,t: Trade){
  const bot=t.to,from=t.from; let v=t.cashGive-t.cashGet;
  const val=(i: number)=>G.props[i].mort?priceOf(i,G)*0.5:priceOf(i,G);
  t.give.forEach(i=>v+=val(i)); t.get.forEach(i=>v-=val(i)*1.1);
  const groupsAfter=(pid: number,add: number[],rem: number[])=>{const own=new Set(ownedBy(G,pid).filter(i=>!rem.includes(i)).concat(add)); return GROUP_IDS.filter(g=>groupIdx(g,G).every(i=>own.has(i))).length;};
  const cnt=(pid: number)=>GROUP_IDS.filter(g=>ownsGroup(G,pid,g)).length;
  v+=(groupsAfter(bot,t.give,t.get)-cnt(bot))*3000; v-=(groupsAfter(from,t.get,t.give)-cnt(from))*4000;
  return v;
}
/** the last few rounds of a game with a round limit: too late for loans and forced sales to pay off */
const lastRounds=(G: Game)=>!!G.settings.rounds&&G.round>G.settings.rounds-4;
/** the property a computer player would take with its Shufa, or -1: one that completes a city it is building,
    otherwise, when it owns very little, the one it values most. It keeps half its reserve. */
function shufaPick(G: Game,pid: number,res: number){
  const B=boardOf(G), p=G.players[pid]; let best=-1,score=0;
  for(const k of Object.keys(G.props)){
    const i=+k; if(!canShufa(G,pid,i)) continue;
    const price=shufaPrice(i,G); if(p.cash-price<res/2) continue;
    const s=B.spaces[i], completes=s.t==='prop'&&groupIdx(s.g,G).every(j=>j===i||G.props[j].owner===pid);
    const sc=completes?3+wantValue(G,pid,i)/price:ownedBy(G,pid).length<=2?wantValue(G,pid,i)/price:0;
    if(sc>score&&sc>=0.6){score=sc; best=i;}
  }
  return best;
}
/** what player pid can expect to pay on the next roll of the dice from square pos: rents and taxes */
const DICE=[0,0,1,2,3,4,5,6,5,4,3,2,1];
function danger(G: Game,pid: number,pos: number){
  const B=boardOf(G); let x=0;
  for(let d=2;d<=12;d++){
    const i=(pos+d)%B.size, s=B.spaces[i]; let c=0;
    if(s.t==='tax') c=s.amount; else if(s.t==='gojail') c=jailFine(G);
    else if(G.props[i]&&G.props[i].owner>=0&&G.props[i].owner!==pid&&!G.props[i].mort){const keep=G.dice; G.dice=[3,4]; c=rentFor(G,i); G.dice=keep;}
    x+=c*DICE[d]/36;
  }
  return x;
}
/** the station a computer player would take the train to, or -1 */
function ridePick(G: Game,pid: number){
  const p=G.players[pid], to=rideTargets(G,pid); if(!to.length) return -1;
  const here=danger(G,pid,p.pos); let best=-1,gain=150;
  for(const t of to){const g=here-danger(G,pid,t); if(g>gain){gain=g; best=t;}}
  return best;
}
function botChrikaReply(G: Game,o: ChrikaOffer,res: number){
  const bot=o.to, p=G.players[bot], gi=groupIdx(o.g,G);
  if(o.kind==='form'){
    const myStreets=gi.filter(i=>G.props[i].owner===bot).length;
    const fair=Math.round((myStreets/gi.length)*100);
    const offered=100-(o.shareFrom??50);
    return offered>=Math.max(20,fair-10);
  }
  const {b:myExit,valB:myVal}=chrikaExitSplit(G,o.g,o.from,bot);
  return p.cash<res||myExit>=myVal*0.75;
}
function botGhedrPick(G: Game,seat: number): GroupId | null{
  if(!G.settings.chrika||!G.ghedrOpen||!(G.chrikas&&G.chrikas.length)) return null;
  const p=G.players[seat];
  for(const c of G.chrikas){
    if(c.a!==seat&&c.b!==seat) continue;
    if(!canGhedr(G,seat,c.g)) continue;
    const {keep}=chrikaValue(G,c.g);
    const gi=groupIdx(c.g,G);
    const myVal=gi.filter(i=>G.props[i].owner===seat).reduce((s,i)=>s+priceOf(i,G)+G.props[i].houses*houseCost(i,G),0);
    // 7+ escape is ~58% chance: take the gamble if desperate in debt, or when the heist haul hugely outweighs our stake
    if(p.cash<0&&keep>=-p.cash) return c.g;
    if(!p.inJail&&keep>=myVal*1.85&&(keep-myVal>=3500||danger(G,seat,p.pos)>800)) return c.g;
  }
  return null;
}
/** the computer's next move when it is a computer player's turn, otherwise null */
export function botDecide(G: Game): {seat: number; a: Action} | null{
  const seat=actorOf(G); if(seat<0) return null; const p=G.players[seat]; if(!p||p.human) return null;
  const res=G.round<6?1500:2500;
  if(G.trade) return {seat,a:{t:'tradeReply',accept:botTradeValue(G,G.trade)>=300}};
  if(G.chrikaOffer) return {seat,a:{t:'chrikaReply',accept:botChrikaReply(G,G.chrikaOffer,res)}};
  if(G.auction){const au=G.auction; const cap=Math.min(wantValue(G,seat,au.idx)*(0.85+Math.random()*0.3),p.cash-res/2); const gap=cap-au.high; return {seat,a:gap>=100?{t:'bid',inc:gap>1500?500:100}:{t:'pass'}};}
  if(p.mt!==`${G.turn}:${G.phase}`&&(G.phase==='roll'||G.phase==='end')) return {seat,a:{t:'manage'}};
  // chrika: pull L'Ghedr if unlocked and hugely profitable (or to escape debt / dodge danger into 3okacha)
  if(G.phase==='roll'||G.phase==='end'){const gg=botGhedrPick(G,seat); if(gg) return {seat,a:{t:'ghedr',g:gg}};}
  // chrika: propose a partnership when sharing a complete city (at most once per turn)
  if(G.settings.chrika&&G.phase==='roll'&&p.cash>=0&&p.chrikaTried!==G.turn){
    const cands=chrikaCandidates(G,seat);
    if(cands.length){
      const g=cands[0].g, gi=groupIdx(g,G), mine=gi.filter(i=>G.props[i].owner===seat).length;
      const share=Math.max(20,Math.min(80,Math.round((mine/gi.length)*10)*10));
      return {seat,a:{t:'chrikaPropose',g,share}};
    }
  }
  // credit: pay a loan back once there is money to spare, or before it costs more than the game has left to run
  if(p.loan&&(G.phase==='roll'||G.phase==='end')&&p.cash>=p.loan&&(p.cash-p.loan>=res||lastRounds(G))) return {seat,a:{t:'repay',a:p.loan}};
  // the Shufa: take a property that completes a city, or, with almost nothing, the most useful one on offer
  if(G.settings.shufa&&!p.shufaUsed&&G.phase==='roll'&&!lastRounds(G)){const i=shufaPick(G,seat,res); if(i>=0) return {seat,a:{t:'shufa',i}};}
  // the train: ride when the squares ahead of another station cost clearly less to land on, or to buy a station
  {const to=ridePick(G,seat); if(to>=0) return {seat,a:{t:'ride',to}};}
  if(G.phase==='roll'){
    if(p.inJail){if(p.goojf.length) return {seat,a:{t:'card'}}; if(p.cash>jailFine(G,seat)+res&&G.round<12) return {seat,a:{t:'fine'}};}
    return {seat,a:{t:'roll'}};
  }
  if(G.phase==='buy'){
    const i=G.pending!.idx,price=priceOf(i,G); const want=wantValue(G,seat,i)>=price*1.15||p.cash-price>=res;
    // credit: borrow the difference for a property worth having, early enough for it to pay for itself
    if(want&&p.cash<price&&G.settings.credit&&!p.loan&&!p.gheddar&&!lastRounds(G)&&wantValue(G,seat,i)>=price*1.15){
      const need=Math.ceil((price-p.cash+res/2)/LOAN_STEP)*LOAN_STEP;
      if(need<=LOAN_MAX) return {seat,a:{t:'borrow',a:need}};
    }
    return {seat,a:{t:(want&&p.cash>=price)?'buy':'decline'}};
  }
  if(G.phase==='end') return {seat,a:{t:'end'}};
  return null;
}
