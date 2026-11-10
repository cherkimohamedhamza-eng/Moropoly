// Music and sound effects, synthesised in the browser.
import {app} from '../app/state';
import {t} from '../i18n/core';
import {lsGet, lsSet} from '../lib/storage';
import {$, esc, toast} from './dom';

/* ============================================================
   MUSIC & SOUND (synthesised in the browser, nothing to download)
   ============================================================ */
const TRACKS=[{src:'assets/midnight-oud-plucks.mp3',k:'oud',ic:'🌙'},{src:'assets/andalusian-sunset.mp3',k:'guitar',ic:'🌅'},{src:'assets/chaabi-wedding.mp3',k:'chaabi',ic:'🥁'}];
const curTrack=()=>TRACKS[(AU.set.track>=0&&AU.set.track<TRACKS.length)?AU.set.track:0];
export const AU={ctx:null,master:null,music:null,sfx:null,rev:null,unlocked:false,noise:null,ks:{},els:[],cur:0,playing:false,xfading:false,loop:null,
  set:Object.assign({music:true,sfx:true,vol:0.3,track:0},lsGet('moropoly.audio.v2')||{})};

function saveAudio(){lsSet('moropoly.audio.v2',AU.set);}
function actx(){
  if(AU.ctx) return AU.ctx;
  const C=window.AudioContext||window.webkitAudioContext; if(!C) return null;
  const c=new C(); AU.ctx=c;
  const comp=c.createDynamicsCompressor(); comp.threshold.value=-16; comp.ratio.value=3; comp.connect(c.destination);
  AU.master=c.createGain(); AU.master.gain.value=1; AU.master.connect(comp);
  AU.music=c.createGain(); AU.sfx=c.createGain(); AU.music.connect(AU.master); AU.sfx.connect(AU.master);
  // small room reverb
  const len=c.sampleRate*1.6, ir=c.createBuffer(2,len,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);}
  const conv=c.createConvolver(); conv.buffer=ir; const rg=c.createGain(); rg.gain.value=.22; conv.connect(rg); rg.connect(AU.master); AU.rev=conv;
  const nb=c.createBuffer(1,c.sampleRate,c.sampleRate), nd=nb.getChannelData(0); for(let i=0;i<nd.length;i++) nd[i]=Math.random()*2-1; AU.noise=nb;
  applyVolumes();
  return c;
}
function applyVolumes(){if(!AU.ctx) return; const t=AU.ctx.currentTime; AU.music.gain.setTargetAtTime(AU.set.music?AU.set.vol:0,t,.12); AU.sfx.gain.setTargetAtTime(AU.set.sfx?0.75:0,t,.05);}
/* --- instruments --- */
function out(node,bus,wet){node.connect(bus); if(wet&&AU.rev){const g=AU.ctx.createGain(); g.gain.value=wet; node.connect(g); g.connect(AU.rev);}}
function env(t,a,peak,d){const g=AU.ctx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); return g;}
function ksBuf(f,decay,bright,dur){ // Karplus-Strong plucked string
  const key=f.toFixed(1)+decay+bright; if(AU.ks[key]) return AU.ks[key];
  const c=AU.ctx, sr=c.sampleRate, N=Math.max(2,Math.round(sr/f)), L=Math.floor(sr*dur), b=c.createBuffer(1,L,sr), y=b.getChannelData(0);
  let last=0; for(let i=0;i<N;i++){const r=Math.random()*2-1; last=last+bright*(r-last); y[i]=last;}
  y[N]=decay*y[0]; for(let i=N+1;i<L;i++) y[i]=decay*0.5*(y[i-N]+y[i-N-1]);
  return AU.ks[key]=b;
}
function pluck(t,f,vel,bus,o){o=o||{}; const c=AU.ctx; const s=c.createBufferSource(); s.buffer=ksBuf(f,o.decay||.996,o.bright||.5,o.dur||1.6); const g=c.createGain(); g.gain.value=vel; let n=g;
  if(o.lp){const fl=c.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=nyq(o.lp); g.connect(fl); n=fl;}
  if(o.body){const pk=c.createBiquadFilter(); pk.type='peaking'; pk.frequency.value=o.body; pk.gain.value=6; pk.Q.value=1.2; n.connect(pk); n=pk;}
  s.connect(g); out(n,bus,o.wet||.3); s.start(t);}
