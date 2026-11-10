// Switching language: the page's direction, then every part of the page redraws in the new language.
import {app} from '../app/state';
import {lsSet} from '../lib/storage';
import {buildBoard, syncDpos} from './board';
import {renderAll} from './render';
import {refresh} from '../react/store';

/** sets the page's language and reading direction */
export function applyLang(){const html=document.documentElement; html.lang=app.LANG; html.dir=app.LANG==='ar'?'rtl':'ltr';}
export function setLang(l){
  if(!['en','fr','ar'].includes(l)||l===app.LANG) return;
  app.LANG=l; lsSet('moropoly.lang',l); applyLang();
  refresh();
  // the board's pawns and dice are placed again once any animation has finished
  if(app.V&&app.V.status==='play'){if(app.playing) app.LANG_DIRTY=true; else {buildBoard(); syncDpos(); renderAll();}}
}
