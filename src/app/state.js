/* ============================================================
   APP STATE
   ============================================================ */
import {rid} from '../engine/util';
import {lsGet, lsSet} from '../lib/storage';

/* shared app state: read and written by several modules */
export const app={
  LANG:(()=>{const s=lsGet('moropoly.lang'); if(['en','fr','ar'].includes(s)) return s; const n=(navigator.language||'en').slice(0,2).toLowerCase(); return ['fr','ar'].includes(n)?n:'en';})(),
  MODE:null,           // 'local' | 'host' | 'guest'
  G:null,              // authority state (local/host)
  V:null,              // view state (what is on screen)
  lastSeen:0,
  PEND:null,
  Q:[],
  playing:false,
  myCid:null,
  NET:{T:null,code:null,myQ:[],mySeq:0},
  LANG_DIRTY:false,
  JOIN:{sent:false,pin:null,denied:0,wrong:false,welcomed:null},
  tab:'players',
  modal:null,
  botTimer:null,
  dpos:{},
  shownOver:null,
  lobbyDraft:{name:'',token:-1},
  CAPS:null,           // claude capabilities, resolved once
};

const ARTIFACT_URL='https://claude.ai/artifact/XDcFd4N2BwtHHV2BwcZCFb';
export const myName=()=>{const n=lsGet('moropoly.name'); return (typeof n==='string'&&n.trim())?n.trim().slice(0,16):'';};
export const saveName=n=>{if(n&&n.trim()) lsSet('moropoly.name',n.trim().slice(0,16));};
export const inClaude=()=>!!(window.claude&&typeof window.claude.use==='function');
export function ensureCid(){
  if(app.myCid) return app.myCid;
  let c=null; try{c=localStorage.getItem('moropoly.cid');}catch(e){}
  if(!c){c='c'+rid(12); try{localStorage.setItem('moropoly.cid',c);}catch(e){}}
  app.myCid=c; return c;
}
const SITE_URL='https://moropoly.win/';
// invite links always point at moropoly.win (never at the old GitHub address), except when testing on this computer
export function inviteLink(code){if(inClaude()) return `${ARTIFACT_URL}#${code}`; const local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname); return `${local?location.origin+location.pathname:SITE_URL}#${code}`;}
