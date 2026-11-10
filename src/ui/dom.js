// DOM helpers: $, toasts and token coins.
import {TOKENS} from '../engine/data';

/* ============================================================
   HELPERS
   ============================================================ */
export const $=id=>document.getElementById(id);
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export function coinHTML(tok,extra){const t=TOKENS[tok]||TOKENS[0]; return `<span class="coin" ${extra||''}><img src="${t.img}" alt="${esc(t.name)}"></span>`;}
document.addEventListener('error',e=>{const t=e.target; if(t&&t.tagName==='IMG'&&!t.closest('[data-react]')){t.classList.add('noimg'); const c=t.closest('.coin,.pawn'); if(c&&!c.querySelector('.g')){const k=TOKENS.findIndex(x=>t.src.endsWith(x.img)); if(k>=0){const g=document.createElement('span'); g.className='g'; g.textContent=TOKENS[k].g; t.replaceWith(g);}}}},true);
export function toast(msg){const t=document.createElement('div'); t.className='toast'; t.textContent=msg; $('toasts').appendChild(t); setTimeout(()=>t.remove(),2800);}
