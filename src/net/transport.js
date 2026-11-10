// Picks how to connect for online play and shows the online status on the home screen.
import {joinGame} from '../app/online';
import {app, ensureCid, inClaude} from '../app/state';
import {t} from '../i18n/core';
import {ClaudeT, claudeCaps} from './claude';
import {deviceKeys} from './crypto';
import {RelayT} from './relay';
import {$, esc} from '../ui/dom';

export function newTransport(){return inClaude()?ClaudeT():RelayT();}

export async function initNet(){
  if(inClaude()) await claudeCaps();
  else{try{const K=await deviceKeys(); if(K){app.myCid=K.cid; try{localStorage.setItem('moropoly.cid',app.myCid);}catch(e){}}}catch(e){}}
  ensureCid();
  const T=newTransport();
  setOnlineNote(T);
  if(T.ready()) listMyGames();
  const h=(location.hash||'').replace('#','').toLowerCase();
  if(/^[a-z0-9]{4,8}$/.test(h)) joinGame(h);
}
export function setOnlineNote(T){
  const n=$('onlineNote');
  if(T.kind==='claude'){
    if(T.ready()){n.textContent=t('note.claudeOn')+(T.canHost()?'':t('note.claudeHostNo')); $('hostBtn').disabled=!T.canHost();}
    else{n.textContent=t('note.claudeOff'); $('hostBtn').disabled=true;}
  } else if(!T.ready()){n.textContent=t('note.secure'); $('hostBtn').disabled=true;}
  else {n.textContent=t('note.peer'); $('hostBtn').disabled=false;}
}
export async function listMyGames(){
  try{
    const T=newTransport(); if(!T.ready()) return;
    const games=(await T.listMine()).filter(g=>g&&!g.over&&g.hostCid===app.myCid).sort((a,b)=>(b.updated||0)-(a.updated||0)).slice(0,4);
    $('myGames').innerHTML=games.map(g=>`<button class="btn sm" data-resume="${esc(g.code)}">${esc(t('home.resume',{c:String(g.code).toUpperCase(),w:g.status==='lobby'?t('home.lobby'):t('home.round',{n:g.round})}))}</button>`).join('');
    $('myGames').querySelectorAll('[data-resume]').forEach(b=>b.onclick=()=>joinGame(b.dataset.resume));
  }catch(e){}
}
