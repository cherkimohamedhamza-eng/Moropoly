// Picks how to connect for online play, and works out what the home page says about it.
import {joinGame} from '../app/online';
import {app, ensureCid, inClaude} from '../app/state';
import {refresh} from '../react/store';
import {ClaudeT, claudeCaps} from './claude';
import {ServerT, serverCid} from './server';

export function newTransport(){return inClaude()?ClaudeT():ServerT();}

export async function initNet(){
  if(inClaude()) await claudeCaps();
  else{try{if(window.crypto&&crypto.subtle) app.myCid=await serverCid();}catch(e){}}
  ensureCid();
  const T=newTransport();
  setOnlineNote(T);
  if(T.ready()) listMyGames();
  const h=(location.hash||'').replace('#','').toLowerCase();
  if(/^[a-z0-9]{4,12}$/.test(h)) joinGame(h);
}
/** the note under the home page's buttons, and whether hosting is possible here */
export function setOnlineNote(T){
  const H=app.home;
  if(T.kind==='claude'){
    if(T.ready()){H.note=['note.claudeOn',...(T.canHost()?[]:['note.claudeHostNo'])]; H.canHost=!!T.canHost();}
    else{H.note=['note.claudeOff']; H.canHost=false;}
  } else if(!T.ready()){H.note=['note.secure']; H.canHost=false;}
  else{H.note=['note.server']; H.canHost=true;}
  refresh();
}
/** the tables this device can go back to */
export async function listMyGames(){
  try{
    const T=newTransport(); if(!T.ready()) return;
    // on the server, every table this device sits at can be picked up again; inside Claude, only the ones it hosts
    const games=(await T.listMine()).filter(g=>g&&!g.over&&(T.kind==='server'||g.hostCid===app.myCid)).sort((a,b)=>(b.updated||0)-(a.updated||0)).slice(0,4);
    app.home.games=games.map(g=>({code:String(g.code),status:g.status,round:g.round}));
    refresh();
  }catch(e){}
}
