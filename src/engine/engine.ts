/* ============================================================
   ENGINE (pure on G; runs on the authority only)
   ============================================================ */
import {BARAKA, MEKTOUB} from './cards';
import {COLORS, JAIL_FINE, RAILS, RAIL_RENT, SALARY, SP, START_CASH, UTILS} from './data';
import {alive, groupIdx, houseCost, isOwnable, ownedBy, ownsGroup, priceOf, range, rid, rnd6, shuffle, unmortCost} from './util';
import type {Action, Anim, Deck, Game, Payee, Player, Seat, Settings} from './types';

/** how rent is worked out for a landing caused by a card */
export interface RentOpts { railDouble?: boolean; util100?: boolean }
interface GameExtra { mode?: string; code?: string | null; hostCid?: string | null; ack?: Record<string, number> }

export function A(G: Game,o: Anim){G.seq=(G.seq||0)+1; o.n=G.seq; G.anims.push(o); if(G.anims.length>50) G.anims.splice(0,G.anims.length-50);}
export function log(G: Game,k: string,p?: Record<string, unknown>){const e: [string, Record<string, unknown>]=[k,p||{}]; G.log.unshift(e); if(G.log.length>60) G.log.length=60; G.event=e;}
export function freshGame(seats: Seat[],settings?: Partial<Settings>,extra?: GameExtra): Game{
  extra=extra||{};
  const G: Game={gid:rid(10),status:'play',mode:extra.mode||'local',code:extra.code||null,hostCid:extra.hostCid||null,
    players:seats.map((s,i)=>({id:i,cid:s.cid||null,name:s.name,token:s.token,human:!!s.human,color:COLORS[i],cash:START_CASH,pos:0,inJail:false,jailTurns:0,goojf:[],bankrupt:false,owes:-1,mt:''})),
    props:{},cur:0,phase:'roll',dice:[3,4],doubles:0,rollAgain:false,daret:0,round:1,turn:1,log:[],settings:Object.assign({daret:true,dlala:true,rounds:25,fast:false,timer:0},settings),
    decks:{mektoub:shuffle(range(MEKTOUB.length)),baraka:shuffle(range(BARAKA.length))},
    pending:null,auction:null,trade:null,card:null,event:'',winner:null,over:false,landed:-1,seq:0,anims:[],ack:extra.ack||{}};
  SP.forEach((s,i)=>{if(isOwnable(i)) G.props[i]={owner:-1,houses:0,mort:false};});
  log(G,'start',{n:G.players.length,a:START_CASH});
  return G;
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
  opts=opts||{}; const s=SP[i],pr=G.props[i],o=pr.owner;
  if(s.t==='prop') return pr.houses>0?s.rent[pr.houses]:(ownsGroup(G,o,s.g)?s.rent[0]*2:s.rent[0]);
  if(s.t==='rail'){const n=RAILS.filter(r=>G.props[r].owner===o).length; return RAIL_RENT[n-1]*(opts.railDouble?2:1);}
  if(s.t==='util'){const n=UTILS.filter(u=>G.props[u].owner===o).length; return (G.dice[0]+G.dice[1])*(opts.util100||n===2?100:40);}
  return 0;
}
function moveBy(G: Game,p: Player,n: number){
  if(n<=0) return; const from=p.pos; p.pos=(from+n)%40;
  A(G,{k:'move',pid:p.id,from,steps:n});
  if(from+n>=40){p.cash+=SALARY; log(G,'passGo',{p:p.name,a:SALARY}); A(G,{k:'fx',f:'go',pid:p.id,amt:SALARY});}
  G.landed=p.pos;
}
export function moveTo(G: Game,p: Player,t: number){moveBy(G,p,(t-p.pos+40)%40);}
export function jumpTo(G: Game,p: Player,t: number,f?: string){p.pos=t; G.landed=t; A(G,{k:'jump',pid:p.id,to:t,f:f||''});}
export function sendToJail(G: Game,p: Player){jumpTo(G,p,10,'jail'); p.inJail=true; p.jailTurns=0; G.rollAgain=false; G.doubles=0; log(G,'toJail',{p:p.name});}
export function land(G: Game,p: Player,opts?: RentOpts){
  const i=p.pos,s=SP[i]; G.landed=i;
  switch(s.t){
    case 'prop':case 'rail':case 'util':{
      const pr=G.props[i];
      if(pr.owner===-1){G.pending={type:'buy',idx:i}; log(G,'forSale',{p:p.name,s:i,a:s.price}); A(G,{k:'fx',f:'deed',pid:p.id,idx:i});}
      else if(pr.owner===p.id) log(G,'home',{p:p.name,s:i});
      else if(pr.mort) log(G,'mortNoRent',{s:i,o:G.players[pr.owner].name});
      else pay(G,p,pr.owner,rentFor(G,i,opts),'rent',{s:i});
      break;}
    case 'tax': payTax(G,p,s.amount,s.why); break;
    case 'mektoub':case 'baraka': drawCard(G,p,s.t); break;
    case 'gojail': sendToJail(G,p); break;
    case 'parking':
      if(G.settings.daret&&G.daret>0){const a=G.daret; G.daret=0; p.cash+=a; log(G,'daret',{p:p.name,a}); A(G,{k:'fx',f:'daret',pid:p.id,amt:a});}
      else log(G,'tea',{p:p.name});
      break;
    case 'go': log(G,'landGo',{p:p.name}); break;
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
export function netWorth(G: Game,p: Player){let w=p.cash; ownedBy(G,p.id).forEach(i=>{const pr=G.props[i]; w+=pr.mort?priceOf(i)/2:priceOf(i); if(pr.houses) w+=pr.houses*houseCost(i);}); return w;}
export function canBuild(G: Game,i: number,pid: number){const s=SP[i],pr=G.props[i]; if(s.t!=='prop'||pr.owner!==pid||pr.houses>=5||!ownsGroup(G,pid,s.g)) return false; const gi=groupIdx(s.g); if(gi.some(j=>G.props[j].mort)) return false; if(pr.houses>Math.min(...gi.map(j=>G.props[j].houses))) return false; return G.players[pid].cash>=houseCost(i);}
export function riadCost(G: Game,i: number){return (5-G.props[i].houses)*houseCost(i);}
export function canRiad(G: Game,i: number,pid: number){const s=SP[i],pr=G.props[i]; if(s.t!=='prop'||pr.owner!==pid||pr.houses>=5||!ownsGroup(G,pid,s.g)) return false; if(groupIdx(s.g).some(j=>G.props[j].mort)) return false; return G.players[pid].cash>=riadCost(G,i);}
export function canSell(G: Game,i: number,pid: number){const s=SP[i],pr=G.props[i]; if(s.t!=='prop'||pr.owner!==pid||pr.houses===0) return false; return pr.houses>=Math.max(...groupIdx(s.g).map(j=>G.props[j].houses));}
export function canMort(G: Game,i: number,pid: number){const s=SP[i],pr=G.props[i]; if(pr.owner!==pid||pr.mort) return false; if(s.t==='prop'&&groupIdx(s.g).some(j=>G.props[j].houses>0)) return false; return true;}
export function canUnmort(G: Game,i: number,pid: number){const pr=G.props[i]; return pr.owner===pid&&pr.mort&&G.players[pid].cash>=unmortCost(i);}
export function tradeable(G: Game,pid: number){return ownedBy(G,pid).filter(i=>{const s=SP[i]; return s.t!=='prop'||groupIdx(s.g).every(j=>G.props[j].houses===0);});}
function autoLiquidate(G: Game,p: Player){
  let guard=200;
  while(p.cash<0&&guard-->0){
    const built=ownedBy(G,p.id).filter(i=>G.props[i].houses>0).sort((a,b)=>G.props[b].houses-G.props[a].houses);
    if(built.length){const i=built[0]; G.props[i].houses--; p.cash+=houseCost(i)/2; continue;}
    const m=ownedBy(G,p.id).filter(i=>!G.props[i].mort).sort((a,b)=>priceOf(a)-priceOf(b));
    if(m.length){const i=m[0]; G.props[i].mort=true; p.cash+=priceOf(i)/2; continue;}
    break;
  }
}
export function goBankrupt(G: Game,p: Player){
  const before=p.cash; autoLiquidate(G,p); if(p.cash>before) log(G,'liquidated',{p:p.name});
  payDebts(G,p);
  if(p.cash>=0){log(G,'saved',{p:p.name}); return false;}   // selling and mortgaging covered the debt
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
  p.cash=0; p.debts=[]; p.owes=-1; p.goojf=[]; p.bankrupt=true; p.inJail=false;
  if(G.trade&&(G.trade.from===p.id||G.trade.to===p.id)) G.trade=null;
  if(G.auction){G.auction.bidders=G.auction.bidders.filter(id=>id!==p.id); if(G.auction.highBidder===p.id){G.auction.highBidder=-1;G.auction.high=0;} if(G.auction.turn>=G.auction.bidders.length) G.auction.turn=0;}
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
  const p=G.players[G.cur];
  if(p.bankrupt){nextTurn(G); return;}
  if(G.auction) G.phase='auction';
  else if(G.pending) G.phase='buy';
  else G.phase=(G.rollAgain&&!p.inJail)?'roll':'end';
}
function nextTurn(G: Game){
  if(G.over) return;
  G.card=null; G.doubles=0; G.rollAgain=false; G.pending=null; G.trade=null;
  const n=G.players.length; let k=G.cur;
  for(let s=0;s<n;s++){k=(k+1)%n; if(!G.players[k].bankrupt) break;}
  if(k<=G.cur){G.round++; if(G.settings.rounds&&G.round>G.settings.rounds){G.round=G.settings.rounds; finishGame(G); return;}}
  G.cur=k; G.turn++; G.phase='roll'; G.landed=-1;
  G.event=['turn',{p:G.players[k].name}];
  A(G,{k:'turn',pid:k});
}
/** whose move it is: the player answering a trade offer, the next bidder in an auction, or the current player */
export function actorOf(G: Game | null){
  if(!G||G.status!=='play'||G.over) return -1;
  if(G.trade) return G.trade.to;
  if(G.auction) return G.auction.bidders[G.auction.turn];
  return G.cur;
}
/* apply one action for seat; returns true when state changed */
export function apply(G: Game,seat: number,a: Action){
  const ok=applyCore(G,seat,a);
  if(ok&&G.players) G.players.forEach(q=>{if(!q.bankrupt&&q.debts&&q.debts.length) payDebts(G,q);});
  return ok;
}
function applyCore(G: Game,seat: number,a: Action){
  if(!G||G.status!=='play'||G.over||!a) return false;
  const p=G.players[seat]; if(!p||p.bankrupt) return false;
  const isCur=seat===G.cur, free=!G.auction&&!G.trade;
  switch(a.t){
    case 'roll':{
      if(!isCur||!free||G.phase!=='roll'||p.cash<0) return false;
      G.card=null; const d1=rnd6(),d2=rnd6(); G.dice=[d1,d2]; const dbl=d1===d2;
      A(G,{k:'dice',d:[d1,d2],pid:p.id});
      if(p.inJail){
        G.rollAgain=false;
        if(dbl){p.inJail=false;p.jailTurns=0;log(G,'jailDouble',{p:p.name});moveBy(G,p,d1+d2);land(G,p);}
        else{p.jailTurns++;
          if(p.jailTurns>=3){p.inJail=false;p.jailTurns=0;payTax(G,p,JAIL_FINE,'jail');moveBy(G,p,d1+d2);land(G,p);}
          else log(G,'jailStay',{p:p.name,d1,d2,n:p.jailTurns});}
      } else {
        if(dbl){G.doubles++; if(G.doubles>=3){log(G,'threeDoubles',{p:p.name}); sendToJail(G,p); settle(G); return true;}}
        else G.doubles=0;
        G.rollAgain=dbl; log(G,'rolls',{p:p.name,d1,d2}); moveBy(G,p,d1+d2); land(G,p);
      }
      settle(G); return true;}
    case 'buy':{
      if(!isCur||G.phase!=='buy'||!G.pending) return false;
      const i=G.pending.idx,price=priceOf(i); if(p.cash<price) return false;
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
      if(!isCur||!free||!p.inJail||G.phase!=='roll'||p.cash<JAIL_FINE) return false;
      payTax(G,p,JAIL_FINE,'jail'); p.inJail=false; p.jailTurns=0; return true;}
    case 'card':{
      if(!isCur||!free||!p.inJail||G.phase!=='roll'||!p.goojf.length) return false;
      const c=p.goojf.pop()!; G.decks[c.deck].push(c.id); p.inJail=false; p.jailTurns=0; log(G,'useCard',{p:p.name}); return true;}
    case 'build':case 'riad':case 'sell':case 'mort':case 'unmort':{
      const i=+a.i; if(!isCur||!free||!isOwnable(i)) return false;
      if(a.t==='riad'){if(!canRiad(G,i,seat)) return false; p.cash-=riadCost(G,i); G.props[i].houses=5; log(G,'riadNow',{p:p.name,s:i}); A(G,{k:'fx',f:'build',idx:i,pid:seat});}
      if(a.t==='build'){if(!canBuild(G,i,seat)) return false; p.cash-=houseCost(i); G.props[i].houses++; log(G,G.props[i].houses===5?'buildRiad':'buildDar',{p:p.name,s:i}); A(G,{k:'fx',f:'build',idx:i,pid:seat});}
      if(a.t==='sell'){if(!canSell(G,i,seat)) return false; G.props[i].houses--; p.cash+=houseCost(i)/2; log(G,'sellB',{p:p.name,s:i,a:houseCost(i)/2});}
      if(a.t==='mort'){if(!canMort(G,i,seat)) return false; G.props[i].mort=true; p.cash+=priceOf(i)/2; log(G,'mort',{p:p.name,s:i,a:priceOf(i)/2});}
      if(a.t==='unmort'){if(!canUnmort(G,i,seat)) return false; p.cash-=unmortCost(i); G.props[i].mort=false; log(G,'unmort',{p:p.name,s:i});}
      return true;}
    case 'manage':{ // computer players only: unmortgage and build in one go
      if(p.human||!isCur||!free) return false;
      p.mt=`${G.turn}:${G.phase}`;
      const res=G.round<6?1500:2500;
      ownedBy(G,p.id).filter(i=>G.props[i].mort).forEach(i=>{if(p.cash-unmortCost(i)>res*2){p.cash-=unmortCost(i);G.props[i].mort=false;}});
      let built=0,guard=60;
      while(guard-->0){const o=Object.keys(G.props).map(Number).filter(i=>canBuild(G,i,p.id)&&p.cash-houseCost(i)>=res).sort((x,y)=>G.props[x].houses-G.props[y].houses||priceOf(y)-priceOf(x)); if(!o.length) break; const i=o[0]; p.cash-=houseCost(i); G.props[i].houses++; built++; A(G,{k:'fx',f:'build',idx:i,pid:p.id});}
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
      G.trade={from:seat,to,give,get,cashGive:cg,cashGet:ct};
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
    case 'tradeCancel':{
      if(!G.trade||G.trade.from!==seat) return false; G.trade=null; log(G,'withdraw',{p:p.name}); return true;}
  }
  return false;
}
