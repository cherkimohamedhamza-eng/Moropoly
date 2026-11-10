// Applying the language to the page, and the language switcher.
import {app} from '../app/state';
import {LANGS, t} from '../i18n/core';
import {lsSet} from '../lib/storage';
import {listMyGames, newTransport, setOnlineNote} from '../net/transport';
import {buildBoard, syncDpos} from './board';
import {$} from './dom';
import {drawMap, homeArt} from './home';
import {renderLobby} from './lobby';
import {autoModals, closeModal} from './modals';
import {renderDock} from './music';
import {renderAll} from './render';
import {renderSetup} from './setup';

/* apply language to static markup and the document */
export function applyLang(){
  const html=document.documentElement; html.lang=app.LANG; html.dir=app.LANG==='ar'?'rtl':'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.innerHTML=t(el.dataset.i18n);});
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{el.placeholder=t(el.dataset.i18nPh);});
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>{el.setAttribute('aria-label',t(el.dataset.i18nAria));});
  document.querySelectorAll('.langsw').forEach(renderLangSwitch);
}
export function renderLangSwitch(box){
  box.setAttribute('role','group'); box.setAttribute('aria-label',t('lang.aria'));
  box.innerHTML=LANGS.map(([k,s,n])=>`<button type="button" data-lang="${k}" aria-pressed="${app.LANG===k}" title="${n}" lang="${k}">${s}</button>`).join('');
  box.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
}
function setLang(l){
  if(!['en','fr','ar'].includes(l)||l===app.LANG) return;
  app.LANG=l; lsSet('moropoly.lang',l); applyLang();
  homeArt(); drawMap(); setOnlineNote(newTransport()); listMyGames();
  if(!$('setup').hidden) renderSetup();
  if(app.V&&app.V.status==='lobby'&&!$('lobby').hidden) renderLobby();
  if(app.V&&app.V.status==='play'){if(app.playing) app.LANG_DIRTY=true; else {buildBoard(); syncDpos(); renderAll();}}
  renderDock();
  if(app.modal){const k=app.modal.kind; closeModal(); if(k==='auction'||k==='treply') autoModals();}
}
