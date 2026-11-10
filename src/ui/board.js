// Draws the board, dice and pawns.
import {app} from '../app/state';
import {GROUPS, SP, TOKENS} from '../engine/data';
import {num, spN, t} from '../i18n/core';
import {$, esc} from './dom';
import {openDeed} from './modals';

/* ---------- board ---------- */
const pos2grid=i=>{if(i===0) return [11,11]; if(i<10) return [11,11-i]; if(i===10) return [11,1]; if(i<20) return [11-(i-10),1]; if(i===20) return [1,1]; if(i<30) return [1,1+(i-20)]; if(i===30) return [1,11]; return [1+(i-30),11];};
const sideOf=i=>i<10?'b':i<20?'l':i<30?'t':'r';
const STAR_PATH='M0,-0.95L0.56,0.77L-0.9,-0.29H0.9L-0.56,0.77Z';
export function buildBoard(){
  const b=$('board'); b.innerHTML='';
  const ar=app.LANG==='ar';
  SP.forEach((s,i)=>{
    const [r,c]=pos2grid(i), el=document.createElement('div');
    el.className='cell'; el.dataset.t=s.t; el.id='c'+i; el.style.gridArea=`${r}/${c}`; el.tabIndex=0; el.setAttribute('role','button'); el.setAttribute('aria-label',spN(i));
    if(i%10===0){
      el.classList.add('corner');
      if(s.t==='go'){el.classList.add('c-go'); el.innerHTML=`<div class="big">${s.ar}</div><div class="lat">${t('b.goLat')}</div><div class="arrow">←</div><div class="tiny">${t('b.goTiny')}</div>`;}
      if(s.t==='jail'){el.classList.add('c-jail'); el.innerHTML=`<div class="big">${s.ar}</div><div class="bars"><img src="${s.art}" alt=""></div><div class="lat">${t('b.jailLat')}</div><div class="tiny">${t('b.jailTiny')}</div>`;}
      if(s.t==='parking'){el.classList.add('c-park'); el.innerHTML=`<div class="big">${s.ar}</div><div class="lat">${t('b.parkLat')}</div><div class="pot" id="pot">0</div><div class="tiny">${t('b.parkTiny')}</div>`;}
      if(s.t==='gojail'){el.classList.add('c-gojail'); el.innerHTML=`<div class="big">${s.ar}</div><div class="lat">${t('b.gojailLat')}</div><div class="tiny">${t('b.gojailTiny')}</div>`;}
    } else {
      el.classList.add('s-'+sideOf(i));
      let h='';
      if(s.t==='prop') h=`<div class="bar" style="background:${GROUPS[s.g].color}" id="h${i}"></div><div class="art"><img src="${s.art}" alt="" loading="lazy"></div><div class="body"><div class="nm">${esc(spN(i))}</div><div class="pr">${num(s.price)}</div></div>`;
      else if(s.t==='rail') h=`<div class="body"><div class="glyph">🚄</div><div class="nm">${esc(spN(i))}</div><div class="pr">${num(s.price)}</div></div>`;
      else if(s.t==='util') h=`<div class="body"><div class="glyph">${s.glyph}</div><div class="nm">${esc(spN(i))}</div><div class="pr">${num(s.price)}</div></div>`;
      else if(s.t==='mektoub') h=`<div class="body" style="background:linear-gradient(180deg,#fff,#f6d9da)"><div class="ico" style="color:var(--red)">مكتوب</div><div class="nm">${t('b.mektoub')}</div></div>`;
      else if(s.t==='baraka') h=`<div class="body" style="background:linear-gradient(180deg,#fff,#d5efe1)"><div class="ico" style="color:var(--green)">بركة</div><div class="nm">${t('b.baraka')}</div></div>`;
      else if(s.t==='tax') h=`<div class="body"><div class="ico" style="font-size:1.6cqi">${s.ar}</div><div class="nm">${ar?'':esc(spN(i))}</div><div class="pr">${t('b.pay',{n:num(s.amount)})}</div></div>`;
      el.innerHTML=h+`<div class="own" id="o${i}"></div>`;
    }
    el.addEventListener('click',()=>openDeed(i));
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDeed(i);}});
    b.appendChild(el);
  });
  const ctr=document.createElement('div'); ctr.className='center'; ctr.dir=ar?'rtl':'ltr';
  ctr.innerHTML=`<svg class="star" viewBox="-1 -1 2 2" aria-hidden="true"><path d="${STAR_PATH}" fill="none" stroke-width=".05" stroke-linejoin="miter"/></svg>
    <div class="ttl"><div class="tif">ⵎⵓⵔⵓⴱⵓⵍⵉ</div><div class="ar">مُوروبولي</div><div class="lat">MOROPOLY</div></div>
    <div class="dice" id="dice">${[0,1].map(k=>`<div class="die" id="d${k}">${[1,2,3,4,5,6].map(f=>`<div class="face f${f}">${'<i></i>'.repeat(9)}</div>`).join('')}</div>`).join('')}</div>
    <div class="event" id="eventLine"></div>`;
  b.appendChild(ctr);
  const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  b.querySelectorAll('.face').forEach(f=>{const v=+f.className.match(/f(\d)/)[1]; [...f.children].forEach((pip,j)=>pip.style.visibility=PIPS[v].includes(j)?'visible':'hidden');});
  const stage=document.createElement('div'); stage.className='stage'; stage.id='stage'; stage.dir=ar?'rtl':'ltr'; b.appendChild(stage);
  const pl=document.createElement('div'); pl.className='pawnlayer'; pl.id='pawns'; b.appendChild(pl);
  setDice(app.V.dice||[3,4],false);
}
const DIE_ROT={1:[0,0],2:[0,-90],3:[-90,0],4:[90,0],5:[0,90],6:[0,180]};
const spins=[0,0];
export function setDice(d,anim){
  d.forEach((v,k)=>{const el=$('d'+k); if(!el) return; if(anim) spins[k]+=2+Math.floor(Math.random()*2); const [x,y]=DIE_ROT[v]; el.style.transform=`rotateX(${x+spins[k]*360}deg) rotateY(${y+spins[k]*360+(k?360:0)}deg)`;});
  if(anim){const di=$('dice'); di.classList.remove('jump'); void di.offsetWidth; di.classList.add('jump');}
}
export function cellBox(i){const c=$('c'+i); if(!c) return {x:0,y:0,w:0,h:0}; return {x:c.offsetLeft+c.offsetWidth/2,y:c.offsetTop+c.offsetHeight/2,w:c.offsetWidth,h:c.offsetHeight};}
export function pawnSize(){const b=$('board'); if(!b) return 30; const w=b.offsetWidth; return w*(w<480?0.06:0.047);}
export function syncDpos(){app.dpos={}; if(app.V&&app.V.players) app.V.players.forEach(p=>app.dpos[p.id]=p.pos);}
export function slotXY(pid,pos){
  const here=app.V.players.filter(p=>!p.bankrupt&&app.dpos[p.id]===pos).map(p=>p.id);
  const k=Math.max(0,here.indexOf(pid)), n=Math.max(1,here.length), b=cellBox(pos), s=pawnSize();
  const cols=n<=2?n:n<=4?2:n<=6?3:4, rows=Math.ceil(n/cols);
  const gap=s*0.62;
  return {x:b.x+((k%cols)-(cols-1)/2)*gap-s/2, y:b.y+(Math.floor(k/cols)-(rows-1)/2)*gap-s/2};
}
export function layoutPawns(){
  const layer=$('pawns'); if(!layer||!app.V||!app.V.players) return;
  const s=pawnSize(); layer.style.setProperty('--ps',s+'px');
  app.V.players.forEach(p=>{
    let el=$('pw'+p.id);
    if(p.bankrupt){if(el) el.remove(); return;}
    if(!el){el=document.createElement('div'); el.className='pawn'; el.id='pw'+p.id; el.innerHTML=`<img src="${TOKENS[p.token].img}" alt="">`; layer.appendChild(el);}
    el.style.setProperty('--pc',p.color); el.title=p.name;
    el.classList.toggle('cur',p.id===app.V.cur&&!app.V.over); el.classList.toggle('jailed',p.inJail);
    const {x,y}=slotXY(p.id,app.dpos[p.id]); el.style.transform=`translate(${x}px,${y}px)`;
  });
}
addEventListener('resize',()=>{clearTimeout(window.__rz); window.__rz=setTimeout(()=>{if(app.V&&app.V.status==='play') layoutPawns();},120);});
