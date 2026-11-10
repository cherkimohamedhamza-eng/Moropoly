// Setting up a game on this device.
import {commit} from '../app/authority';
import {teardownNet} from '../app/online';
import {app} from '../app/state';
import {COLORS, TOKENS} from '../engine/data';
import {freshGame} from '../engine/engine';
import {t, tokN} from '../i18n/core';
import {lsGet} from '../lib/storage';
import {$, coinHTML, esc} from './dom';
import {bindOpts, optsHTML} from './lobby';
import {closeModal, openModal} from './modals';

/* ============================================================
   LOCAL SETUP
   ============================================================ */
export let seats=['Hamza','Salma','Youssef','Imane','Karim','Nadia','Omar','Zineb'].map((n,i)=>({name:n,token:i,human:i===0,on:i<4}));
export let localOpts={daret:true,dlala:true,rounds:25,fast:false,timer:0};
export function renderSetup(){
  $('seats').innerHTML=seats.map((s,i)=>`<div class="seat ${s.on?'':'off'}"><button class="tok" data-pick="${i}" aria-label="${esc(t('aria.seatTok',{n:i+1}))}" style="width:56px">${coinHTML(s.token,`style="box-shadow:0 0 0 2px ${COLORS[i]}"`)}</button>
    <div class="info"><div style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="on${i}" ${s.on?'checked':''} aria-label="${esc(t('aria.seatOn',{n:i+1}))}"><input class="field" id="nm${i}" value="${esc(s.name)}" maxlength="16" aria-label="${esc(t('aria.seatName',{n:i+1}))}" style="flex:1"></div>
    <span class="seg"><button aria-pressed="${s.human}" data-h="${i}" data-v="1">${t('seg.human')}</button><button aria-pressed="${!s.human}" data-h="${i}" data-v="0">${t('seg.computer')}</button></span></div></div>`).join('');
  seats.forEach((s,i)=>{$('on'+i).onchange=e=>{s.on=e.target.checked; renderSetup();}; $('nm'+i).oninput=e=>{s.name=e.target.value;};});
  document.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{seats[+b.dataset.h].human=b.dataset.v==='1'; renderSetup();});
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>openTokenPicker(+b.dataset.pick));
  $('optsLocal').innerHTML=optsHTML(localOpts,'lo'); bindOpts('lo',st=>{localOpts=st;});
  const n=seats.filter(s=>s.on).length;
  $('seatCount').textContent=n<2?t('setup.need2'):t('setup.count',{n,h:seats.filter(s=>s.on&&s.human).length});
  $('startLocal').disabled=n<2;
  const sv=lsGet('moropoly.local.v2'); $('resumeLocal').hidden=!(sv&&sv.status==='play'&&!sv.over);
}
function openTokenPicker(i){
  openModal('tok',`<div class="hd"><h2>${t('tok.choose')}</h2><button class="x" data-close aria-label="${t('aria.close')}">×</button></div><div class="bd"><div class="tokgrid">${TOKENS.map((tk,k)=>{const o=seats.findIndex((s,j)=>j!==i&&s.token===k); return `<button class="tok" data-k="${k}" aria-pressed="${seats[i].token===k}">${coinHTML(k)}${o>=0?`<span class="taken">${esc(seats[o].name.slice(0,8))}</span>`:''}<span>${esc(tokN(k))}</span></button>`;}).join('')}</div><p class="muted" style="font-size:12.5px">${t('tok.swap')}</p></div>`);
  document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=+b.dataset.k; const o=seats.findIndex((s,j)=>j!==i&&s.token===k); if(o>=0) seats[o].token=seats[i].token; seats[i].token=k; closeModal(); renderSetup();});
}
export function startLocal(list,opts){
  teardownNet(); app.MODE='local';
  app.G=freshGame(list.map(s=>({name:(s.name||'').trim()||'Player',token:s.token,human:s.human})),opts,{mode:'local'});
  app.V=null; commit();
}
