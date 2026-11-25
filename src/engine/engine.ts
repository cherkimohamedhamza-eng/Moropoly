/* ============================================================
   ENGINE (pure on G; runs on the authority only)
   ============================================================ */
import {BARAKA, MEKTOUB} from './cards';
import {COLORS, FAIR_STEP, GROUPS, JAIL_FINE, LOAN_MAX, LOAN_RATE, LOAN_STEP, RAIL_RENT, BILL_DAR, BILL_RIAD, RAIL_SIDE, RIAD_PREMIUM, SALARY, SHUFA_FROM, SHUFA_MARKUP, START_CASH, boardOf} from './data';
import {alive, chrikaOf, chrikaValue, groupIdx, hasCityRights, houseCost, isOwnable, ownedBy, ownsDoubleRent, ownsGroup, priceOf, range, rid, rnd6, shuffle, unmortCost, unownedCount} from './util';
import type {Action, Anim, Deck, Game, GroupId, Payee, Player, Seat, Settings} from './types';

/** how rent is worked out for a landing caused by a card */
export interface RentOpts { railDouble?: boolean; util100?: boolean }
/** the house rules that have numbers, with the classic value when a game does not set them */
export const startCash=(s?: Partial<Settings>)=>s?.cash??START_CASH;
export const salary=(G: Game)=>G.settings.salary??SALARY;
export const jailFine=(G: Game)=>G.settings.fine??JAIL_FINE;
interface GameExtra { mode?: string; code?: string | null; hostCid?: string | null; ack?: Record<string, number> }

export function A(G: Game,o: Anim){G.seq=(G.seq||0)+1; o.n=G.seq; G.anims.push(o); if(G.anims.length>50) G.anims.splice(0,G.anims.length-50);}
export function log(G: Pick<Game,'log'|'event'>,k: string,p?: Record<string, unknown>){const e: [string, Record<string, unknown>]=[k,p||{}]; G.log.unshift(e); if(G.log.length>60) G.log.length=60; G.event=e;}
export function freshGame(seats: Seat[],settings?: Partial<Settings>,extra?: GameExtra): Game{
  extra=extra||{};
  const G: Game={gid:rid(10),status:'play',mode:extra.mode||'local',code:extra.code||null,hostCid:extra.hostCid||null,
    players:seats.map((s,i)=>({id:i,cid:s.cid||null,name:s.name,token:s.token,human:!!s.human,color:COLORS[i],cash:startCash(settings),pos:0,inJail:false,jailTurns:0,goojf:[],bankrupt:false,owes:-1,mt:''})),
    props:{},cur:0,phase:'roll',dice:[3,4],doubles:0,rollAgain:false,daret:0,round:1,turn:1,log:[],settings:Object.assign({daret:true,dlala:true,rounds:25,fast:false,timer:0},settings),
    decks:{mektoub:shuffle(range(MEKTOUB.length)),baraka:shuffle(range(BARAKA.length))},
    pending:null,auction:null,trade:null,card:null,event:'',winner:null,over:false,landed:-1,seq:0,anims:[],ack:extra.ack||{}};
  boardOf(G).spaces.forEach((_,i)=>{if(isOwnable(i,G)) G.props[i]={owner:-1,houses:0,mort:false};});
  log(G,'start',{n:G.players.length,a:startCash(settings)});
  if(G.settings.fairStart){const step=FAIR_STEP[G.players.length]||400; G.players.forEach((p,i)=>{p.cash+=i*step;}); if(G.players.length>1) log(G,'fairStart',{a:step});}
  if(G.settings.deeds) dealDeeds(G);
  return G;
}
/** house rule "deeds": everyone is dealt one of the cheaper properties and one of the dearer ones, the player with
    the cheapest first deed getting the dearest second one, so that every pair is worth about the same. No pair can
    make a whole city: the cheaper and dearer halves of the board share no city. */
