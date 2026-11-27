// Online play when the game runs inside Claude (artifact database and room capabilities).
import {renderPresence} from '../app/online';
import {app} from '../app/state';
import {clone} from '../engine/util';
import {_t} from '../i18n/core';
import {toast} from '../ui/dom';

/* ---------- transport 1: inside Claude (db + room capabilities) ---------- */
export async function claudeCaps(){
  if(app.CAPS) return app.CAPS;
  app.CAPS={db:null,room:null,user:null,canWrite:null};
  try{
    const c=window.claude; const [db,room,user]=await Promise.all([c.use('db'),c.use('room'),c.use('user')]);
    app.CAPS.db=db; app.CAPS.room=room; app.CAPS.user=user;
    if(user){const id=await user.id(); if(id) app.myCid=id; app.CAPS.canWrite=await user.can('data.write');}
  }catch(e){}
  return app.CAPS;
}
export function ClaudeT(){
  const C=app.CAPS||{}; const t={kind:'claude',docRef:null,unsub:[],named:null,writing:false,dirty:false,reqWriting:false,reqDirty:false,dbWriteOk:true,pending:null};
  t.ready=()=>!!C.db; t.canHost=()=>!!C.db&&C.canWrite!==false;
  t.load=async code=>{const s=await C.db.doc('games/'+code).get(); return s.exists?s.data():null;};
  t.listMine=async()=>{const s=await C.db.collection('games').where('hostCid','==',app.myCid).limit(20).get(); return s.docs.map(d=>d.data());};
  t.joinRoom=async(code,asHost,onIntent)=>{
    if(!C.room) return;
    try{
      t.named=await C.room.join('mp-'+code);
      t.named.presence(asHost?{host:true,cid:app.myCid}:{cid:app.myCid,q:app.NET.myQ}).catch(()=>{});
      t.unsub.push(t.named.onPeers(ch=>{
        if(asHost) [...ch.joined,...ch.updated].forEach(pe=>{if(pe.isMe) return; const pr=pe.presence||{}; onIntent(pe.by||pr.cid,pr.q);});
        renderPresence();
      },()=>{}));
    }catch(e){t.named=null;}
  };
  t.host=async(code,onIntent)=>{
    t.docRef=C.db.doc('games/'+code);
    t.unsub.push(C.db.collection(`games/${code}/req`).onSnapshot(qs=>qs.docs.forEach(d=>{const x=d.data(); if(x) onIntent(x.cid,x.q);}),()=>{}));
    await t.joinRoom(code,true,onIntent);
  };
  t.push=async g=>{
    t.pending=g; if(t.writing){t.dirty=true; return;}
    t.writing=true;
    try{do{t.dirty=false; await t.docRef.set(clone(t.pending));}while(t.dirty);}
    catch(e){toast(_t(e&&e.code==='quota_exceeded'?'store.full':'store.retry'));}
    t.writing=false;
  };
  t.join=async(code,onState)=>{
    t.docRef=C.db.doc('games/'+code);
    t.unsub.push(t.docRef.onSnapshot(s=>{if(s.exists){const d=s.data(); if(d) onState(d);}},()=>{}));
    await t.joinRoom(code,false);
  };
  t.send=q=>{
    if(t.named) t.named.presence({cid:app.myCid,q}).catch(()=>{});
    if(C.db&&t.dbWriteOk&&C.canWrite!==false) t.writeReq(q);
  };
  t.writeReq=async q=>{
    t.reqQ=q; if(t.reqWriting){t.reqDirty=true; return;}
    t.reqWriting=true;
    try{do{t.reqDirty=false; await C.db.doc(`games/${app.NET.code}/req/${app.myCid}`).set({cid:app.myCid,q:t.reqQ,at:Date.now()});}while(t.reqDirty);}
    catch(e){if(e&&e.code==='invalid_argument') t.dbWriteOk=false;}
    t.reqWriting=false;
  };
  t.onlineCids=()=>{if(!t.named) return null; const s=new Set(); t.named.peers().forEach(pe=>{const c=pe.by||(pe.presence&&pe.presence.cid); if(c) s.add(c);}); if(app.myCid) s.add(app.myCid); return s;};
  t.hostOnline=()=>{if(!t.named) return true; return t.named.peers().some(pe=>pe.presence&&pe.presence.host&&!pe.isMe);};
  t.leave=()=>{t.unsub.forEach(f=>{try{f();}catch(e){}}); t.unsub=[]; try{t.named&&t.named.leave();}catch(e){} t.named=null;};
  return t;
}
