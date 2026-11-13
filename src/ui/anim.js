// Animations: dice, pawn moves, money effects, cards and confetti.
import {app} from '../app/state';
import {SP} from '../engine/data';
import {startCash} from '../engine/engine';
import {colorOf, range} from '../engine/util';
import {cardText, fmt, spN, t, tl} from '../i18n/core';
import {cellBox, layoutPawns, pawnSize, setDice, slotXY} from './board';
import {$, esc, reduceMotion, sleep} from './dom';
import {sfx} from './music';
import {iControl} from './render';
import {refresh} from '../react/store';
import {speed} from './view';

/* ---------- animations ---------- */
export async function runAnim(a){
  if(!$('board')) return;
  const sp=speed(), rm=reduceMotion();
  switch(a.k){
    case 'dice':{sfx('dice'); setTimeout(()=>sfx('land'),rm?50:560*sp); setDice(a.d,!rm,sp); setEvent(tl(['rolls',{p:pname(a.pid),d1:a.d[0],d2:a.d[1]}])+(a.d[0]===a.d[1]?t('ev.double'):'')); await sleep(rm?100:950*sp); break;}
    case 'move':{
      const el=$('pw'+a.pid); if(!el){app.dpos[a.pid]=(a.from+a.steps)%40; break;}
      el.style.zIndex=9;   // above every piece standing on a square
      for(let s=1;s<=a.steps;s++){
        const from=slotXY(a.pid,app.dpos[a.pid]); app.dpos[a.pid]=(a.from+s)%40; const to=slotXY(a.pid,app.dpos[a.pid]);
        const dur=rm?0:Math.max(70,190*sp), hop=pawnSize()*0.9; sfx('step');
        if(dur){await el.animate([{transform:`translate(${from.x}px,${from.y}px) scale(1)`,translate:'0px 0px'},{transform:`translate(${(from.x+to.x)/2}px,${(from.y+to.y)/2}px) scale(1.18)`,translate:`0px ${-hop}px`,offset:.5},{transform:`translate(${to.x}px,${to.y}px) scale(1)`,translate:'0px 0px'}],{duration:dur,easing:'ease-in-out'}).finished;}
        el.style.transform=`translate(${to.x}px,${to.y}px)`;
      }
      layoutPawns();   // everyone on the square takes their place (and size) first, then the arriving piece settles with a squash
      if(!rm) el.animate([{transform:el.style.transform+' scale(1.25,0.8)'},{transform:el.style.transform+' scale(1)'}],{duration:260,easing:'cubic-bezier(.3,1.6,.5,1)'});
      highlight(app.dpos[a.pid]);
      break;}
    case 'jump':{sfx(a.f==='jail'?'jail':'whoosh');
      const el=$('pw'+a.pid); const from=el?slotXY(a.pid,app.dpos[a.pid]):null; app.dpos[a.pid]=a.to; const to=slotXY(a.pid,a.to);
      if(el&&!rm){el.style.zIndex=9; await el.animate([{transform:`translate(${from.x}px,${from.y}px) scale(1)`,translate:'0px 0px'},{transform:`translate(${(from.x+to.x)/2}px,${(from.y+to.y)/2}px) scale(1.5)`,translate:`0px ${-pawnSize()*3}px`,offset:.5},{transform:`translate(${to.x}px,${to.y}px) scale(1)`,translate:'0px 0px'}],{duration:700*sp+200,easing:'ease-in-out'}).finished;}
      layoutPawns(); highlight(a.to);
      if(a.f==='jail'){jailBars(); await revealArt(SP[30].art,t('fl.jail'),1300*sp,null,10,sp);}
      break;}
    case 'card':{sfx('card'); setEvent(t('ev.draws',{p:pname(a.pid),deckN:t('deck.'+a.deck)})); {const tx=cardText(a.deck,a.id,a.text); await showFate(a.deck,tx,(rm?2500:Math.min(9000,4000+tx.length*40))*(sp<1?.75:1),app.dpos[a.pid],sp);} break;}
    case 'turn':{setEvent(tl(['turn',{p:pname(a.pid)}])); if(app.MODE!=='local'&&iControl(a.pid)){sfx('myturn'); try{navigator.vibrate&&navigator.vibrate([60,40,60]);}catch(e){}} break;}
    case 'fx':{
      if(a.f==='deed'){sfx('deed'); await revealArt(SP[a.idx].art||null,`${spN(a.idx)} · ${fmt(SP[a.idx].price)}`,1300*sp,SP[a.idx],a.idx,sp);}
      else if(a.f==='buy'){sfx('buy'); floatAt(a.pid,t('fl.sold'),'gold'); confettiAt(cellBox(a.idx)); await sleep(500*sp);}
      else if(a.f==='pay'){sfx('pay'); floatAt(a.pid,'−'+fmt(a.amt),'minus'); if(a.to>=0) setTimeout(()=>floatAt(a.to,'+'+fmt(a.amt),'plus'),300); await sleep(450*sp);}
      else if(a.f==='gain'||a.f==='go'){sfx('coin'); floatAt(a.pid,'+'+fmt(a.amt),'plus'); await sleep(350*sp);}
      else if(a.f==='daret'){sfx('coins'); floatAt(a.pid,t('fl.daret')+' +'+fmt(a.amt),'gold'); confettiAt(cellBox(20)); await sleep(700*sp);}
      else if(a.f==='build'){sfx('build'); const p=app.PEND||app.V; app.boardFx.houses[a.idx]=p.props[a.idx].houses; app.boardFx.pop=a.idx; refresh(); await sleep(220*sp);}
      else if(a.f==='deal'){sfx('deal'); floatAt(a.pid,t('fl.deal'),'gold'); floatAt(a.to,t('fl.deal'),'gold'); await sleep(500*sp);}
      else if(a.f==='dlala'){sfx('gavel'); setEvent(t('ev.dlala')); await sleep(400);}
      else if(a.f==='bankrupt'){sfx('sad'); floatAt(a.pid,t('fl.bankrupt'),'minus'); await sleep(800*sp);}
      else if(a.f==='joined'){sfx('deed'); confettiAt(cellBox(0)); floatAt(a.pid,'+'+fmt(startCash((app.PEND||app.V).settings)),'plus'); await sleep(500*speed());}
      else if(a.f==='win'){sfx('zaghrouta'); confettiAt(null,260); await sleep(1200);}
      break;}
  }
}
function pname(pid){const p=(app.PEND||app.V).players[pid]; return p?p.name:'';}
export function setEvent(t){const e=$('eventLine'); if(e) e.textContent=t;}
function highlight(i){app.boardFx.hl=i; refresh();}
function floatAt(pid,text,cls){
  const b=$('board'); const el=$('pw'+pid); if(!b) return;
  let x,y; if(el){const m=new DOMMatrix(getComputedStyle(el).transform); x=m.m41+pawnSize()/2; y=m.m42;} else {const c=cellBox(app.dpos[pid]||0); x=c.x; y=c.y;}
  const f=document.createElement('div'); f.className='floater '+cls; f.textContent=text; f.style.left=x+'px'; f.style.top=y+'px'; b.appendChild(f); setTimeout(()=>f.remove(),1600);
}
function confettiAt(box,count){
  if(reduceMotion()) return;
  const b=$('board'); if(!b) return; const cv=document.createElement('canvas'); cv.className='confetti'; b.appendChild(cv);
  const W=b.offsetWidth,H=b.offsetHeight,dpr=Math.min(2,devicePixelRatio||1); cv.width=W*dpr; cv.height=H*dpr; const x=cv.getContext('2d'); x.scale(dpr,dpr);
  const cx=box?box.x:W/2, cy=box?box.y:H/2, n=count||70, cols=['#c1272d','#e8474d','#006233','#17a862','#f4f6f9','#c9cfd8','#e3b34a'];
  const ps=range(n).map(()=>{const a=Math.random()*Math.PI*2,v=(box?3:6)+Math.random()*6; return {x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(box?4:6),r:Math.random()*6.28,vr:(Math.random()-.5)*.4,s:4+Math.random()*5,c:cols[Math.floor(Math.random()*cols.length)],star:Math.random()<.2};});
  let t=0; (function fr(){t++; x.clearRect(0,0,W,H); ps.forEach(p=>{p.vy+=.22; p.vx*=.99; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; x.save(); x.translate(p.x,p.y); x.rotate(p.r); x.fillStyle=p.c; x.globalAlpha=Math.max(0,1-t/90); if(p.star){x.font=`${p.s*2.4}px sans-serif`; x.fillText('★',0,0);} else x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); x.restore();}); if(t<95) requestAnimationFrame(fr); else cv.remove();})();
}
function jailBars(){
  const b=$('board'); if(!b||reduceMotion()) return; const c=cellBox(10); const d=document.createElement('div'); d.className='jailbars';
  d.style.left=(c.x-c.w/2)+'px'; d.style.top=(c.y-c.h/2)+'px'; d.style.width=c.w+'px'; d.style.height=c.h+'px'; b.appendChild(d); setTimeout(()=>d.remove(),1000);
}
/* A revealed card is a real two-sided card (styles: .card3d): it lifts off the square `from` face down, turns
   over on its way to the middle of the board and lands facing the players. `sp` scales how long that takes. */