function dealDeeds(G: Game){
  const sp=boardOf(G).spaces;
  const props=sp.map((_,i)=>i).filter(i=>sp[i].t==='prop').sort((a,b)=>priceOf(a,G)-priceOf(b,G));
  const n=G.players.length, half=Math.floor(props.length/2); if(n>half) return;
  const cheap=shuffle(props.slice(0,half)).slice(0,n), dear=shuffle(props.slice(half)).slice(0,n).sort((a,b)=>priceOf(b,G)-priceOf(a,G));
  range(n).sort((a,b)=>priceOf(cheap[a],G)-priceOf(cheap[b],G)).forEach((k,j)=>{G.props[cheap[k]].owner=k; G.props[dear[j]].owner=k;});
  log(G,'dealt',{n:2});
}
export function gain(G: Game,p: Player,amt: number){p.cash+=amt; log(G,'collect',{p:p.name,a:amt}); A(G,{k:'fx',f:'gain',pid:p.id,amt});}
export function payTax(G: Game,p: Player,amt: number,why: string,extra?: Record<string, unknown>){pay(G,p,G.settings.daret?'daret':-1,amt,why,extra);}
function payDest(G: Game,to: Payee){return to==='daret'?'@daret':(typeof to==='number'&&to>=0&&G.players[to])?G.players[to].name:'@bank';}
function credit(G: Game,to: Payee,x: number){if(x<=0) return; if(to==='daret') G.daret+=x; else if(typeof to==='number'&&to>=0&&G.players[to]&&!G.players[to].bankrupt) G.players[to].cash+=x;}
export function pay(G: Game,p: Player,to: Payee,amt: number,why: string,extra?: Record<string, unknown>){
  if(amt<=0) return;
  const paid=Math.min(Math.max(0,p.cash),amt), short=amt-paid, dest=payDest(G,to);
  p.cash-=amt; credit(G,to,paid);           // the creditor only receives what the player really has
  if(short>0){
    p.debts=p.debts||[]; p.debts.push({to,amt:short}); p.owes=p.debts[0].to;
    log(G,'payShort',Object.assign({p:p.name,a:amt,b:paid,to:dest,why},extra||{}));
  } else log(G,'pay',Object.assign({p:p.name,a:amt,to:dest,why},extra||{}));
  if(paid>0) A(G,{k:'fx',f:'pay',pid:p.id,to:typeof to==='number'?to:-1,amt:paid});
}
/* money a player raises while in debt (selling, mortgaging, a trade) goes straight to the people they owe */
export function payDebts(G: Game,p: Player){
  const ds=(p.debts||[]).filter(d=>d.amt>0);
  if(!ds.length){p.debts=[]; if(p.cash>=0) p.owes=-1; return;}
  const owed=ds.reduce((x,d)=>x+d.amt,0); let have=Math.max(0,p.cash+owed);
  for(const d of ds){const x=Math.min(have,d.amt); if(x>0){credit(G,d.to,x); d.amt-=x; have-=x; log(G,'debtPaid',{p:p.name,a:x,to:payDest(G,d.to)}); A(G,{k:'fx',f:'pay',pid:p.id,to:typeof d.to==='number'?d.to:-1,amt:x});}}
  p.debts=ds.filter(d=>d.amt>0);
  p.cash=have-p.debts.reduce((x,d)=>x+d.amt,0);
  p.owes=p.debts.length?p.debts[0].to:-1;
}
export function rentFor(G: Game,i: number,opts?: RentOpts){
  opts=opts||{}; const B=boardOf(G), s=B.spaces[i], pr=G.props[i], o=pr.owner;
  if(s.t==='prop') return pr.houses>0?s.rent[pr.houses]:((ownsDoubleRent(G,o,s.g)||!!chrikaOf(G,s.g))?s.rent[0]*2:s.rent[0]);
  if(s.t==='rail'){const n=B.rails.filter(r=>G.props[r].owner===o).length; return (RAIL_RENT[n-1]+(G.settings.train?sideBonus(G,i):0))*(opts.railDouble?2:1);}
  if(s.t==='util'){const n=B.utils.filter(u=>G.props[u].owner===o).length; const mult=n>=3?200:n===2?100:40; return (G.dice[0]+G.dice[1])*(opts.util100?Math.max(100,mult):mult);}
  return 0;
}
/** house rule "train": what the dars and riads on station i's side of the board add to its rent: RAIL_SIDE of what
    they charge, rounded to 10 DH */
export function sideBonus(G: Game,i: number){
  const B=boardOf(G), side=Math.floor(i/B.side); let a=0;
  for(let j=side*B.side+1;j<side*B.side+B.side;j++){const s=B.spaces[j], pr=G.props[j]; if(s.t==='prop'&&pr&&pr.houses>0) a+=s.rent[pr.houses];}
  return Math.round(a*RAIL_SIDE/10)*10;
}
function moveBy(G: Game,p: Player,n: number){
  if(n<=0) return; const B=boardOf(G), from=p.pos; p.pos=(from+n)%B.size;
  A(G,{k:'move',pid:p.id,from,steps:n});
  if(from+n>=B.size){
    let a=salary(G); const poorest=G.settings.solidarity&&isPoorest(G,p);
    if(poorest) a*=2;
    p.cash+=a; log(G,poorest?'passGoSolidarity':'passGo',{p:p.name,a}); A(G,{k:'fx',f:'go',pid:p.id,amt:a});
    if(p.loan) pay(G,p,-1,interestOn(p.loan),'interest');
    if(G.settings.bills) payBills(G,p);
  }
  G.landed=p.pos;
}
/** what player p's bill comes to, for each utility someone else owns (house rule "bills") */
export function billFor(G: Game,p: Player){
  let a=0; for(const k of Object.keys(G.props)){const pr=G.props[+k]; if(pr.owner===p.id&&pr.houses>0) a+=pr.houses>=5?BILL_RIAD:pr.houses*BILL_DAR;}
  return a;
}
function payBills(G: Game,p: Player){
  const a=billFor(G,p); if(!a) return;
  for(const u of boardOf(G).utils){
    const pr=G.props[u], o=pr.owner; if(o<0||o===p.id||pr.mort||G.players[o].bankrupt) continue;
    if(G.settings.jailRent===false&&G.players[o].inJail) continue;
    pay(G,p,o,a,'bill',{s:u});
  }
}
/** house rule "train": the stations player pid may take the train to now. They stopped this turn on a station they
    already owned (one bought on this stop does not count), and ride, once a turn, to another station of their own.
    Mortgaged stations are out of service. */
