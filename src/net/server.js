// Online play through the Moropoly game server: one WebSocket per player, and the server runs the game.
// Messages are described in src/online/protocol.ts.
import {renderPresence} from '../app/online';
import {app} from '../app/state';
import {lsGet, lsSet} from '../lib/storage';
import {cidFromSecret} from '../online/protocol';

// the server is on the same address as the site, unless the build says otherwise (VITE_GAME_SERVER)
const BASE=(import.meta.env.VITE_GAME_SERVER||location.origin).replace(/\/+$/,'');
const apiURL=code=>`${BASE}/api/games/${encodeURIComponent(code)}`;
const wsURL=code=>apiURL(code).replace(/^http/,'ws')+'/ws';
const PING_EVERY=25000, DEAD_AFTER=70000;

/** a random secret that identifies this device to the server; it is never shown to other players */
export function deviceSecret(){
  let s=lsGet('moropoly.secret');
  if(typeof s!=='string'||s.length<20){
    const b=crypto.getRandomValues(new Uint8Array(24));
    s=btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    lsSet('moropoly.secret',s);
  }
  return s;
}
export const serverCid=()=>cidFromSecret(deviceSecret());

/* the tables this device has hosted or joined, for the home page */
export function rememberGame(code){const l=(lsGet('moropoly.games')||[]).filter(g=>g&&g.code!==code); l.unshift({code,at:Date.now()}); lsSet('moropoly.games',l.slice(0,12));}
function forgetGame(code){lsSet('moropoly.games',(lsGet('moropoly.games')||[]).filter(g=>g&&g.code!==code));}

export function ServerT(){
  const t={kind:'server',code:null,ws:null,up:false,stopped:false,created:false,gotState:false,startedAt:0,on:new Set(),out:[],tries:0,rt:null,ping:null,lastIn:0,
    hello:null,onState:null,onFatal:null,onRejected:null,welcomed:null,wake:null};
  t.ready=()=>typeof WebSocket==='function'&&!!(window.crypto&&crypto.subtle);
  t.canHost=t.ready;
  t.anyUp=()=>t.up;
  t.listMine=async()=>{
    const list=(lsGet('moropoly.games')||[]).filter(g=>g&&typeof g.code==='string');
    const res=await Promise.all(list.map(async g=>{
      try{const r=await fetch(apiURL(g.code)); if(r.status===404){forgetGame(g.code); return null;} return r.ok?await r.json():null;}catch(e){return null;}
    }));
    return res.filter(Boolean);
  };
  const send=m=>{try{t.ws.send(typeof m==='string'?m:JSON.stringify(m)); return true;}catch(e){return false;}};
  const flush=()=>{while(t.out.length&&t.up&&t.ws&&t.ws.readyState===1){if(!send(t.out[0])) break; t.out.shift();}};
  const retry=()=>{if(t.stopped) return; clearTimeout(t.rt); t.rt=setTimeout(open,Math.min(15000,500+t.tries*1500));};
  function open(){
    if(t.stopped) return; clearTimeout(t.rt); t.tries++;
    let ws; try{ws=new WebSocket(wsURL(t.code));}catch(e){retry(); return;}
    t.ws=ws; t.lastIn=Date.now();
    ws.onopen=()=>{t.lastIn=Date.now(); send(t.hello());};
    ws.onmessage=e=>{t.lastIn=Date.now(); if(e.data==='pong') return; let m; try{m=JSON.parse(e.data);}catch(x){return;} onMsg(m);};
    ws.onclose=()=>{if(t.ws!==ws) return; t.ws=null; const was=t.up; t.up=false; if(was){renderPresence(); t.onStatus&&t.onStatus();} retry();};
    ws.onerror=()=>{};
  }
  function onMsg(m){
    if(m.t==='welcome'){t.up=true; t.tries=0; t.created=true; flush(); renderPresence(); t.onStatus&&t.onStatus(); const w=t.welcomed; t.welcomed=null; w&&w(m);}
    else if(m.t==='state'){t.gotState=true; t.onState&&t.onState(m.G);}
    else if(m.t==='presence'){t.on=new Set(m.online||[]); renderPresence();}
    else if(m.t==='rejected'){t.onRejected&&t.onRejected(m.of);}
    else if(m.t==='error'){const f=t.onFatal; if(m.code==='noGame') forgetGame(t.code); t.leave(); f&&f({type:m.code});}
  }
  /** messages wait here while the connection is down, and go out once it is back */
  t.send=m=>{t.out.push(m); if(t.out.length>20) t.out.shift(); flush();};
  function start(code,hello,onState){
    t.code=code; t.hello=hello; t.onState=onState; t.startedAt=Date.now(); open();
    // a phone waking up reconnects straight away; a connection that went quiet is replaced
    t.wake=()=>{if(document.visibilityState!=='visible'||t.stopped) return; if(!t.ws){t.tries=0; open();} else if(t.up) send('ping');};
    document.addEventListener('visibilitychange',t.wake); addEventListener('online',t.wake);
    t.ping=setInterval(()=>{if(!t.ws||t.ws.readyState!==1) return; if(Date.now()-t.lastIn>DEAD_AFTER){try{t.ws.close();}catch(e){} return;} send('ping');},PING_EVERY);
  }
  /** opens a new table with this device as host; rejects with {type:'exists'} if the code is taken */
  t.create=(code,seat,onState)=>new Promise((res,rej)=>{
    t.welcomed=res; t.onFatal=rej;
    start(code,()=>t.created?{t:'hello',secret:deviceSecret()}:{t:'hello',secret:deviceSecret(),create:seat},onState);
  });
  t.join=(code,onState,onFatal)=>{t.onFatal=onFatal; start(code,()=>({t:'hello',secret:deviceSecret()}),onState);};
  t.onlineCids=()=>{const s=new Set(t.on); if(app.myCid) s.add(app.myCid); return s;};
  t.hostOnline=()=>t.up;
  t.leave=()=>{
    t.stopped=true; clearTimeout(t.rt); clearInterval(t.ping); t.up=false;
    if(t.ws){const ws=t.ws; t.ws=null; try{ws.close(1000);}catch(e){}}
    if(t.wake){document.removeEventListener('visibilitychange',t.wake); removeEventListener('online',t.wake);}
  };
  return t;
}
