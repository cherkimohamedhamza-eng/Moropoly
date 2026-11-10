// Online play through public MQTT relays.
import {renderPresence} from '../app/online';
import {app} from '../app/state';
import {clone, rid} from '../engine/util';
import {lsGet, lsSet} from '../lib/storage';
import {KEYS, SUB, cidFrom, codeFrom, deviceKeys, gameKey, hex, open_, pinFor, pinOpen, seal, sha, signStr, verifyStr} from './crypto';
import {MqConn} from './mqtt';

/* ---------- transport 2: anywhere else (public MQTT relay over secure WebSocket) ----------
   Every player keeps one connection to each relay below; the host's state is published as a
   retained message, so someone who opens the link gets the table straight away. Works on any
   network (mobile data, hotel wifi, school networks) because nobody connects to anybody directly.
   Security: the relays only ever see encrypted bytes on unguessable topic names. The key comes
   from the game code, the host signs every board it sends (and the game code itself is derived
   from the host's public key, so nobody else can pretend to be the host), each player signs their
   own moves, and a table code is encrypted so that only the host can read it. */
const RELAYS=(()=>{try{if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){const o=new URLSearchParams(location.search).get('relay'); if(o) return o.split(',');}}catch(e){} return ['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt'];})();
const RELAY_ROOT='moropoly-hcmh/v2/';
export function RelayT(){
  const t={kind:'relay',conns:[],code:null,isHost:false,stopped:false,on:new Map(),onT:new Map(),hostCid:null,lastV:0,v:0,gotState:false,pendingG:null,pushT:null,lastPush:0,startedAt:0,q:null,key:null,base:null,chain:Promise.resolve(),hb:null,hostDh:null,sealed:null};
  t.ready=()=>typeof WebSocket==='function'&&!!SUB(); t.canHost=t.ready;
  t.load=async code=>lsGet('moropoly.host.'+code);
  t.listMine=async()=>{const out=[]; try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k&&k.startsWith('moropoly.host.')){const g=lsGet(k); if(g&&g.hostKey) out.push(g);}}}catch(e){} return out;};
  t.makeCode=async()=>{const K=await deviceKeys(); const nonce=rid(10); return {code:await codeFrom(K.sPub,nonce),nonce,hostKey:K.sPub,hostDh:K.dPub};};
  const T=s=>t.base+s;
  const queue=f=>{t.chain=t.chain.then(f).catch(()=>{}); return t.chain;};
  const pubAll=(topic,payload,retain)=>{let ok=false; t.conns.forEach(c=>{if(c.publish(topic,payload,retain)) ok=true;}); return ok;};
  t.anyUp=()=>t.conns.some(c=>c.up);
  const tag=async cid=>hex(await sha('mp2|tag|'+t.code+'|'+cid)).slice(0,16);
  let myOn=null, myReq=null;
  const prep=async code=>{
    t.code=code; const K=await deviceKeys(); if(!K) throw {type:'crypto'};
    t.key=await gameKey(code); t.base=RELAY_ROOT+hex(await sha('mp2|topic|'+code)).slice(0,32)+'/';
    myOn='on/'+await tag(app.myCid); myReq='req/'+await tag(app.myCid);
    t.myOnMsg=await seal(t.key,{cid:app.myCid});
  };
  const start=(subs,onMsg,onUp)=>{
    t.startedAt=Date.now();
    t.conns=RELAYS.map(u=>MqConn(u,{
      will:()=>({topic:T(myOn),payload:''}),
      onUp:c=>{subs.forEach(s=>c.subscribe(T(s))); c.publish(T(myOn),t.myOnMsg,true); onUp&&onUp(c); renderPresence(); t.onStatus&&t.onStatus();},
      onDown:()=>{renderPresence(); t.onStatus&&t.onStatus();},
      onMsg:(topic,b)=>{
        if(!topic.startsWith(t.base)) return; const rest=topic.slice(t.base.length); const bytes=b.slice();
        if(rest.startsWith('on/')){
          if(!bytes.length){const cid=t.onT.get(rest); t.onT.delete(rest); if(cid&&![...t.onT.values()].includes(cid)){t.on.delete(cid); renderPresence();} return;}
          open_(t.key,bytes).then(d=>{if(!d||typeof d.cid!=='string') return; const cid=d.cid.slice(0,40); tag(cid).then(x=>{if('on/'+x!==rest) return; t.onT.set(rest,cid); if(!t.on.has(cid)){t.on.set(cid,1); renderPresence();}});});
          return;
        }
        if(!bytes.length) return;
        open_(t.key,bytes).then(d=>{if(d) onMsg(rest,d);});
      }
    }));
    t.wake=()=>{if(document.visibilityState==='visible') t.conns.forEach(c=>c.kick());};
    document.addEventListener('visibilitychange',t.wake); addEventListener('online',t.wake);
  };
  const waitUp=ms=>new Promise((res,rej)=>{const t0=Date.now(); const iv=setInterval(()=>{if(t.anyUp()){clearInterval(iv); res();} else if(t.stopped||Date.now()-t0>ms){clearInterval(iv); rej({type:'relay'});}},100);});
  /* ----- host ----- */
  t.host=async(code,onIntent)=>{
    t.isHost=true; t.hostCid=app.myCid; await prep(code);
    start(['req/+','on/+'],(rest,d)=>{
      if(!rest.startsWith('req/')||!d||typeof d.m!=='string'||!d.k||typeof d.s!=='string') return;
      queue(async()=>{
        if(!await verifyStr(d.k,d.m,d.s)) return;                 // signed by the key it claims
        let o; try{o=JSON.parse(d.m);}catch(e){return;}
        if(!o||typeof o.cid!=='string'||!Array.isArray(o.q)) return;
        if(o.cid!==await cidFrom(d.k)) return;                     // and that key owns this player id
        if(rest!=='req/'+await tag(o.cid)) return;
        for(const it of o.q){const a=it&&it.a; if(a&&a.t==='join'&&a.pinE){a.pin=(await pinOpen(a.pinE))||''; delete a.pinE;}}
        onIntent(o.cid,o.q);
      });
    },c=>{if(t.sealed) c.publish(T('state'),t.sealed,true);});
    t.hb=setInterval(()=>{if(t.sealed) pubAll(T('state'),t.sealed,true);},15000); // heals a relay that lost or was fed a bad copy
    await waitUp(15000);
  };
  const flush=()=>{t.pushT=null; if(!t.pendingG) return; t.lastPush=Date.now(); const g=t.pendingG;
    queue(async()=>{t.v=Math.max(t.v+1,Date.now()); const m=JSON.stringify({v:t.v,G:g}); t.sealed=await seal(t.key,{m,s:await signStr(m)}); pubAll(T('state'),t.sealed,true);
      if(g.over&&!t.clearT) t.clearT=setTimeout(()=>t.wipe(g),180000);});};
  t.push=g=>{
    lsSet('moropoly.host.'+t.code,g); t.pendingG=clone(g);
    if(t.pushT) return; const wait=Math.max(0,120-(Date.now()-t.lastPush));
    if(wait===0) flush(); else t.pushT=setTimeout(flush,wait);
  };
  /* when a game is over, remove what is left on the relays */
  t.wipe=async g=>{const cids=new Set(((g||t.pendingG||{}).players||[]).map(p=>p.cid).filter(Boolean)); for(const cid of cids){const x=await tag(cid); pubAll(T('req/'+x),'',true);} pubAll(T('state'),'',true); t.sealed=null;};
  /* ----- guest ----- */
  t.join=async(code,onState)=>{
    await prep(code); t.onState=onState;
    start(['state','on/+'],(rest,d)=>{
      if(rest!=='state'||!d||typeof d.m!=='string'||typeof d.s!=='string') return;
      queue(async()=>{
        let o; try{o=JSON.parse(d.m);}catch(e){return;}
        if(!o||typeof o.v!=='number'||!o.G||!o.G.hostKey||typeof o.G.nonce!=='string') return;
        if(o.v<=t.lastV) return;
        if(await codeFrom(o.G.hostKey,o.G.nonce)!==t.code) return;   // the game code proves who the host is
        if(!await verifyStr(o.G.hostKey,d.m,d.s)) return;              // and the host signed this board
        if(o.v<=t.lastV) return;
        t.lastV=o.v; t.gotState=true; t.hostCid=o.G.hostCid||null; t.hostDh=o.G.hostDh||null; t.onStatus&&t.onStatus(); onState(o.G);
      });
    },c=>{if(t.reqSealed) c.publish(T(myReq),t.reqSealed,true);});
  };
  t.send=q=>{
    t.q=q; const snap=JSON.parse(JSON.stringify(q));
    queue(async()=>{
      for(const it of snap){const a=it&&it.a; if(a&&a.t==='join'&&a.pin){if(!t.hostDh) return; a.pinE=await pinFor(t.hostDh,a.pin); a.pin='';}}
      const m=JSON.stringify({cid:app.myCid,q:snap});
      t.reqSealed=await seal(t.key,{m,k:KEYS.sPub,s:await signStr(m)}); pubAll(T(myReq),t.reqSealed,true);
    });
  };
  t.onlineCids=()=>{const s=new Set(t.on.keys()); if(app.myCid) s.add(app.myCid); return s;};
  t.hostOnline=()=>t.isHost||(!!t.hostCid&&t.on.has(t.hostCid));
  t.leave=()=>{
    t.stopped=true; clearTimeout(t.pushT); clearInterval(t.hb);
    if(t.base){ if(!t.isHost&&myReq) pubAll(T(myReq),'',true); if(myOn) pubAll(T(myOn),'',true); if(t.isHost&&t.pendingG&&t.pendingG.over){clearTimeout(t.clearT); t.wipe(t.pendingG);} }
    setTimeout(()=>t.conns.forEach(c=>c.close()),900);
    if(t.wake){document.removeEventListener('visibilitychange',t.wake); removeEventListener('online',t.wake);}
  };
  return t;
}