const nyq=f=>Math.min(f,AU.ctx.sampleRate*0.45);
function noiseHit(t,dur,type,freq,q,vel,bus,wet){const c=AU.ctx; freq=nyq(freq); const s=c.createBufferSource(); s.buffer=AU.noise; const f=c.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q||1; const g=env(t,.002,vel,dur); s.connect(f); f.connect(g); out(g,bus,wet||.15); s.start(t,Math.random()*.5,dur+.05);}
function tone(t,f0,f1,dur,vel,type,bus,wet){const c=AU.ctx; const o=c.createOscillator(); o.type=type||'sine'; o.frequency.setValueAtTime(f0,t); if(f1) o.frequency.exponentialRampToValueAtTime(f1,t+dur*.8); const g=env(t,.004,vel,dur); o.connect(g); out(g,bus,wet||0); o.start(t); o.stop(t+dur+.05);}
const doum=(t,v,b)=>{tone(t,120,52,.32,v*.9,'sine',b,.1); noiseHit(t,.03,'lowpass',400,1,v*.2,b);};
const tek=(t,v,b)=>{noiseHit(t,.045,'highpass',3200,.8,v*.35,b,.2); tone(t,1100,700,.04,v*.15,'triangle',b);};
const qraqeb=(t,v,b)=>{noiseHit(t,.035,'bandpass',3400,2.2,v*.5,b,.25); noiseHit(t+.018,.03,'bandpass',4600,2.5,v*.35,b,.25);};
const bendir=(t,v,b)=>{tone(t,85,48,.4,v*.7,'sine',b,.15); noiseHit(t,.16,'bandpass',1300,.9,v*.22,b,.15);};
const riq=(t,v,b)=>{noiseHit(t,.07,'highpass',6500,.7,v*.28,b,.3);};
const clap=(t,v,b)=>{for(let k=0;k<3;k++) noiseHit(t+k*.011,.05,'bandpass',1500,1.1,v*.3,b,.3);};
function bowed(t,f,dur,vel,b){const c=AU.ctx; const o=c.createOscillator(); o.type='sawtooth'; o.frequency.value=f;
  const lfo=c.createOscillator(); lfo.frequency.value=5.6; const lg=c.createGain(); lg.gain.value=f*.006; lfo.connect(lg); lg.connect(o.frequency);
  const fl=c.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=nyq(2400); fl.Q.value=.7;
  const g=c.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vel,t+.08); g.gain.setValueAtTime(vel,t+dur*.75); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(fl); fl.connect(g); out(g,b,.35); o.start(t); o.stop(t+dur+.05); lfo.start(t); lfo.stop(t+dur+.05);}
