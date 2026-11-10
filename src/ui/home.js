// Home screen: flag, map and token parade.
import {teardownNet} from '../app/online';
import {app} from '../app/state';
import {GROUPS, SP, TOKENS} from '../engine/data';
import {range} from '../engine/util';
import {cityN, spN, tokN} from '../i18n/core';
import {listMyGames} from '../net/transport';
import {$, esc, reduceMotion} from './dom';
import {closeModal} from './modals';
import {show} from './view';

/* ============================================================
   HOME: flag, map, parade, marquee
   ============================================================ */
export function flagAnim(){
  const cv=$('flag'); if(!cv) return; const x=cv.getContext('2d'); const W=cv.width,H=cv.height;
  const off=document.createElement('canvas'); const fw=W-24, fh=H-28; off.width=fw; off.height=fh; const o=off.getContext('2d');
  o.fillStyle='#c1272d'; o.fillRect(0,0,fw,fh);
  const cx=fw/2,cy=fh/2,R=fh*0.32; const pts=range(5).map(k=>{const a=-Math.PI/2+k*2*Math.PI/5; return [cx+Math.cos(a)*R,cy+Math.sin(a)*R];});
  o.strokeStyle='#006233'; o.lineWidth=R*0.13; o.lineJoin='miter'; o.beginPath(); [0,2,4,1,3,0].forEach((k,j)=>j?o.lineTo(...pts[k]):o.moveTo(...pts[k])); o.closePath(); o.stroke();
  let t0=performance.now(); const rm=reduceMotion();
  function frame(now){
    const t=(now-t0)/1000; x.clearRect(0,0,W,H);
    const pg=x.createLinearGradient(0,0,8,0); pg.addColorStop(0,'#8f97a2'); pg.addColorStop(.5,'#f4f6f9'); pg.addColorStop(1,'#7f8792');
    x.fillStyle=pg; x.fillRect(6,4,6,H-6); x.beginPath(); x.arc(9,5,4.5,0,7); x.fillStyle='#e7eaee'; x.fill();
    for(let i=0;i<fw;i+=2){
      const k=i/fw, ph=t*3.2-i*0.06, dy=rm?0:Math.sin(ph)*5*k, sh=rm?0:Math.cos(ph)*0.16*k;
      x.drawImage(off,i,0,2,fh,12+i,10+dy,2,fh);
      x.fillStyle=sh>0?`rgba(255,255,255,${sh})`:`rgba(0,0,0,${-sh})`; x.fillRect(12+i,10+dy,2,fh);
    }
    if(!rm&&!$('home').hidden) requestAnimationFrame(frame); else if(!rm) setTimeout(()=>requestAnimationFrame(frame),500);
  }
  requestAnimationFrame(frame);
}
const COAST=[[-5.92,35.79],[-5.6,35.84],[-5.4,35.92],[-5.32,35.86],[-5.33,35.68],[-5.1,35.45],[-4.67,35.21],[-4.3,35.17],[-3.93,35.25],[-3.55,35.22],[-3.0,35.42],[-2.93,35.18],[-2.6,35.12],[-2.21,35.1],
 [-1.8,34.92],[-1.75,34.5],[-1.68,33.8],[-1.55,32.75],[-1.2,32.4],[-1.18,32.1],[-2.25,31.85],[-3.65,31.65],[-3.83,31.2],[-4.5,30.6],[-5.0,29.98],[-5.6,29.6],[-6.5,29.45],[-7.6,29.38],[-8.67,28.7],[-8.67,27.67],
 [-8.67,26.0],[-12.0,26.0],[-12.0,23.45],[-13.0,21.33],[-16.95,21.33],[-17.05,20.85],[-16.98,21.4],[-16.9,21.9],[-16.5,22.4],[-16.2,23.0],[-15.95,23.7],[-15.3,24.3],[-14.9,24.8],[-14.48,26.13],[-13.95,26.6],[-13.4,27.1],[-12.92,27.94],
 [-11.9,28.2],[-11.33,28.5],[-10.6,28.95],[-10.17,29.38],[-9.85,29.83],[-9.62,30.42],[-9.89,30.63],[-9.83,31.0],[-9.77,31.51],[-9.24,32.3],[-9.27,32.55],[-8.5,33.25],[-7.59,33.6],[-7.38,33.69],[-6.84,34.02],[-6.68,34.26],[-6.29,34.88],[-6.16,35.19],[-6.03,35.46],[-5.92,35.79]];