function card3d(cls,front,back,from,sp,attrs=''){
  const b=$('board'); let at='';
  if(b&&from!=null&&from>=0){const c=cellBox(from); at=`--ox:${(c.x-b.clientWidth/2).toFixed(1)}px;--oy:${(c.y-b.clientHeight/2).toFixed(1)}px;`;}
  return `<div class="card3d ${cls}" style="${at}--ct:${(.85*sp).toFixed(2)}s" ${attrs}><i class="c3-shadow"></i><div class="c3-body"><i class="c3-edge"></i><i class="c3-edge"></i><i class="c3-edge"></i><div class="c3-back">${back}</div>${front}</div></div>`;
}
async function revealArt(src,cap,ms,s,from,sp=1){
  const st=$('stage'); if(!st) return;
  const head=s&&!src?`<div style="height:22%;background:${colorOf(SP.indexOf(s))}"></div><div style="padding:2cqi;color:var(--ink);text-align:center;font-weight:700;font-size:2.2cqi">${esc(spN(SP.indexOf(s)))}<div style="font-family:var(--f-ar);font-size:2cqi;color:var(--ink-dim)">${app.LANG==='ar'?'':s.ar}</div></div>`:'';
  st.innerHTML=card3d('c3-deed',`<div class="reveal c3-front">${src?`<img src="${src}" alt="">`:head}<div class="cap">${esc(cap)}</div></div>`,'<img src="assets/card-back.webp" alt="">',from,sp);
  await sleep(ms); const r=st.firstElementChild; if(r){r.classList.add('out'); await sleep(420);} st.innerHTML='';
}
async function showFate(deck,text,ms,from,sp=1){
  const st=$('stage'); if(!st) return;
  const word=deck==='mektoub'?'مكتوب':'بركة';
  st.innerHTML=card3d('fate3 '+deck,`<div class="fate c3-front ${deck}"><div class="fate-art" style="background-image:url(assets/art-${deck}.webp)"></div><div class="k">${word}</div><div class="kl">${t('fate.'+deck)}</div><div class="tx">${esc(text)}</div><div class="tap">${t('fate.tap')}</div><i class="timer" style="animation-duration:${Math.round(ms)}ms"></i></div>`,`<div class="fate-back" style="background-image:linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.45)),url(assets/art-${deck}.webp)"><div class="k">${word}</div></div>`,from,sp,'role="button" tabindex="0"');
  await new Promise(res=>{const tm=setTimeout(res,ms); const f=st.firstElementChild; const go=()=>{clearTimeout(tm); res();}; f.addEventListener('click',go,{once:true}); f.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ') go();});}); const r=st.firstElementChild; if(r){r.classList.add('out'); await sleep(420);} st.innerHTML='';
}
