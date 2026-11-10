// Windows: deed, auction, trade, bankruptcy, seat and game over.
import {commit, dispatch, lobbyJoin, playJoin, sendIntent} from '../app/authority';
import {app, saveName} from '../app/state';
import {GROUPS, RAIL_RENT, SP, TOKENS} from '../engine/data';
import {netWorth, tradeable} from '../engine/engine';
import {alive, colorOf, isOwnable, ownedBy} from '../engine/util';
import {cityN, fmt, noteN, num, spN, t, tokN} from '../i18n/core';
import {$, coinHTML, esc, toast} from './dom';
import {goHome} from './home';
import {sfx} from './music';
import {iControl} from './render';

/* ============================================================
   MODALS
   ============================================================ */
const MINABLE=['trade','treply','auction'];
let stash=null; // a minimised window parked while another one (a deed card) is open
export function openModal(kind,html){
  const root=$('modalRoot');
  if(app.modal&&app.modal.min&&kind!==app.modal.kind&&!stash){const f=document.createElement('div'); while(root.firstChild) f.appendChild(root.firstChild); stash={modal: app.modal,f};}
  else if(stash&&stash.modal.kind===kind) stash=null;
  root.classList.remove('min');
  app.modal={kind};
  root.innerHTML=`<div class="veil" id="veil"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`+(MINABLE.includes(kind)?`<button class="modal-pill" id="modalPill">${esc(t('pill.'+kind))}</button>`:'');
  if(MINABLE.includes(kind)) addMinBtn(root);
  $('veil').addEventListener('click',e=>{if(e.target.id==='veil'&&kind!=='auction'&&kind!=='treply') closeModal();});
  $('modalRoot').querySelectorAll('[data-close]').forEach(b=>b.onclick=closeModal);
}
function addMinBtn(root){
  const hd=root.querySelector('.modal .hd'); if(!hd||hd.querySelector('[data-min]')) return;
  const b=document.createElement('button'); b.className='btn ghost sm'; b.dataset.min='1'; b.style.marginInlineStart='auto'; b.textContent='▾ '+t('btn.seeBoard');
  const x=hd.querySelector('.x'); if(x){x.style.marginInlineStart='0'; hd.insertBefore(b,x);} else hd.appendChild(b);
  b.onclick=minimizeModal;
  const pill=root.querySelector('#modalPill'); if(pill) pill.onclick=restoreModal;
}
function minimizeModal(){if(!app.modal) return; app.modal.min=true; $('modalRoot').classList.add('min');}
function restoreModal(){if(!app.modal) return; app.modal.min=false; $('modalRoot').classList.remove('min'); if(app.modal.kind==='auction') renderAuction();}
export function closeModal(){
  const root=$('modalRoot'); app.modal=null; root.innerHTML=''; root.classList.remove('min');
  if(stash){const st=stash; stash=null; while(st.f.firstChild) root.appendChild(st.f.firstChild); app.modal=st.modal; root.classList.add('min'); const p=root.querySelector('#modalPill'); if(p) p.onclick=restoreModal; const m=root.querySelector('[data-min]'); if(m) m.onclick=minimizeModal; autoModals();}
}
const hasModal=k=>(app.modal&&app.modal.kind===k)||(stash&&stash.modal.kind===k);
function dropModal(k){if(stash&&stash.modal.kind===k) stash=null; else if(app.modal&&app.modal.kind===k) closeModal();}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&app.modal&&app.modal.kind!=='auction'&&app.modal.kind!=='treply') closeModal();});
export function autoModals(){
  if(!app.V||app.V.status!=='play') return;
  if(app.V.auction){if(!hasModal('auction')) openAuction(); else if(app.modal.kind==='auction') renderAuction();}
  else if(hasModal('auction')) dropModal('auction');
  if(app.V.trade&&iControl(app.V.trade.to)){if(!hasModal('treply')) openTradeReply();}
  else if(hasModal('treply')) dropModal('treply');
  if(app.V.over&&app.shownOver!==app.V.gid){app.shownOver=app.V.gid; setTimeout(openGameOver,600);}
}
export function openDeed(i){
  if(!app.V) return; const s=SP[i]; let head='',rows='',note='';
  const ar=app.LANG==='ar', nm=spN(i);
  if(s.t==='prop'){const pr=app.V.props?app.V.props[i]:null, gr=GROUPS[s.g];
    head=`<div class="head" style="background:${gr.color};color:${['lblue','yellow','pink'].includes(s.g)?'#15181d':'#fff'}"><div class="ar">${gr.ar} – ${s.ar}</div>${ar?'':`<div class="lt">${esc(cityN(s.g))} · ${esc(nm)}</div>`}</div>`;
    const lv=pr?pr.houses:-1, labels=t('dm.labels');
    rows=`<tr><td>${t('dm.price')}</td><td>${fmt(s.price)}</td></tr>`+s.rent.map((r,k)=>`<tr class="${k===lv?'hit':''}"><td>${labels[k]}</td><td>${fmt(r)}</td></tr>`).join('')+`<tr><td>${esc(t('dm.allCity',{c:cityN(s.g)}))}</td><td>${fmt(s.rent[0]*2)}</td></tr><tr><td>${t('dm.each')}</td><td>${fmt(gr.house)}</td></tr><tr><td>${t('dm.rahn')}</td><td>${fmt(s.price/2)}</td></tr>`;
    note=noteN(i);}
  else if(s.t==='rail'){head=`<div class="head" style="background:#4a5059"><div class="ar">${s.ar}</div>${ar?'':`<div class="lt">🚄 ${esc(nm)}</div>`}</div>`; rows=`<tr><td>${t('dm.price')}</td><td>${fmt(s.price)}</td></tr>`+RAIL_RENT.map((r,k)=>`<tr><td>${t('dm.stations',{n:k+1})}</td><td>${fmt(r)}</td></tr>`).join(''); note=t('dm.railNote');}
  else if(s.t==='util'){head=`<div class="head" style="background:#7d8792"><div class="ar">${s.ar}</div>${ar?'':`<div class="lt">${s.glyph} ${esc(nm)}</div>`}</div>`; rows=`<tr><td>${t('dm.price')}</td><td>${fmt(s.price)}</td></tr><tr><td>${t('dm.util1')}</td><td>${t('dm.x40')}</td></tr><tr><td>${t('dm.util2')}</td><td>${t('dm.x100')}</td></tr>`; note=noteN(i);}
  else{note=s.t==='tax'?t('info.tax',{a:fmt(s.amount||0),d:app.V.settings&&app.V.settings.daret?t('info.taxDaret'):''}):t('info.'+s.t);
    head=`<div class="head" style="background:${s.t==='go'||s.t==='mektoub'||s.t==='gojail'?'var(--red)':'var(--green)'}"><div class="ar">${s.ar}</div>${ar?'':`<div class="lt">${esc(nm)}</div>`}</div>`;}
  const pr=app.V.props&&isOwnable(i)?app.V.props[i]:null;
  const owner=pr?(pr.owner>=0?esc(t('dm.owned',{p:app.V.players[pr.owner].name,m:pr.mort?t('dm.mortSuffix'):''})):t('dm.forSale')):'';
  openModal('deed',`<div class="hd"><h2>${esc(nm)}</h2><button class="x" data-close aria-label="${t('aria.close')}">×</button></div>
   <div class="bd"><div class="deed">${s.art?`<div class="artbig"><img src="${s.art}" alt="${esc(nm)}"></div>`:''}<div style="min-width:0;${s.art?'':'grid-column:1/-1'}">${head}${rows?`<table>${rows}</table>`:''}${note?`<p class="muted" style="font-size:13px">${esc(note)}</p>`:''}${owner?`<p style="font-size:13px">${owner}</p>`:''}</div></div></div>`);
}
export function openAuction(){openModal('auction','<div id="auc"></div>'); renderAuction();}
let lastHigh=-1;
function renderAuction(){
  const box=$('auc'); if(!box) return; const a=app.V.auction; if(!a){closeModal(); return;}
  if(a.high!==lastHigh){if(a.high>0) sfx('gavel'); lastHigh=a.high;}
  const s=SP[a.idx], p=app.V.players[a.bidders[a.turn]], me=iControl(p.id)&&!app.playing;
  box.innerHTML=`<div class="hd"><h2>${esc(t('au.title',{s:spN(a.idx)}))}</h2></div><div class="bd">
    <div style="display:flex;gap:14px;align-items:center">${s.art?`<img src="${s.art}" alt="" style="width:72px;height:108px;object-fit:cover;border-radius:8px">`:''}<div><div class="muted">${t('au.help')}</div>
    <div class="bidbig">${fmt(a.high)}</div><div class="muted" style="font-size:12.5px">${a.highBidder>=0?esc(t('au.held',{p:app.V.players[a.highBidder].name})):t('au.none')} · ${t('au.list',{a:fmt(s.price)})}</div></div></div>
    <div class="bidders">${a.bidders.map((id,k)=>`<span class="${k===a.turn?'now':''}">${esc(app.V.players[id].name)}</span>`).join('')}</div>
    <div><b>${esc(p.name)}</b>${me?t('au.yourBid',{a:fmt(p.cash)}):t('au.deciding')}</div></div>
    <div class="ft">${[100,500,1000].map(inc=>`<button class="btn ${inc===100?'red':''}" data-inc="${inc}" ${!me||a.high+inc>p.cash?'disabled':''}>+${num(inc)}</button>`).join('')}<button class="btn ghost" data-pass ${me?'':'disabled'}>${t('btn.leaveAuc')}</button></div>`;
  addMinBtn($('modalRoot')); const pl=$('modalPill'); if(pl) pl.classList.toggle('mine',me);
  box.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>dispatch({t:'bid',inc:+b.dataset.inc},p.id));
  const pb=box.querySelector('[data-pass]'); if(pb) pb.onclick=()=>dispatch({t:'pass'},p.id);
}
export function openConfirmBankrupt(){
  const p=app.V.players[app.V.cur];
  openModal('bk',`<div class="hd"><h2>${t('bk.title')}</h2><button class="x" data-close aria-label="${t('aria.close')}">×</button></div><div class="bd"><p>${esc(t('bk.body',{p:p.name,a:fmt(-p.cash),o:typeof p.owes==='number'&&p.owes>=0?app.V.players[p.owes].name:t('w.bank')}))}</p></div><div class="ft"><button class="btn" data-close>${t('btn.keep')}</button><button class="btn danger" id="bkYes">${t('btn.bankrupt')}</button></div>`);
  $('bkYes').onclick=()=>{closeModal(); dispatch({t:'bankrupt'});};
}
export function openTrade(){
  const me=app.V.players[app.V.cur]; if(!iControl(me.id)) return;
  const others=alive(app.V).filter(o=>o.id!==me.id); if(!others.length) return;
  let partner=others[0].id;
  const list=(pid,name)=>{const tt=tradeable(app.V,pid); return tt.length?tt.map(i=>`<label><input type="checkbox" name="${name}" value="${i}"><span class="chip" style="background:${colorOf(i)}"></span>${esc(spN(i))}${app.V.props[i].mort?' <span class="muted">(rahn)</span>':''}</label>`).join(''):`<div class="muted" style="font-size:12.5px">${t('tr.nothing')}</div>`;};
  const draw=()=>{const them=app.V.players[partner];
    $('trBody').innerHTML=`<label class="muted" style="display:flex;gap:8px;align-items:center">${t('tr.with')} <select class="field" id="trWith" style="padding:6px">${others.map(o=>`<option value="${o.id}" ${o.id===partner?'selected':''}>${esc(o.name)}${o.human?'':' ('+t('lbl.computer')+')'}</option>`).join('')}</select></label>
     <div class="trade-cols"><div><h4>${esc(t('tr.gives',{p:me.name}))}</h4>${list(me.id,'give')}<label class="muted" for="trCG" style="margin-top:6px">${t('tr.cash')}</label><input class="field" type="number" id="trCG" min="0" step="100" value="0"></div>
     <div><h4>${esc(t('tr.gives',{p:them.name}))}</h4>${list(them.id,'get')}<label class="muted" for="trCT" style="margin-top:6px">${t('tr.cash')}</label><input class="field" type="number" id="trCT" min="0" step="100" value="0"></div></div><div id="trMsg" class="muted"></div>`;
    $('trWith').onchange=e=>{partner=+e.target.value; draw();};};
  openModal('trade',`<div class="hd"><h2>${t('tr.title')}</h2><button class="x" data-close aria-label="${t('aria.close')}">×</button></div><div class="bd" id="trBody"></div><div class="ft"><button class="btn" data-close>${t('btn.cancel')}</button><button class="btn red" id="trGo">${t('btn.send')}</button></div>`);
  draw();
  $('trGo').onclick=()=>{
    const q=n=>[...document.querySelectorAll(`input[name=${n}]:checked`)].map(x=>+x.value);
    const o={t:'trade',to:partner,give:q('give'),get:q('get'),cashGive:Math.max(0,Math.round(+$('trCG').value||0)),cashGet:Math.max(0,Math.round(+$('trCT').value||0))};
    if(!o.give.length&&!o.get.length&&!o.cashGive&&!o.cashGet){$('trMsg').textContent=t('tr.pick'); return;}
    if(o.cashGive>Math.max(0,me.cash)||o.cashGet>Math.max(0,app.V.players[partner].cash)){$('trMsg').textContent=t('tr.noCash'); return;}
    closeModal(); dispatch(o,me.id); toast(app.V.players[partner].human?t('tr.sent',{p:app.V.players[partner].name}):t('tr.thinking',{p:app.V.players[partner].name}));
  };
}
export function openTradeReply(){
  const tr=app.V.trade; if(!tr) return; const a=app.V.players[tr.from], b=app.V.players[tr.to];
  const sum=arr=>arr.map(i=>`<span class="chip" style="background:${colorOf(i)};display:inline-block;vertical-align:middle"></span> ${esc(spN(i))}`).join(app.LANG==='ar'?'، ':', ')||t('tr.nothingW');
  openModal('treply',`<div class="hd"><h2>${esc(t('trr.title',{p:b.name}))}</h2></div><div class="bd">${app.MODE==='local'?`<p>${t('trr.pass',{p:esc(b.name)})}</p>`:''}
    <div class="preview" style="flex-direction:column;align-items:flex-start;gap:6px"><div><b>${t('trr.receive')}</b> ${sum(tr.give)}${tr.cashGive?` + ${fmt(tr.cashGive)}`:''}</div><div><b>${t('trr.give')}</b> ${sum(tr.get)}${tr.cashGet?` + ${fmt(tr.cashGet)}`:''}</div></div>
    <p class="muted">${esc(t('trr.from',{p:a.name}))}</p></div><div class="ft"><button class="btn" id="trNo">${t('btn.refuse')}</button><button class="btn green" id="trYes">${t('btn.accept')}</button></div>`);
  $('trNo').onclick=()=>{closeModal(); dispatch({t:'tradeReply',accept:false},tr.to);};
  $('trYes').onclick=()=>{closeModal(); dispatch({t:'tradeReply',accept:true},tr.to);};
}
export function openSeat(){
  if(!app.V||!app.V.players) return; const me=app.V.players.find(p=>p.cid===app.myCid); if(!me) return;
  let tok=me.token;
  const used=new Set(app.V.players.filter(p=>p!==me&&!p.bankrupt).map(p=>p.token));
  openModal('seat',`<div class="hd"><h2>${t('lb.yourSeat')}</h2><button class="x" data-close aria-label="${t('aria.close')}">×</button></div>
    <div class="bd"><p class="muted" style="margin:0">${t('seat.help')}</p>
    <label class="muted" for="stName" style="font-size:12.5px">${t('lb.name')}</label>
    <input class="field" id="stName" maxlength="16" value="${esc(me.name)}" placeholder="${esc(t('lb.namePh'))}">
    <div class="tokgrid">${TOKENS.map((tk,k)=>{const taken=used.has(k)?app.V.players.find(p=>p!==me&&!p.bankrupt&&p.token===k):null; return `<button class="tok" data-st="${k}" aria-pressed="${k===tok}" ${taken?'disabled':''}>${coinHTML(k)}${taken?`<span class="taken">${esc(taken.name.slice(0,8))}</span>`:''}<span>${esc(tokN(k))}</span></button>`;}).join('')}</div></div>
    <div class="ft"><button class="btn red" id="stSave">${t('btn.save')}</button></div>`);
  document.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{tok=+b.dataset.st; document.querySelectorAll('[data-st]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
  $('stSave').onclick=()=>{const n=($('stName').value||'').trim()||me.name; saveName(n); closeModal(); seatAct({t:'join',name:n,token:tok});};
}
function seatAct(a){
  if(app.MODE==='host'){if(app.G.status==='lobby'?lobbyJoin(app.myCid,a):playJoin(app.G,app.myCid,a)) commit();}
  else sendIntent({a});
}
export function openGameOver(){
  const rank=[...app.V.players].sort((a,b)=>(a.bankrupt-b.bankrupt)||netWorth(app.V,b)-netWorth(app.V,a));
  openModal('over',`<div class="hd"><h2>${esc(t('go.title',{p:rank[0].name}))}</h2><button class="x" data-close aria-label="${t('aria.close')}">×</button></div><div class="bd"><div class="plist">${rank.map((p,k)=>`<div class="prow ${k===0?'active':''}">${coinHTML(p.token)}<div><div class="nm">${k+1}. ${esc(p.name)}</div><div class="sub">${p.bankrupt?t('st.bankrupt'):t('go.props',{n:ownedBy(app.V,p.id).length})}</div></div><div class="money"><b>${fmt(p.bankrupt?0:netWorth(app.V,p))}</b><span class="sub">${t('go.nw')}</span></div></div>`).join('')}</div></div><div class="ft"><button class="btn" data-close>${t('btn.look')}</button><button class="btn red" id="again">${t('btn.backHome')}</button></div>`);
  $('again').onclick=()=>{closeModal(); goHome();};
}
