/* ============================================================
   HELPERS (pure)
   ============================================================ */
import {GROUPS, SP} from './data';
import type {Game, GroupId, OwnableSpace, PropSpace} from './types';

export const rnd6=()=>1+Math.floor(Math.random()*6);
export const shuffle=<T>(a: T[])=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export const range=(n: number)=>Array.from({length:n},(_,i)=>i);
export const clone=<T>(o: T): T=>JSON.parse(JSON.stringify(o));
export const rid=(n: number)=>{const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';for(let i=0;i<n;i++) s+=a[Math.floor(Math.random()*a.length)];return s;};
export const isOwnable=(i: number)=>['prop','rail','util'].includes(SP[i].t);
/** price of a property, station or utility */
export const priceOf=(i: number)=>(SP[i] as OwnableSpace).price;
export const nextOf=(pos: number,list: number[])=>{for(const x of list) if(x>pos) return x; return list[0];};
export const groupIdx=(g: GroupId)=>SP.map((s,i)=>s.t==='prop'&&s.g===g?i:-1).filter(i=>i>=0);
export const houseCost=(i: number)=>GROUPS[(SP[i] as PropSpace).g].house;
export const colorOf=(i: number)=>{const s=SP[i]; if(s.t==='prop') return GROUPS[s.g].color; if(s.t==='rail') return '#4a5059'; if(s.t==='util') return '#9aa3ad'; return '#777';};
export const unmortCost=(i: number)=>Math.ceil(priceOf(i)*0.55/10)*10;
export const alive=(G: Game)=>G.players.filter(p=>!p.bankrupt);
export const ownsGroup=(G: Game,pid: number,g: GroupId)=>groupIdx(g).every(i=>G.props[i].owner===pid);
export const ownedBy=(G: Game,pid: number)=>Object.keys(G.props).map(Number).filter(i=>G.props[i].owner===pid);
