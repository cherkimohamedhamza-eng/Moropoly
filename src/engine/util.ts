/* ============================================================
   HELPERS (pure)
   ============================================================ */
import {CHRIKA_PAYOUT, GHEDR_KEEP, GHEDR_UNLOCK_PCT, GHEDR_UNLOCK_ROUND, GROUPS, spacesOf} from './data';
import type {BoardId, Chrika, Game, GroupId, OwnableSpace, PropSpace} from './types';

type BoardLike = Pick<Game, 'settings'> | {settings?: {board?: BoardId}} | null | undefined;

export const rnd6=()=>1+Math.floor(Math.random()*6);
export const shuffle=<T>(a: T[])=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export const range=(n: number)=>Array.from({length:n},(_,i)=>i);
export const clone=<T>(o: T): T=>JSON.parse(JSON.stringify(o));
export const rid=(n: number)=>{const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<n;i++) s+=a[Math.floor(Math.random()*a.length)];return s;};
export const isOwnable=(i: number,G?: BoardLike)=>{const s=spacesOf(G)[i]; return !!s&&['prop','rail','util'].includes(s.t);};
/** price of a property, station or utility */
export const priceOf=(i: number,G?: BoardLike)=>(spacesOf(G)[i] as OwnableSpace).price;
export const nextOf=(pos: number,list: number[])=>{for(const x of list) if(x>pos) return x; return list[0];};
export const groupIdx=(g: GroupId,G?: BoardLike)=>spacesOf(G).map((s,i)=>s.t==='prop'&&s.g===g?i:-1).filter(i=>i>=0);
export const houseCost=(i: number,G?: BoardLike)=>GROUPS[(spacesOf(G)[i] as PropSpace).g].house;
export const colorOf=(i: number,G?: BoardLike)=>{const s=spacesOf(G)[i]; if(!s) return '#777'; if(s.t==='prop') return GROUPS[s.g].color; if(s.t==='rail') return '#4a5059'; if(s.t==='util') return '#9aa3ad'; return '#777';};
export const unmortCost=(i: number,G?: BoardLike)=>Math.ceil(priceOf(i,G)*0.55/10)*10;
export const alive=(G: Game)=>G.players.filter(p=>!p.bankrupt);
/** owns every street in the city (required to build dars and riads) */
export const ownsGroup=(G: Game,pid: number,g: GroupId)=>groupIdx(g,G).every(i=>G.props[i].owner===pid);
/** owns enough of the city for double unimproved rent: all streets on 2- or 3-street cities, or 3+ of 4 on the Grand Map */
export const ownsDoubleRent=(G: Game,pid: number,g: GroupId)=>{const gi=groupIdx(g,G), n=gi.filter(i=>G.props[i].owner===pid).length; return gi.length>=4?n>=3:n===gi.length;};
export const ownedBy=(G: Game,pid: number)=>Object.keys(G.props).map(Number).filter(i=>G.props[i].owner===pid);
/** active Chrika on city g, if any */
export const chrikaOf=(G: Game,g: GroupId): Chrika | undefined=>(G.chrikas||[]).find(c=>c.g===g);
/** player pid has building rights on city g (owns every street alone, or is in an active Chrika on g) */
export const hasCityRights=(G: Game,pid: number,g: GroupId)=>{if(ownsGroup(G,pid,g)) return true; const c=chrikaOf(G,g); return !!c&&(c.a===pid||c.b===pid);};
/** how many ownable spaces on the board are still unowned */
export const unownedCount=(G: Game)=>Object.keys(G.props).filter(k=>G.props[+k].owner<0).length;
/** L'Ghedr unlock progress (unlocks at 75% of ownable spaces claimed OR Round 8, whichever comes first) */
export const ghedrProgress=(G: Game)=>{
  const total=Object.keys(G.props).length;
  const owned=total-unownedCount(G);
  const needed=Math.ceil(total*GHEDR_UNLOCK_PCT);
  return {owned,total,needed,leftToUnlock:Math.max(0,needed-owned),roundsLeft:Math.max(0,GHEDR_UNLOCK_ROUND-G.round),open:!!G.ghedrOpen};
};
/** combined street + building value of city g, 80% total liquidation, 70% heist keep, and 10% Daret cut */
export const chrikaValue=(G: Game,g: GroupId)=>{
  const gi=groupIdx(g,G);
  let total=0;
  for(const i of gi) total+=priceOf(i,G)+(G.props[i]?.houses||0)*houseCost(i,G);
  const payout=Math.round(Math.round(total*CHRIKA_PAYOUT)/10)*10;
  const keep=Math.round(Math.round(total*GHEDR_KEEP)/10)*10;
  const daretCut=Math.max(0,payout-keep);
  const half=Math.ceil(payout/2);
  return {total,payout,keep,daretCut,half,otherHalf:payout-half};
};
/** proportional Clean Exit split between partner `pidA` and `pidB` based on each partner's invested streets + buildings */
export const chrikaExitSplit=(G: Game,g: GroupId,pidA: number,pidB: number)=>{
  const gi=groupIdx(g,G);
  let valA=0, valB=0;
  for(const i of gi){
    const v=priceOf(i,G)+(G.props[i]?.houses||0)*houseCost(i,G);
    if(G.props[i]?.owner===pidA) valA+=v;
    else if(G.props[i]?.owner===pidB) valB+=v;
  }
  const {payout}=chrikaValue(G,g), sum=valA+valB;
  const a=sum>0?Math.round((payout*valA/sum)/10)*10:Math.ceil(payout/2);
  return {a,b:payout-a,payout,valA,valB};
};
