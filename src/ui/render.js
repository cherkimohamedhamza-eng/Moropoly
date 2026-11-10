// Turn card, side tabs, banner and turn timer.
import {commit, dispatch} from '../app/authority';
import {hostOnline, onlineCids} from '../app/online';
import {app} from '../app/state';
import {JAIL_FINE, SP} from '../engine/data';
import {canBuild, canMort, canRiad, canSell, canUnmort, log, netWorth, rentFor, riadCost} from '../engine/engine';
import {colorOf, isOwnable, ownedBy, ownsGroup, unmortCost} from '../engine/util';
import {cityN, fmt, spN, t, tl, tokN} from '../i18n/core';
import {setEvent} from './anim';
import {layoutPawns, setDice} from './board';
import {$, coinHTML, esc} from './dom';
import {openAuction, openConfirmBankrupt, openDeed, openGameOver, openTrade, openTradeReply} from './modals';
import {sfx} from './music';
import {TDL, seatedIn} from './view';

/* ---------- render ---------- */
export const houseHTML=h=>h===5?'<span class="riad">✦</span>':'<span class="dar"></span>'.repeat(h);
function mySeats(){
  if(!app.V||!app.V.players) return [];
  if(app.MODE==='local') return app.V.players.filter(p=>p.human).map(p=>p.id);
  return app.V.players.filter(p=>p.human&&p.cid&&p.cid===app.myCid).map(p=>p.id);
}
export const iControl=id=>mySeats().includes(id);
export function renderAll(){
  if(!app.V||app.V.status!=='play') return;
  SP.forEach((s,i)=>{
    const cell=$('c'+i); if(!cell) return;
    cell.classList.toggle('land',i===app.V.landed);
    if(isOwnable(i)){const pr=app.V.props[i]; $('o'+i).style.background=pr.owner>=0?app.V.players[pr.owner].color:'transparent'; cell.classList.toggle('mort',pr.mort); const h=$('h'+i); if(h) h.innerHTML=houseHTML(pr.houses);}
  });
  const pot=$('pot'); if(pot) pot.textContent=fmt(app.V.daret);
  setDice(app.V.dice,false); layoutPawns(); setEvent(tl(app.V.event));
  $('roundMeta').textContent=t('meta.round',{n:app.V.round,of:app.V.settings.rounds?t('meta.of',{m:app.V.settings.rounds}):'',a:fmt(app.V.daret)});
  $('mySeatBtn').hidden=!(app.MODE!=='local'&&seatedIn(app.V)&&!app.V.over);
  const cc=$('codeChip'); cc.hidden=!app.V.code; if(app.V.code) cc.textContent=t('chip.game',{c:app.V.code.toUpperCase()});
  renderBanner(); renderTurn(); renderTab();
}
export function renderBanner(){
  const s=$('bannerSlot'); if(!s) return;
  const watch=app.MODE==='guest'&&app.V&&app.V.players&&!seatedIn(app.V)&&!app.V.over;
  s.innerHTML=watch&&hostOnline()?`<div class="banner" style="margin-bottom:12px;background:rgba(201,207,216,.08);border-color:var(--line-2);color:var(--text)">${esc(t('watching'))}</div>`:(app.MODE==='guest'&&!hostOnline())?`<div class="banner" style="margin-bottom:12px">${esc(t('banner.paused'))}</div>`:'';
}
export function renderTurn(){
  const el=$('turnCard'); if(!el||!app.V||app.V.status!=='play') return;
  const p=app.V.players[app.V.cur]; const mine=iControl(app.V.cur)&&!app.playing&&!app.V.over; const N=x=>esc(x);
  let status='',btns=[];
  if(app.V.over){const w=app.V.players[app.V.winner]; status=t('tc.wins',{p:N(w.name)}); btns.push(`<button class="btn metal" data-act="results">${t('btn.results')}</button>`);}
  else if(app.playing){status=esc(tl(app.V.event));}
  else if(app.V.trade){const tr=app.V.trade; status=t('tc.offered',{p:N(app.V.players[tr.from].name),o:N(app.V.players[tr.to].name)}); if(iControl(tr.to)) btns.push(`<button class="btn red" data-act="reply">${t('btn.seeOffer')}</button>`); if(iControl(tr.from)) btns.push(`<button class="btn" data-act="tcancel">${t('btn.withdraw')}</button>`);}
  else if(app.V.auction){const a=app.V.auction; status=t('tc.dlala',{s:esc(spN(a.idx)),a:fmt(a.high),by:a.highBidder>=0?t('tc.by',{p:N(app.V.players[a.highBidder].name)}):''}); btns.push(`<button class="btn red" data-act="auction">${t('btn.openAuc')}</button>`);}
  else if(p.cash<0){status=`<span class="status bad">${esc(t('tc.owes',{p:p.name,a:fmt(-p.cash)}))}</span>`; if(mine) btns.push(`<button class="btn" data-act="deeds">${t('btn.myDeeds')}</button>`,`<button class="btn" data-act="trade">${t('btn.tbadel')}</button>`,`<button class="btn danger" data-act="bankrupt">${t('btn.bankrupt')}</button>`);}
  else if(app.V.phase==='buy'){const i=app.V.pending.idx,s=SP[i]; status=t('tc.forSale',{s:esc(spN(i)),c:s.g?' · '+esc(cityN(s.g)):''}); if(mine) btns.push(`<button class="btn red" data-act="buy" ${p.cash<s.price?'disabled':''}>${t('btn.buy',{a:fmt(s.price)})}</button>`,`<button class="btn" data-act="decline">${app.V.settings.dlala?t('btn.dlala'):t('btn.pass')}</button>`);}
  else if(app.V.phase==='roll'){status=esc(p.inJail?t('tc.inJail',{p:p.name,n:p.jailTurns+1,a:fmt(JAIL_FINE)}):(app.V.rollAgain?t('tc.again'):t('tc.toRoll',{p:p.name})));
    if(mine){btns.push(`<button class="btn red" data-act="roll">${t('btn.roll')}</button>`); if(p.inJail){btns.push(`<button class="btn" data-act="fine" ${p.cash<JAIL_FINE?'disabled':''}>${t('btn.payFine',{a:fmt(JAIL_FINE)})}</button>`); if(p.goojf.length) btns.push(`<button class="btn" data-act="card">${t('btn.useCard')}</button>`);} btns.push(`<button class="btn ghost" data-act="trade">${t('btn.tbadel')}</button>`);}}
  else if(app.V.phase==='end'){status=esc(tl(app.V.event)); if(mine) btns.push(`<button class="btn green" data-act="end">${t('btn.end')}</button>`,`<button class="btn" data-act="deeds">${t('btn.build')}</button>`,`<button class="btn ghost" data-act="trade">${t('btn.tbadel')}</button>`);}
  let prev='';
  if(app.V.phase==='buy'&&app.V.pending&&!app.playing){const i=app.V.pending.idx,s=SP[i]; prev=`<div class="preview">${s.art?`<img src="${s.art}" alt="">`:''}<div style="min-width:0"><div style="font-weight:700">${esc(spN(i))} ${app.LANG==='ar'?'':`<span style="font-family:var(--f-ar);color:var(--dim)">${s.ar}</span>`}</div><div class="muted" style="font-size:12.5px">${esc(s.t==='prop'?t('pv.rentProp',{a:fmt(s.rent[0]),b:fmt(s.rent[0]*2),c:cityN(s.g)}):s.t==='rail'?t('pv.rentRail'):t('pv.rentUtil'))}</div><button class="btn ghost sm" style="margin-top:6px" data-act="deed" data-i="${i}">${t('btn.viewDeed')}</button></div></div>`;}
  const wait=!mine&&!app.V.over&&!app.playing&&!app.V.auction&&!app.V.trade?`<div class="muted" style="font-size:12.5px">${p.human?(app.MODE==='local'?'':esc(t('tc.waiting',{p:p.name}))):t('tc.thinking')}</div>`:'';
  el.innerHTML=`<div class="who">${coinHTML(p.token)}<div style="flex:1;min-width:0"><div class="n">${esc(p.name)}</div><div class="muted" style="font-size:12px">${esc(tokN(p.token))}${p.human?'':' · '+t('lbl.computer')}${iControl(p.id)&&app.MODE!=='local'?' · '+t('lbl.you'):''}</div></div><div class="cash">${fmt(p.cash)}</div></div>
    <div class="status">${status}</div>${prev}<div class="actions">${btns.join('')}</div>${wait}<div class="ttimer" id="tTimer" hidden><i></i><span></span></div>`;
  drawTimer();
  el.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.act,b.dataset.i)));
}
let tWarned=null;
function drawTimer(){
  const el=$('tTimer'); if(!el) return;
  if(!TDL||!app.V||app.V.over||app.V.status!=='play'){el.hidden=true; return;}
  const left=Math.max(0,Math.min(TDL.total,TDL.end-Date.now())), sec=Math.ceil(left/1000), mine=iControl(TDL.actor);
  el.hidden=false; el.classList.toggle('low',sec<=10); el.classList.toggle('mine',mine);
  el.querySelector('i').style.transform=`scaleX(${left/TDL.total})`;
  const who=app.V.players[TDL.actor]; el.querySelector('span').textContent=`⏱ ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}${who&&!mine?' · '+who.name:''}`;
  if(mine&&sec<=10&&sec>0&&tWarned!==TDL.end){tWarned=TDL.end; try{navigator.vibrate&&navigator.vibrate(120);}catch(e){} sfx('pay');}
}
setInterval(drawTimer,250);
function act(a,i){
  switch(a){
    case 'roll':case 'buy':case 'decline':case 'end':case 'fine':case 'card':dispatch({t:a}); break;
    case 'tcancel':dispatch({t:'tradeCancel'},app.V.trade.from); break;
    case 'reply':openTradeReply(); break;
    case 'deeds':setTab('deeds'); break; case 'trade':openTrade(); break;
    case 'bankrupt':openConfirmBankrupt(); break; case 'auction':openAuction(); break;
    case 'deed':openDeed(+i); break; case 'results':openGameOver(); break;
  }
}
export function setTab(t){app.tab=t; document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t)); renderTab();}
export function renderTab(){
  const el=$('tabpanel'); if(!el||!app.V||app.V.status!=='play') return;
  const on=app.MODE==='local'?null:onlineCids();
  const small=x=>`<span class="muted" style="font-size:11px">· ${x}</span>`;
  if(app.tab==='players'){
    el.innerHTML=`<div class="plist">${app.V.players.map(p=>{const owned=ownedBy(app.V,p.id).sort((a,b)=>a-b);
      const st=on&&p.human?`<span class="dotst ${on.has(p.cid)?'on':''}"></span>`:'';
      const hostCtl=app.MODE==='host'&&p.cid!==app.myCid&&!p.bankrupt&&!app.V.over?`<button class="btn ghost sm" style="margin-top:4px" data-bot="${p.id}">${p.human?t('btn.letBot'):t('btn.handBack')}</button>`:'';
      return `<div class="prow ${p.id===app.V.cur?'active':''} ${p.bankrupt?'out':''}">${coinHTML(p.token,`style="box-shadow:0 0 0 2px ${p.color}"`)}<div style="min-width:0"><div class="nm">${st}${esc(p.name)} ${p.human?'':small(t('lbl.computer'))}${iControl(p.id)&&app.MODE!=='local'?' '+small(t('lbl.you')):''}</div>
      <div class="sub">${p.bankrupt?t('st.bankrupt'):p.inJail?t('st.inJail'):esc(spN(p.pos))}${p.goojf.length?' · '+t('st.goojf'):''}</div>
      <div class="chips">${owned.map(i=>`<span class="chip ${app.V.props[i].mort?'m':''}" title="${esc(spN(i))}" style="background:${colorOf(i)}"></span>`).join('')}</div>${hostCtl&&p.cid?hostCtl:''}</div>
      <div class="money"><b>${fmt(p.cash)}</b><span class="sub">${t('st.worth',{a:fmt(netWorth(app.V,p))})}</span></div></div>`;}).join('')}</div>`;
    el.querySelectorAll('[data-bot]').forEach(b=>b.onclick=()=>{const p=app.G.players[+b.dataset.bot]; if(!p) return; p.human=!p.human; log(app.G,p.human?'back':'botPlays',{p:p.name}); commit();});
  } else if(app.tab==='deeds'){
    const seats=mySeats(); const pid=seats.includes(app.V.cur)?app.V.cur:seats[0];
    if(pid==null){el.innerHTML=`<div class="muted">${t('dd.watching')}</div>`; return;}
    const p=app.V.players[pid]; const owned=ownedBy(app.V,pid).sort((a,b)=>a-b);
    if(!owned.length){el.innerHTML=`<div class="muted">${esc(t('dd.none',{p:p.name}))}</div>`; return;}
    const can=pid===app.V.cur&&!app.V.auction&&!app.V.trade&&!app.playing&&!app.V.over;
    el.innerHTML=`<div class="muted" style="font-size:12.5px;margin-bottom:8px">${esc(can?t('dd.help'):t('dd.notTurn',{p:p.name}))}</div><div class="deeds">${owned.map(i=>{const s=SP[i],pr=app.V.props[i];
      const lvl=s.t!=='prop'?(s.t==='rail'?t('lv.station'):t('lv.utility')):pr.houses===5?t('lv.riad'):pr.houses?t('lv.dar',{n:pr.houses}):t('lv.none');
      return `<div class="drow"><div class="th">${s.art?`<img src="${s.art}" alt="">`:''}<i style="background:${colorOf(i)}"></i></div><div style="min-width:0"><button class="btn ghost sm" style="border:0;padding:0;font-weight:600" data-deed="${i}">${esc(spN(i))}</button><div class="muted" style="font-size:12px">${pr.mort?t('lv.mort'):lvl}${s.t==='prop'&&!pr.mort?' · '+t('dd.rent',{a:fmt(rentFor(app.V,i))}):''}</div></div>
      <div class="acts">${s.t==='prop'?`<button class="btn sm" data-b="${i}" ${can&&canBuild(app.V,i,pid)?'':'disabled'}>${pr.houses>=4?t('btn.addRiad'):t('btn.addDar')}</button>${pr.houses<5&&!(pr.houses>=4&&canBuild(app.V,i,pid))&&ownsGroup(app.V,pid,s.g)?`<button class="btn sm gold" data-r="${i}" ${can&&canRiad(app.V,i,pid)?'':'disabled'}>${t('btn.riadNow',{a:fmt(riadCost(app.V,i))})}</button>`:''}<button class="btn sm" data-s="${i}" ${can&&canSell(app.V,i,pid)?'':'disabled'}>${t('btn.sell')}</button>`:''}${pr.mort?`<button class="btn sm" data-u="${i}" ${can&&canUnmort(app.V,i,pid)?'':'disabled'}>${t('btn.lift',{a:fmt(unmortCost(i))})}</button>`:`<button class="btn sm" data-m="${i}" ${can&&canMort(app.V,i,pid)?'':'disabled'}>${t('btn.rahn',{a:fmt(s.price/2)})}</button>`}</div></div>`;}).join('')}</div>`;
    const bind=(attr,ty)=>el.querySelectorAll(`[data-${attr}]`).forEach(b=>b.onclick=()=>dispatch({t:ty,i:+b.dataset[attr]},pid));
    bind('b','build'); bind('r','riad'); bind('s','sell'); bind('m','mort'); bind('u','unmort');
    el.querySelectorAll('[data-deed]').forEach(b=>b.onclick=()=>openDeed(+b.dataset.deed));
  } else if(app.tab==='log'){el.innerHTML=`<div class="log">${(app.V.log||[]).map(l=>`<div>${esc(tl(l))}</div>`).join('')}</div>`;}
  else el.innerHTML=t('book');
}