const CITIES=[{n:'Tangier',fr:'Tanger',a:'طنجة',p:[-5.81,35.77],dx:-58,dy:-8},{n:'Chefchaouen',a:'شفشاون',p:[-5.27,35.17],dx:9,dy:4},{n:'Fès',a:'فاس',p:[-5.0,34.03],dx:9,dy:4},{n:'Rabat · Salé',a:'الرباط',p:[-6.84,34.02],dx:-86,dy:-12},{n:'Casablanca',a:'الدار البيضاء',p:[-7.59,33.57],dx:-82,dy:18},{n:'Marrakech',a:'مراكش',p:[-7.99,31.63],dx:9,dy:4},{n:'Agadir',a:'أكادير',p:[-9.6,30.42],dx:-56,dy:6},{n:'Lagouira',fr:'Lagouira',a:'الكويرة',p:[-17.05,20.9],dx:9,dy:4}];
function proj([lo,la]){const k=27, c=Math.cos(29*Math.PI/180); return [((lo+17.3)*c)*k+14,(36.2-la)*k+10];}
export function drawMap(){
  const svg=$('map'); const d=COAST.map((pt,i)=>(i?'L':'M')+proj(pt).map(v=>v.toFixed(1)).join(',')).join('')+'Z';
  const route=['Tangier','Rabat · Salé','Casablanca','Marrakech'].map(n=>proj(CITIES.find(c=>c.n===n).p));
  const rd='M'+route.map(p=>p.map(v=>v.toFixed(1)).join(',')).join('L');
  svg.innerHTML=`<defs><linearGradient id="landGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3038"/><stop offset=".5" stop-color="#1b2027"/><stop offset="1" stop-color="#262c34"/></linearGradient>
    <radialGradient id="glow" cx=".55" cy=".25" r=".7"><stop offset="0" stop-color="#17a862" stop-opacity=".25"/><stop offset="1" stop-color="#17a862" stop-opacity="0"/></radialGradient></defs>
    <rect x="0" y="0" width="420" height="450" fill="url(#glow)"/>
    <path class="map-land" pathLength="1" d="${d}"/>
    <path class="map-route" d="${rd}"/>
    ${CITIES.map((c,i)=>{const [x,y]=proj(c.p); return `<g class="city" style="animation-delay:${1.6+i*.18}s"><circle class="pulse" cx="${x}" cy="${y}" r="5" style="animation-delay:${i*.35}s"/><circle class="dot" cx="${x}" cy="${y}" r="3.4"/>${app.LANG==='ar'?`<text x="${x+c.dx+(c.dx<0?30:0)}" y="${y+c.dy+6}" style="font-family:var(--f-ar);font-size:12.5px">${c.a}</text>`:`<text x="${x+c.dx}" y="${y+c.dy}">${(app.LANG==='fr'&&c.fr)||c.n}</text><text class="ar" x="${x+c.dx}" y="${y+c.dy+12}">${c.a}</text>`}</g>`;}).join('')}
    <g class="train"><circle r="7" fill="#f4f6f9" stroke="#e8474d" stroke-width="2.5"/><text text-anchor="middle" y="3.5" font-size="8">🚄</text>${reduceMotion()?'':`<animateMotion dur="7s" repeatCount="indefinite" path="${rd}" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="linear"/>`}</g>`;
  if(reduceMotion()){const g=svg.querySelector('.train'); const [x,y]=route[0]; g.setAttribute('transform',`translate(${x},${y})`);}
}
export function homeArt(){
  $('parade').innerHTML=TOKENS.map((tk,k)=>`<div class="coin" style="animation-delay:${(k*.27).toFixed(2)}s" title="${esc(tokN(k))}"><img src="${tk.img}" alt="${esc(tokN(k))}"><span>${esc(tokN(k))}</span></div>`).join('');
  const props=SP.map((s,i)=>({s,i})).filter(o=>o.s.t==='prop');
  const card=o=>`<div class="mcard"><img src="${o.s.art}" alt="${esc(spN(o.i))}" loading="lazy"><i class="bar" style="background:${GROUPS[o.s.g].color}"></i><div class="cap" dir="auto">${esc(spN(o.i))} · ${esc(cityN(o.s.g))}</div></div>`;
  const a=props.slice(0,11), b=props.slice(11);
  $('mq1').innerHTML=[...a,...a].map(card).join(''); $('mq2').innerHTML=[...b,...b].map(card).join('');
}
export function goHome(){
  teardownNet(); clearTimeout(app.botTimer); closeModal(); app.MODE=null; app.G=null; app.V=null; app.Q=[]; app.playing=false;
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  show('home'); listMyGames();
}