export function rideTargets(G: Game,pid: number): number[]{
  const B=boardOf(G), p=G.players[pid];
  if(!G.settings.train||pid!==G.cur||!p||p.bankrupt||p.inJail||p.cash<0||G.auction||G.trade||G.chrikaOffer||G.pending) return [];
  if(!(G.phase==='roll'||G.phase==='end')||G.landed!==p.pos||G.atOwnStation!==G.turn||G.rode===G.turn) return [];
  const mine=(i: number)=>G.props[i].owner===pid&&!G.props[i].mort;
  if(!B.rails.includes(p.pos)||!mine(p.pos)) return [];
  return B.rails.filter(r=>r!==p.pos&&mine(r));
}
export const canRide=(G: Game,pid: number)=>rideTargets(G,pid).length>0;
/** the player is worth the least of everyone still playing (ties count) */
export function isPoorest(G: Game,p: Player){const w=netWorth(G,p); return alive(G).filter(q=>q!==p).every(q=>netWorth(G,q)>=w)&&alive(G).length>1;}
/** what a loan costs each time its borrower passes Al Inṭilāq, rounded up to 10 DH */
export const interestOn=(loan: number)=>Math.ceil(loan*LOAN_RATE/10)*10;
/** the price of taking a property with the Shufa, rounded up to 10 DH */
export const shufaPrice=(i: number,G?: Pick<Game,'settings'> | null)=>Math.ceil(priceOf(i,G)*SHUFA_MARKUP/10)*10;
/** house rule "shufa": the player worth the least may take property i now (everything except having the money) */
export function canShufa(G: Game,pid: number,i: number){
  const p=G.players[pid]; if(!G.settings.shufa||G.round<SHUFA_FROM||!p||p.bankrupt||p.shufaUsed||!isOwnable(i,G)) return false;
  const pr=G.props[i], o=pr.owner; if(o<0||o===pid||G.players[o].bankrupt||pr.mort) return false;
  const s=boardOf(G).spaces[i]; if(s.t==='prop'&&(ownsGroup(G,o,s.g)||!!chrikaOf(G,s.g)||groupIdx(s.g,G).some(j=>G.props[j].houses>0))) return false;
  return isPoorest(G,p);      // only the player furthest behind may use it
}
/** house rule "chrika": if pid and one other player together own every street of city g (none mortgaged, neither
    marked Gheddar, 3+ active players, no active Chrika on g), returns the other player's seat id; otherwise -1 */