const hz=n=>440*Math.pow(2,(n-69)/12); // midi → Hz
/* --- music: Hamza's track, looped with a soft crossfade --- */
function musicEl(i){
  if(AU.els[i]) return AU.els[i];
  const a=new Audio(); a.src=curTrack().src; a.preload=i===0?'auto':'metadata'; a.setAttribute('playsinline','');
  let g=null;
  try{const src=AU.ctx.createMediaElementSource(a); g=AU.ctx.createGain(); g.gain.value=0; src.connect(g); g.connect(AU.music);}catch(e){g=null;}
  a.addEventListener('ended',()=>{if(AU.playing&&!AU.xfading){a.currentTime=0; a.play().catch(()=>{});}});
  a.addEventListener('error',()=>{AU.playing=false; renderDock();});
  return AU.els[i]={a,g};
}
function checkLoop(){
  if(!AU.playing||AU.xfading) return;
  const e=AU.els[AU.cur]; const d=e&&e.a.duration; if(!d||!isFinite(d)) return;
  if(e.a.currentTime>d-2.6){
    AU.xfading=true; const n=1-AU.cur, ne=musicEl(n), t=AU.ctx.currentTime;
    ne.a.currentTime=0; ne.a.play().catch(()=>{});
    if(ne.g){ne.g.gain.cancelScheduledValues(t); ne.g.gain.setValueAtTime(0.0001,t); ne.g.gain.linearRampToValueAtTime(1,t+2.2);}
    if(e.g){e.g.gain.cancelScheduledValues(t); e.g.gain.setValueAtTime(e.g.gain.value,t); e.g.gain.linearRampToValueAtTime(0,t+2.4);}
    setTimeout(()=>{e.a.pause(); AU.cur=n; AU.xfading=false;},2600);
  }
}
function startMusic(){
  if(!AU.set.music||!AU.unlocked) return; const c=actx(); if(!c) return;
  if(c.state==='suspended') c.resume();
  if(AU.playing) return;
  const e=musicEl(AU.cur); const t=c.currentTime;
  if(e.g){e.g.gain.cancelScheduledValues(t); e.g.gain.setValueAtTime(0.0001,t); e.g.gain.linearRampToValueAtTime(1,t+1.5);}
  e.a.play().then(()=>{AU.playing=true; renderDock();}).catch(()=>{AU.playing=false; renderDock();});
  AU.playing=true; clearInterval(AU.loop); AU.loop=setInterval(checkLoop,250); applyVolumes(); renderDock();
}
function stopMusic(){AU.playing=false; AU.xfading=false; clearInterval(AU.loop); AU.els.forEach(e=>{try{e.a.pause();}catch(x){}}); renderDock();}
function setTrack(i){
  if(!(i>=0&&i<TRACKS.length)) return;
  const same=i===AU.set.track&&AU.playing; AU.set.track=i; AU.set.music=true; saveAudio();
  if(same){renderDock(); return;}
  AU.playing=false; AU.xfading=false; clearInterval(AU.loop);
  AU.els.forEach(e=>{try{e.a.pause(); if(e.g) e.g.disconnect(); e.a.removeAttribute('src'); e.a.load();}catch(x){}});
  AU.els=[]; AU.cur=0; unlockAudio(); applyVolumes(); startMusic(); renderDock();
}
function toggleMusic(on){AU.set.music=on==null?!AU.set.music:on; saveAudio(); applyVolumes(); if(AU.set.music) startMusic(); else setTimeout(()=>{if(!AU.set.music) stopMusic();},300); renderDock();}
function unlockAudio(){if(AU.unlocked) return; AU.unlocked=true; const c=actx(); if(c&&c.state==='suspended') c.resume(); if(AU.set.music) startMusic();}
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,unlockAudio,{passive:true}));
document.addEventListener('visibilitychange',()=>{
  if(!AU.ctx) return;
  if(document.hidden){if(AU.playing){AU.els.forEach(e=>{try{e.a.pause();}catch(x){}}); AU.resumeOnShow=true; AU.playing=false;} if(app.MODE!=='host') AU.ctx.suspend();}
  else{AU.ctx.resume(); if(AU.resumeOnShow&&AU.set.music){AU.resumeOnShow=false; startMusic();}}
});
/* --- sound effects --- */
export function sfx(name){
  if(!AU.set.sfx||!AU.unlocked) return; const c=actx(); if(!c) return; if(c.state==='suspended') c.resume();
  const t=c.currentTime+.01, b=AU.sfx;
  switch(name){
    case 'dice': for(let k=0;k<7;k++) noiseHit(t+k*.07+Math.random()*.03,.03,'bandpass',1800+Math.random()*1500,2,.5,b,.1); break;
    case 'land': tone(t,180,90,.12,.5,'sine',b); noiseHit(t,.05,'bandpass',900,1.5,.35,b); break;
    case 'step': tone(t,620+Math.random()*80,420,.05,.18,'triangle',b); break;
    case 'whoosh': noiseHit(t,.35,'bandpass',800,.6,.35,b,.3); break;
    case 'card': noiseHit(t,.12,'highpass',2500,.7,.3,b,.2); tone(t+.05,880,1320,.18,.12,'sine',b,.3); break;
    case 'deed': pluck(t,hz(74),.5,b,{decay:.995,bright:.6,dur:1.2,wet:.5}); pluck(t+.08,hz(81),.4,b,{decay:.995,bright:.6,dur:1.2,wet:.5}); break;
    case 'buy': [74,78,81,86].forEach((n,k)=>tone(t+k*.07,hz(n),0,.25,.2,'triangle',b,.3)); qraqeb(t+.3,.8,b); qraqeb(t+.42,.6,b); break;
    case 'coin': tone(t,1975,0,.12,.18,'sine',b,.2); tone(t+.08,2637,0,.25,.16,'sine',b,.3); break;
    case 'pay': tone(t,1320,880,.18,.16,'triangle',b,.2); tone(t+.1,990,660,.22,.14,'triangle',b,.2); break;
    case 'coins': for(let k=0;k<8;k++) tone(t+k*.06,1800+Math.random()*900,0,.15,.12,'sine',b,.3); break;
    case 'build': tek(t,1,b); tek(t+.09,.8,b); tone(t,330,0,.1,.2,'square',b); break;
    case 'gavel': tone(t,220,110,.15,.5,'sine',b,.2); noiseHit(t,.04,'lowpass',1500,1,.5,b); break;
    case 'jail': [196,233,277].forEach(f=>tone(t,f,f*.98,1.1,.16,'sawtooth',b,.5)); noiseHit(t,.3,'lowpass',500,1,.5,b,.4); break;
    case 'myturn': tone(t,hz(81),0,.2,.15,'sine',b,.3); tone(t+.12,hz(86),0,.35,.15,'sine',b,.4); break;
    case 'deal': clap(t,1,b); clap(t+.15,1,b); break;
    case 'sad': [62,61,60,57].forEach((n,k)=>tone(t+k*.18,hz(n),0,.3,.14,'triangle',b,.3)); break;
    case 'zaghrouta':{ // ululation of joy for the winner
      const o=c.createOscillator(); o.type='sine'; o.frequency.setValueAtTime(1250,t); o.frequency.linearRampToValueAtTime(1500,t+2.2);
      const l=c.createOscillator(); l.type='square'; l.frequency.value=8.5; const lg=c.createGain(); lg.gain.value=140; l.connect(lg); lg.connect(o.frequency);
      const g=c.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(.12,t+.1); g.gain.setValueAtTime(.12,t+2); g.gain.exponentialRampToValueAtTime(0.0001,t+2.5);
      o.connect(g); out(g,b,.4); o.start(t); l.start(t); o.stop(t+2.6); l.stop(t+2.6);
      [0,.25,.5,.75,1,1.25].forEach(d=>{doum(t+d,.7,b); qraqeb(t+d+.12,.7,b);}); break;}
  }
}
/* --- music dock UI --- */
export function renderDock(){
  const d=$('dock'); if(!d) return;
  const on=AU.set.music&&AU.playing;
  $('dockBtn').classList.toggle('on',on); $('dockBtn').setAttribute('aria-label',on?t('dk.ariaOn'):t('dk.aria'));
  const p=$('dockPanel'); if(p.hidden) return;
  p.innerHTML=`<div class="dk-row"><b>${t('dk.music')}</b><button class="sw" role="switch" aria-checked="${AU.set.music}" id="dkMusic" aria-label="${t('dk.music')}"><i></i></button></div>
    <div class="dk-tracks" role="group" aria-label="${t('dk.pick')}">${TRACKS.map((tr,i)=>{const sel=curTrack()===tr; return `<button type="button" class="dk-track" data-trk="${i}" aria-pressed="${sel&&AU.set.music}"><span class="ar" style="min-width:auto">${tr.ic}</span><span><b>${esc(t('trk.'+tr.k))}</b><small>${esc(t('trk.'+tr.k+'.d'))}${sel&&on?' · '+t('dk.loop'):''}</small></span></button>`;}).join('')}</div>
    <label class="dk-row" for="dkVol"><span>${t('dk.vol')}</span><input type="range" id="dkVol" min="0" max="1" step="0.05" value="${AU.set.vol}"><span class="muted" id="dkVolN" style="min-width:34px;text-align:end">${Math.round(AU.set.vol*100)}%</span></label>
    <div class="dk-row"><b>${t('dk.sfx')}</b><button class="sw" role="switch" aria-checked="${AU.set.sfx}" id="dkSfx" aria-label="${t('dk.sfx')}"><i></i></button></div>
    <div class="muted" style="font-size:11.5px">${t('dk.m')}</div>`;
  $('dkMusic').onclick=()=>toggleMusic();
  p.querySelectorAll('[data-trk]').forEach(b=>b.onclick=e=>{e.stopPropagation(); setTrack(+b.dataset.trk);});
  $('dkSfx').onclick=()=>{AU.set.sfx=!AU.set.sfx; saveAudio(); applyVolumes(); renderDock(); if(AU.set.sfx) sfx('coin');};
  $('dkVol').oninput=e=>{AU.set.vol=+e.target.value; $('dkVolN').textContent=Math.round(AU.set.vol*100)+'%'; saveAudio(); applyVolumes();};
}
export function initDock(){
  $('dockBtn').onclick=e=>{e.stopPropagation(); unlockAudio(); const p=$('dockPanel'); p.hidden=!p.hidden; renderDock();};
  document.addEventListener('click',e=>{const p=$('dockPanel'); if(!p.hidden&&!e.target.closest('#dock')){p.hidden=true;}});
  addEventListener('keydown',e=>{if((e.key==='m'||e.key==='M')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){unlockAudio(); toggleMusic(); toast(AU.set.music?t('toast.musicOn'):t('toast.musicOff'));}});
  renderDock();
}