export function chrikaCandidate(G: Game,pid: number,g: GroupId): number{
  if(!G.settings.chrika||alive(G).length<3||chrikaOf(G,g)) return -1;
  const p=G.players[pid]; if(!p||p.bankrupt||p.gheddar) return -1;
  const gi=groupIdx(g,G); if(gi.length<2) return -1;
  const owners=new Set<number>();
  for(const i of gi){const pr=G.props[i]; if(!pr||pr.owner<0||pr.mort) return -1; owners.add(pr.owner);}
  if(owners.size!==2||!owners.has(pid)) return -1;
  const other=[...owners].find(o=>o!==pid)!;
  const q=G.players[other]; if(!q||q.bankrupt||q.gheddar) return -1;
  return other;
}
export const chrikaCandidates=(G: Game,pid: number)=>(Object.keys(GROUPS) as GroupId[]).map(g=>({g,other:chrikaCandidate(G,pid,g)})).filter(x=>x.other>=0);
/** house rule "chrika": L'Ghedr is allowed on active city g once all properties on the board have been bought */
export function canGhedr(G: Game,pid: number,g: GroupId){
  if(!G.settings.chrika||!G.ghedrOpen||G.over||pid!==G.cur) return false;
  if(G.auction||G.trade||G.chrikaOffer||G.pending||!(G.phase==='roll'||G.phase==='end')) return false;
  const p=G.players[pid]; if(!p||p.bankrupt) return false;
  const c=chrikaOf(G,g); return !!c&&(c.a===pid||c.b===pid);
}
function checkGhedrUnlock(G: Game){
  if(!G.settings.chrika||G.ghedrOpen||unownedCount(G)>0) return;
  G.ghedrOpen=true;
  log(G,'ghedrOpen');
  A(G,{k:'fx',f:'ghedrOpen'});
}
export function moveTo(G: Game,p: Player,t: number){const sz=boardOf(G).size; moveBy(G,p,(t-p.pos+sz)%sz);}
export function jumpTo(G: Game,p: Player,t: number,f?: string){p.pos=t; G.landed=t; A(G,{k:'jump',pid:p.id,to:t,f:f||''});}
export function sendToJail(G: Game,p: Player){jumpTo(G,p,boardOf(G).jail,'jail'); p.inJail=true; p.jailTurns=0; G.rollAgain=false; G.doubles=0; log(G,'toJail',{p:p.name});}
export function land(G: Game,p: Player,opts?: RentOpts){
  const i=p.pos, s=boardOf(G).spaces[i]; G.landed=i;
  switch(s.t){
    case 'prop':case 'rail':case 'util':{
      const pr=G.props[i];
      if(pr.owner===-1){G.pending={type:'buy',idx:i}; log(G,'forSale',{p:p.name,s:i,a:s.price}); A(G,{k:'fx',f:'deed',pid:p.id,idx:i});}
      else if(pr.owner===p.id){log(G,'home',{p:p.name,s:i}); if(s.t==='rail'&&G.settings.train) G.atOwnStation=G.turn;}
      else if(pr.mort) log(G,'mortNoRent',{s:i,o:G.players[pr.owner].name});
      else {
        const ch=s.t==='prop'?chrikaOf(G,s.g):undefined;
        if(ch&&(ch.a===p.id||ch.b===p.id)){log(G,'chrikaFree',{p:p.name,s:i,o:G.players[pr.owner].name});}
        else if(ch){
          const total=rentFor(G,i,opts);
          const partA=Math.round(total*ch.shareA/100), partB=total-partA;
          const jailOff=G.settings.jailRent===false;
          if(partA>0&&!(jailOff&&G.players[ch.a].inJail)) pay(G,p,ch.a,partA,'chrikaRent',{s:i,n:ch.shareA});
          if(partB>0&&!(jailOff&&G.players[ch.b].inJail)) pay(G,p,ch.b,partB,'chrikaRent',{s:i,n:100-ch.shareA});
        }
        else if(G.settings.jailRent===false&&G.players[pr.owner].inJail) log(G,'jailNoRent',{s:i,o:G.players[pr.owner].name});
        else pay(G,p,pr.owner,rentFor(G,i,opts),'rent',{s:i});
      }
      break;}
    case 'tax': payTax(G,p,s.amount,s.why); break;
    case 'mektoub':case 'baraka': drawCard(G,p,s.t); break;
    case 'gojail': sendToJail(G,p); break;
    case 'parking':
      if(G.settings.daret&&G.daret>0){const a=G.daret; G.daret=0; p.cash+=a; log(G,'daret',{p:p.name,a}); A(G,{k:'fx',f:'daret',pid:p.id,amt:a});}
      else log(G,'tea',{p:p.name});
      break;
    case 'go': log(G,'landGo',{p:p.name});
      if(G.settings.goDouble){const a=salary(G); p.cash+=a; log(G,'goDouble',{p:p.name,a}); A(G,{k:'fx',f:'go',pid:p.id,amt:a});}
      break;
    case 'jail': log(G,'visit',{p:p.name}); break;
  }
}
function drawCard(G: Game,p: Player,deck: Deck){
  const d=G.decks[deck]; if(!d.length) return;
  const id=d.shift()!, card=(deck==='mektoub'?MEKTOUB:BARAKA)[id];
  if(card.goojf) p.goojf.push({deck,id}); else d.push(id);
  G.card={deck,id};
  log(G,'draw',{p:p.name,deck,card:[deck,id]});
  A(G,{k:'card',deck,id,pid:p.id});
  if(card.act) card.act(G,p);
}
export function repairs(G: Game,p: Player,perDar: number,perRiad: number){
  let d=0,r=0; ownedBy(G,p.id).forEach(i=>{const h=G.props[i].houses; if(h===5) r++; else d+=h;});
  const amt=d*perDar+r*perRiad;
  if(amt>0) payTax(G,p,amt,'repairs',{d,r}); else log(G,'noBuild',{p:p.name});
}
export function netWorth(G: Game,p: Player){let w=p.cash-(p.loan||0); ownedBy(G,p.id).forEach(i=>{const pr=G.props[i]; w+=pr.mort?priceOf(i,G)/2:priceOf(i,G); if(pr.houses) w+=pr.houses*houseCost(i,G);}); return w;}
export function canBuild(G: Game,i: number,pid: number){const s=boardOf(G).spaces[i],pr=G.props[i]; if(!s||s.t!=='prop'||pr.owner!==pid||pr.houses>=5||!hasCityRights(G,pid,s.g)) return false; const gi=groupIdx(s.g,G); if(gi.some(j=>G.props[j].mort)) return false; const check=chrikaOf(G,s.g)?gi.filter(j=>G.props[j].owner===pid):gi; if(pr.houses>Math.min(...check.map(j=>G.props[j].houses))) return false; return G.players[pid].cash>=houseCost(i,G);}
export function riadCost(G: Game,i: number){return Math.round((5-G.props[i].houses)*houseCost(i,G)*(1+RIAD_PREMIUM));}
export function canRiad(G: Game,i: number,pid: number){const s=boardOf(G).spaces[i],pr=G.props[i]; if(G.settings.riadNow===false||!s||s.t!=='prop'||pr.owner!==pid||pr.houses>=5||!hasCityRights(G,pid,s.g)) return false; if(groupIdx(s.g,G).some(j=>G.props[j].mort)) return false; return G.players[pid].cash>=riadCost(G,i);}
export function canSell(G: Game,i: number,pid: number){const s=boardOf(G).spaces[i],pr=G.props[i]; if(!s||s.t!=='prop'||pr.owner!==pid||pr.houses===0||chrikaOf(G,s.g)) return false; return pr.houses>=Math.max(...groupIdx(s.g,G).map(j=>G.props[j].houses));}
export function canMort(G: Game,i: number,pid: number){const s=boardOf(G).spaces[i],pr=G.props[i]; if(!s||pr.owner!==pid||pr.mort) return false; if(s.t==='prop'&&(chrikaOf(G,s.g)||groupIdx(s.g,G).some(j=>G.props[j].houses>0))) return false; return true;}
export function canUnmort(G: Game,i: number,pid: number){const pr=G.props[i]; return pr.owner===pid&&pr.mort&&G.players[pid].cash>=unmortCost(i,G);}
export function tradeable(G: Game,pid: number){const sp=boardOf(G).spaces; return ownedBy(G,pid).filter(i=>{const s=sp[i]; return s.t!=='prop'||(!chrikaOf(G,s.g)&&groupIdx(s.g,G).every(j=>G.props[j].houses===0));});}
function autoLiquidate(G: Game,p: Player){
  const sp=boardOf(G).spaces;
  const freeProp=(i: number)=>{const s=sp[i]; return s.t!=='prop'||!chrikaOf(G,s.g);};
  let guard=200;
  while(p.cash<0&&guard-->0){
    const built=ownedBy(G,p.id).filter(i=>G.props[i].houses>0&&freeProp(i)).sort((a,b)=>G.props[b].houses-G.props[a].houses);
    if(built.length){const i=built[0]; G.props[i].houses--; p.cash+=houseCost(i,G)/2; continue;}
    const m=ownedBy(G,p.id).filter(i=>!G.props[i].mort&&freeProp(i)).sort((a,b)=>priceOf(a,G)-priceOf(b,G));
    if(m.length){const i=m[0]; G.props[i].mort=true; p.cash+=priceOf(i,G)/2; continue;}
    break;
  }
}
export function goBankrupt(G: Game,p: Player){
  const before=p.cash; autoLiquidate(G,p); if(p.cash>before) log(G,'liquidated',{p:p.name});
  payDebts(G,p);
  if(p.cash>=0){log(G,'saved',{p:p.name}); return false;}   // selling and mortgaging covered the debt
  if(G.chrikas&&G.chrikas.length){
    const had=G.chrikas.filter(c=>c.a===p.id||c.b===p.id);
    if(had.length){G.chrikas=G.chrikas.filter(c=>c.a!==p.id&&c.b!==p.id); had.forEach(c=>log(G,'chrikaEnd',{g:c.g}));}
  }
  const ds=(p.debts||[]); const pc=ds.find(d=>typeof d.to==='number'&&d.to>=0&&G.players[d.to]&&!G.players[d.to].bankrupt);
  const cred=pc?pc.to:(ds.length?ds[0].to:p.owes);
  if(typeof cred==='number'&&cred>=0&&G.players[cred]&&!G.players[cred].bankrupt){
    const c=G.players[cred];
    ownedBy(G,p.id).forEach(i=>{G.props[i].houses=0; G.props[i].owner=cred;});   // already mortgaged above
    p.goojf.forEach(g=>c.goojf.push(g));
    log(G,'bankTo',{p:p.name,o:c.name});
  } else {
    ownedBy(G,p.id).forEach(i=>{G.props[i]={owner:-1,houses:0,mort:false};});
    p.goojf.forEach(g=>G.decks[g.deck].push(g.id));
    log(G,'bankBank',{p:p.name});
  }
  A(G,{k:'fx',f:'bankrupt',pid:p.id});
  p.cash=0; p.debts=[]; p.owes=-1; p.goojf=[]; p.bankrupt=true; p.inJail=false; if(p.loan) p.loan=0;
  if(G.trade&&(G.trade.from===p.id||G.trade.to===p.id)) G.trade=null;
  if(G.chrikaOffer&&(G.chrikaOffer.from===p.id||G.chrikaOffer.to===p.id)) delete G.chrikaOffer;
  if(G.auction){G.auction.bidders=G.auction.bidders.filter(id=>id!==p.id); if(G.auction.highBidder===p.id){G.auction.highBidder=-1;G.auction.high=0;} if(G.auction.turn>=G.auction.bidders.length) G.auction.turn=0;}
  if(alive(G).length<=2&&G.chrikas&&G.chrikas.length){G.chrikas=[]; delete G.chrikaOffer; log(G,'chrikaEnd2');}
  if(alive(G).length<=1) finishGame(G);
  return true;
}
function finishGame(G: Game){
  if(G.over) return;
  G.over=true; G.phase='over';
  const rank=[...G.players].sort((a,b)=>(+a.bankrupt - +b.bankrupt)||netWorth(G,b)-netWorth(G,a));
  G.winner=rank[0].id;
  log(G,'win',{p:rank[0].name,a:netWorth(G,rank[0])});
  A(G,{k:'fx',f:'win',pid:rank[0].id});
}
export function settle(G: Game){
  G.players.forEach(p=>{
    if(p.bankrupt||p.cash>=0) return;
    if(p.id===G.cur&&p.human) return;
    goBankrupt(G,p);
  });
  if(G.over) return;
  checkGhedrUnlock(G);
  const p=G.players[G.cur];
  if(p.bankrupt){nextTurn(G); return;}
  if(G.auction) G.phase='auction';
  else if(G.pending) G.phase='buy';
  else G.phase=(G.rollAgain&&!p.inJail)?'roll':'end';
}
function nextTurn(G: Game){
  if(G.over) return;
  G.card=null; G.doubles=0; G.rollAgain=false; G.pending=null; G.trade=null; delete G.chrikaOffer; delete G.drafting;
  const n=G.players.length; let k=G.cur;
  for(let s=0;s<n;s++){k=(k+1)%n; if(!G.players[k].bankrupt) break;}
  if(k<=G.cur){G.round++; if(G.settings.rounds&&G.round>G.settings.rounds){G.round=G.settings.rounds; finishGame(G); return;}}
  G.cur=k; G.turn++; G.phase='roll'; G.landed=-1;
  G.event=['turn',{p:G.players[k].name}];
  A(G,{k:'turn',pid:k});
}
/** whose move it is: the player answering a trade or Chrika offer, the next bidder in an auction, or the current player */
export function actorOf(G: Game | null){
  if(!G||G.status!=='play'||G.over) return -1;
  if(G.trade) return G.trade.to;
  if(G.chrikaOffer) return G.chrikaOffer.to;
  if(G.auction) return G.auction.bidders[G.auction.turn];
  return G.cur;
}
/** the amount in a borrow or repay move */
const a_=(a: Action)=>(a as {a: number|string}).a;
/* apply one action for seat; returns true when state changed */
export function apply(G: Game,seat: number,a: Action){
  const ok=applyCore(G,seat,a);
  if(ok&&G.players) G.players.forEach(q=>{if(!q.bankrupt&&q.debts&&q.debts.length) payDebts(G,q);});
  return ok;
}
function applyCore(G: Game,seat: number,a: Action){
  if(!G||G.status!=='play'||G.over||!a) return false;
  const p=G.players[seat]; if(!p||p.bankrupt) return false;
  const isCur=seat===G.cur, free=!G.auction&&!G.trade&&!G.chrikaOffer;
  switch(a.t){
    case 'roll':{
      if(!isCur||!free||G.phase!=='roll'||p.cash<0) return false;
      G.card=null; const d1=rnd6(),d2=rnd6(); G.dice=[d1,d2]; const dbl=d1===d2;
      A(G,{k:'dice',d:[d1,d2],pid:p.id});
      if(p.inJail){
        G.rollAgain=false;
        if(dbl){p.inJail=false;p.jailTurns=0;log(G,'jailDouble',{p:p.name});moveBy(G,p,d1+d2);land(G,p);}
        else{p.jailTurns++;
          if(p.jailTurns>=3){p.inJail=false;p.jailTurns=0;payTax(G,p,jailFine(G),'jail');moveBy(G,p,d1+d2);land(G,p);}
          else log(G,'jailStay',{p:p.name,d1,d2,n:p.jailTurns});}
      } else {
        if(dbl){G.doubles++; if(G.doubles>=3){log(G,'threeDoubles',{p:p.name}); sendToJail(G,p); settle(G); return true;}}
        else G.doubles=0;
        G.rollAgain=dbl; log(G,'rolls',{p:p.name,d1,d2}); moveBy(G,p,d1+d2); land(G,p);
      }
      settle(G); return true;}
    case 'buy':{
      if(!isCur||G.phase!=='buy'||!G.pending) return false;
      const i=G.pending.idx,price=priceOf(i,G); if(p.cash<price) return false;
      p.cash-=price; G.props[i].owner=p.id; G.pending=null;
      log(G,'buys',{p:p.name,s:i,a:price}); A(G,{k:'fx',f:'buy',pid:p.id,idx:i});
      settle(G); return true;}
    case 'decline':{
      if(!isCur||G.phase!=='buy'||!G.pending) return false;
      const i=G.pending.idx; G.pending=null;
      if(G.settings.dlala){
        const n=G.players.length,order: number[]=[]; for(let s=1;s<=n;s++){const k=(G.cur+s)%n; if(!G.players[k].bankrupt) order.push(k);}
        G.auction={idx:i,bidders:order,turn:0,high:0,highBidder:-1};
        log(G,'dlalaOpen',{s:i}); A(G,{k:'fx',f:'dlala',idx:i});
      } else log(G,'passOn',{p:p.name,s:i});
      settle(G); return true;}
    case 'bid':case 'pass':{
      const au=G.auction; if(!au||au.bidders[au.turn]!==seat) return false;
      if(a.t==='bid'){const inc=[100,500,1000].includes(a.inc as number)?a.inc as number:100; const amt=au.high+inc; if(amt>p.cash) return false; au.high=amt; au.highBidder=seat; au.turn=(au.turn+1)%au.bidders.length; log(G,'bids',{p:p.name,a:amt,s:au.idx});}
      else{au.bidders.splice(au.turn,1); if(au.turn>=au.bidders.length) au.turn=0; log(G,'leaveAuc',{p:p.name});}
      if(au.bidders.length===0||(au.bidders.length===1&&au.highBidder===au.bidders[0])){
        if(au.highBidder>=0){const w=G.players[au.highBidder]; w.cash-=au.high; G.props[au.idx].owner=w.id; log(G,'sold',{p:w.name,s:au.idx,a:au.high}); A(G,{k:'fx',f:'buy',pid:w.id,idx:au.idx});}
        else log(G,'noBids',{s:au.idx});
        G.auction=null;
      }
      settle(G); return true;}
    case 'end':{
      if(!isCur||!free||G.phase!=='end'||p.cash<0) return false;
      nextTurn(G); return true;}
    case 'fine':{
      if(!isCur||!free||!p.inJail||G.phase!=='roll'||p.cash<jailFine(G)) return false;
      payTax(G,p,jailFine(G),'jail'); p.inJail=false; p.jailTurns=0; return true;}
    case 'card':{
      if(!isCur||!free||!p.inJail||G.phase!=='roll'||!p.goojf.length) return false;
      const c=p.goojf.pop()!; G.decks[c.deck].push(c.id); p.inJail=false; p.jailTurns=0; log(G,'useCard',{p:p.name}); return true;}
    case 'build':case 'riad':case 'sell':case 'mort':case 'unmort':{
      const i=+a.i; if(!isCur||!free||!isOwnable(i,G)) return false;
      if(a.t==='riad'){if(!canRiad(G,i,seat)) return false; p.cash-=riadCost(G,i); G.props[i].houses=5; log(G,'riadNow',{p:p.name,s:i}); A(G,{k:'fx',f:'build',idx:i,pid:seat});}
      if(a.t==='build'){if(!canBuild(G,i,seat)) return false; p.cash-=houseCost(i,G); G.props[i].houses++; log(G,G.props[i].houses===5?'buildRiad':'buildDar',{p:p.name,s:i}); A(G,{k:'fx',f:'build',idx:i,pid:seat});}
      if(a.t==='sell'){if(!canSell(G,i,seat)) return false; G.props[i].houses--; p.cash+=houseCost(i,G)/2; log(G,'sellB',{p:p.name,s:i,a:houseCost(i,G)/2});}
      if(a.t==='mort'){if(!canMort(G,i,seat)) return false; G.props[i].mort=true; p.cash+=priceOf(i,G)/2; log(G,'mort',{p:p.name,s:i,a:priceOf(i,G)/2});}
      if(a.t==='unmort'){if(!canUnmort(G,i,seat)) return false; p.cash-=unmortCost(i,G); G.props[i].mort=false; log(G,'unmort',{p:p.name,s:i});}
      return true;}
    case 'manage':{ // computer players only: unmortgage and build in one go
      if(p.human||!isCur||!free) return false;
      p.mt=`${G.turn}:${G.phase}`;
      const res=G.round<6?1500:2500;
      ownedBy(G,p.id).filter(i=>G.props[i].mort).forEach(i=>{if(p.cash-unmortCost(i,G)>res*2){p.cash-=unmortCost(i,G);G.props[i].mort=false;}});
      let built=0,guard=60;
      while(guard-->0){const o=Object.keys(G.props).map(Number).filter(i=>canBuild(G,i,p.id)&&p.cash-houseCost(i,G)>=res).sort((x,y)=>G.props[x].houses-G.props[y].houses||priceOf(y,G)-priceOf(x,G)); if(!o.length) break; const i=o[0]; p.cash-=houseCost(i,G); G.props[i].houses++; built++; A(G,{k:'fx',f:'build',idx:i,pid:p.id});}
      if(built) log(G,'botBuild',{p:p.name,n:built});
      return true;}
    case 'bankrupt':{
      if(!isCur||p.cash>=0) return false;
      goBankrupt(G,p); settle(G); return true;}
    case 'trade':{
      if(!isCur||!free||G.pending) return false;
      const to=+a.to, b=G.players[to]; if(!b||b.bankrupt||to===seat) return false;
      const give=(a.give||[]).map(Number), get=(a.get||[]).map(Number);
      const tg=tradeable(G,seat), tb=tradeable(G,to);
      if(!give.every(i=>tg.includes(i))||!get.every(i=>tb.includes(i))) return false;
      const cg=Math.max(0,Math.round(+a.cashGive!||0)), ct=Math.max(0,Math.round(+a.cashGet!||0));
      if(cg>Math.max(0,p.cash)||ct>Math.max(0,b.cash)) return false;
      if(!give.length&&!get.length&&!cg&&!ct) return false;
      G.trade={from:seat,to,give,get,cashGive:cg,cashGet:ct}; delete G.drafting;
      log(G,'offer',{p:p.name,o:b.name}); return true;}
    case 'tradeReply':{
      const t=G.trade; if(!t||t.to!==seat) return false;
      if(a.accept){
        const A1=G.players[t.from],B1=G.players[t.to];
        const ok=t.give.every(i=>G.props[i].owner===A1.id)&&t.get.every(i=>G.props[i].owner===B1.id)&&t.cashGive<=Math.max(0,A1.cash)&&t.cashGet<=Math.max(0,B1.cash);
        if(ok){t.give.forEach(i=>G.props[i].owner=B1.id); t.get.forEach(i=>G.props[i].owner=A1.id); A1.cash+=t.cashGet-t.cashGive; B1.cash+=t.cashGive-t.cashGet; log(G,'deal',{p:A1.name,o:B1.name}); A(G,{k:'fx',f:'deal',pid:A1.id,to:B1.id});}
        else log(G,'tradeVoid');
      } else log(G,'refuse',{p:p.name});
      G.trade=null; settle(G); return true;}
    case 'drafting':{ // only matters to the turn timer, so only with one
      if(a.on){if(!G.settings.timer||!isCur||!free||G.pending||G.drafting===seat) return false; G.drafting=seat; return true;}
      if(G.drafting!==seat) return false; delete G.drafting; return true;}
    case 'tradeCancel':{
      if(!G.trade||G.trade.from!==seat) return false; G.trade=null; log(G,'withdraw',{p:p.name}); return true;}
    case 'borrow':{ // house rule "credit": one loan at a time, also to get out of debt
      const amt=Math.round(+a_(a)); if(!G.settings.credit||!isCur||!free||p.loan||!(amt>=LOAN_STEP&&amt<=LOAN_MAX&&amt%LOAN_STEP===0)) return false;
      p.cash+=amt; p.loan=amt; log(G,'borrow',{p:p.name,a:amt,b:interestOn(amt)}); A(G,{k:'fx',f:'gain',pid:p.id,amt});
      return true;}   // the turn carries on where it was; apply() then pays any debts from the loan
    case 'repay':{
      const amt=Math.min(Math.round(+a_(a)),p.loan||0); if(!isCur||!free||!(amt>0)||p.cash<amt) return false;
      p.cash-=amt; p.loan=(p.loan||0)-amt; log(G,p.loan?'repay':'repayAll',{p:p.name,a:amt,b:p.loan}); A(G,{k:'fx',f:'pay',pid:p.id,to:-1,amt});
      return true;}
    case 'ride':{ // house rule "train": between the player's own stations, free
      const to=+(a as {to: number|string}).to; if(!rideTargets(G,seat).includes(to)) return false;
      G.rode=G.turn; log(G,'ride',{p:p.name,s:to});
      jumpTo(G,p,to,'train'); settle(G); return true;}
    case 'shufa':{ // house rule "shufa": a forced sale, paid in full to the owner
      const i=+(a as {i: number|string}).i; if(!isCur||!free||G.pending||!(G.phase==='roll'||G.phase==='end')||!canShufa(G,seat,i)) return false;
      const price=shufaPrice(i,G), o=G.players[G.props[i].owner]; if(p.cash<price) return false;
      p.cash-=price; o.cash+=price; G.props[i].owner=p.id; p.shufaUsed=true;
      log(G,'shufa',{p:p.name,o:o.name,s:i,a:price}); A(G,{k:'fx',f:'pay',pid:p.id,to:o.id,amt:price}); A(G,{k:'fx',f:'buy',pid:p.id,idx:i});
      return true;}
    case 'chrikaPropose':{ // house rule "chrika": propose a shared-city partnership
      if(!isCur||!free||G.pending||!(G.phase==='roll'||G.phase==='end')||p.cash<0) return false;
      const g=a.g; if(!GROUPS[g]) return false;
      const other=chrikaCandidate(G,seat,g); if(other<0) return false;
      const share=Math.max(20,Math.min(80,Math.round((+(a.share)||50)/10)*10));
      p.chrikaTried=G.turn;
      G.chrikaOffer={kind:'form',g,from:seat,to:other,shareFrom:share}; delete G.drafting;
      log(G,'chrikaOffer',{p:p.name,o:G.players[other].name,g,n:share,m:100-share}); return true;}
    case 'chrikaExit':{ // house rule "chrika": propose a clean 50/50 exit (sell all to bank at 80%)
      if(!isCur||!free||G.pending||!(G.phase==='roll'||G.phase==='end')) return false;
      const g=a.g, ch=chrikaOf(G,g); if(!ch||(ch.a!==seat&&ch.b!==seat)) return false;
      const other=ch.a===seat?ch.b:ch.a;
      G.chrikaOffer={kind:'exit',g,from:seat,to:other}; delete G.drafting;
      log(G,'chrikaExitOffer',{p:p.name,o:G.players[other].name,g}); return true;}
    case 'chrikaReply':{
      const o=G.chrikaOffer; if(!o||o.to!==seat) return false;
      const wasRoll=G.phase==='roll';
      G.chrikaOffer=null;
      if(!a.accept){log(G,'chrikaRefuse',{p:p.name,g:o.g}); if(!wasRoll) settle(G); return true;}
      if(o.kind==='form'){
        if(chrikaCandidate(G,o.from,o.g)===o.to){
          const share=o.shareFrom??50;
          G.chrikas=G.chrikas||[];
          G.chrikas.push({g:o.g,a:o.from,b:o.to,shareA:share});
          log(G,'chrikaDeal',{p:G.players[o.from].name,o:p.name,g:o.g,n:share,m:100-share});
          A(G,{k:'fx',f:'chrika',pid:o.from,to:o.to,g:o.g});
        } else log(G,'tradeVoid');
      } else {
        const ch=chrikaOf(G,o.g);
        if(ch&&(ch.a===o.from||ch.b===o.from)){
          const {half,otherHalf}=chrikaValue(G,o.g);
          groupIdx(o.g,G).forEach(i=>{G.props[i]={owner:-1,houses:0,mort:false};});
          G.chrikas=(G.chrikas||[]).filter(c=>c.g!==o.g);
          G.players[o.from].cash+=half; p.cash+=otherHalf;
          payDebts(G,G.players[o.from]); payDebts(G,p);
          log(G,'chrikaExit',{p:G.players[o.from].name,o:p.name,g:o.g,a:half});
          A(G,{k:'fx',f:'chrikaExit',pid:o.from,to:o.to,amt:half,g:o.g});
        } else log(G,'tradeVoid');
      }
      if(!wasRoll) settle(G); return true;}
    case 'chrikaCancel':{
      if(!G.chrikaOffer||G.chrikaOffer.from!==seat) return false;
      G.chrikaOffer=null; log(G,'withdraw',{p:p.name}); return true;}
    case 'ghedr':{ // house rule "chrika": L'Ghedr — liquidate city to bank at 80%, pocket all cash, go to 3okacha as Gheddar
      if(!canGhedr(G,seat,a.g)) return false;
      const ch=chrikaOf(G,a.g)!; const victim=ch.a===seat?ch.b:ch.a;
      const {payout}=chrikaValue(G,a.g);
      groupIdx(a.g,G).forEach(i=>{G.props[i]={owner:-1,houses:0,mort:false};});
      G.chrikas=(G.chrikas||[]).filter(c=>c.g!==a.g);
      p.cash+=payout; p.gheddar=true; payDebts(G,p);
      jumpTo(G,p,boardOf(G).jail,'jail');
      p.inJail=true; p.jailTurns=0; G.rollAgain=false; G.doubles=0;
      log(G,'ghedr',{p:p.name,o:G.players[victim].name,g:a.g,a:payout});
      A(G,{k:'fx',f:'ghedr',pid:seat,to:victim,amt:payout,g:a.g});
      settle(G); return true;}
  }
  return false;
}
