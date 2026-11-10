// Device keys, signatures and encryption for online play.
import {lsGet, lsSet} from '../lib/storage';

const CODE_ABC='abcdefghjkmnpqrstuvwxyz23456789';
export const SUB=()=>window.crypto&&crypto.subtle;
const b64=u=>{let s=''; const a=new Uint8Array(u); for(let i=0;i<a.length;i++) s+=String.fromCharCode(a[i]); return btoa(s);};
const unb64=s=>{const r=atob(s); const a=new Uint8Array(r.length); for(let i=0;i<r.length;i++) a[i]=r.charCodeAt(i); return a;};
export async function sha(str){return new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)));}
export const hex=u=>[...u].map(x=>x.toString(16).padStart(2,'0')).join('');
const ECDSA={name:'ECDSA',namedCurve:'P-256'}, ECDH={name:'ECDH',namedCurve:'P-256'}, SIGN={name:'ECDSA',hash:'SHA-256'};
const pubXY=j=>({x:j.x,y:j.y});
const jwkOf=(xy,ops)=>({kty:'EC',crv:'P-256',x:String(xy.x),y:String(xy.y),ext:true,key_ops:ops});
export async function codeFrom(hostKey,nonce){const h=await sha('mp2|code|'+hostKey.x+'|'+hostKey.y+'|'+nonce); let s=''; for(let i=0;i<8;i++) s+=CODE_ABC[h[i]%CODE_ABC.length]; return s;}
export async function cidFrom(k){return 'k'+hex(await sha('mp2|cid|'+k.x+'|'+k.y)).slice(0,18);}
/* this device's keys: kept in IndexedDB so the private halves can never be read back, with a localStorage fallback */
export let KEYS=null;
function idb(){return new Promise((res,rej)=>{let r; try{r=indexedDB.open('moropoly-keys',1);}catch(e){rej(e); return;} r.onupgradeneeded=()=>r.result.createObjectStore('k'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);});}
async function idbGet(db,k){return new Promise((res,rej)=>{const q=db.transaction('k').objectStore('k').get(k); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error);});}
async function idbPut(db,k,v){return new Promise((res,rej)=>{const q=db.transaction('k','readwrite').objectStore('k').put(v,k); q.onsuccess=()=>res(); q.onerror=()=>rej(q.error);});}
export async function deviceKeys(){
  if(KEYS) return KEYS; if(!SUB()) return null;
  let rec=null, db=null;
  try{db=await idb(); rec=await idbGet(db,'v1');}catch(e){db=null;}
  if(!rec){const ls=lsGet('moropoly.keys.v1'); if(ls&&ls.sp){try{rec={s:{privateKey:await crypto.subtle.importKey('jwk',ls.sp,ECDSA,false,['sign'])},d:{privateKey:await crypto.subtle.importKey('jwk',ls.dp,ECDH,false,['deriveKey'])},sPub:ls.sPub,dPub:ls.dPub};}catch(e){rec=null;}}}
  if(!rec){
    const s=await crypto.subtle.generateKey(ECDSA,!db,['sign','verify']), d=await crypto.subtle.generateKey(ECDH,!db,['deriveKey']);
    const sPub=pubXY(await crypto.subtle.exportKey('jwk',s.publicKey)), dPub=pubXY(await crypto.subtle.exportKey('jwk',d.publicKey));
    rec={s:{privateKey:s.privateKey},d:{privateKey:d.privateKey},sPub,dPub};
    if(db){try{await idbPut(db,'v1',rec);}catch(e){db=null;}}
    if(!db){try{lsSet('moropoly.keys.v1',{sp:await crypto.subtle.exportKey('jwk',s.privateKey),dp:await crypto.subtle.exportKey('jwk',d.privateKey),sPub,dPub});}catch(e){}}
  }
  KEYS={sign:rec.s.privateKey,dh:rec.d.privateKey,sPub:rec.sPub,dPub:rec.dPub,cid:await cidFrom(rec.sPub)};
  return KEYS;
}
const keyCache=new Map();
async function verifyKey(xy){const k=xy.x+'.'+xy.y; if(!keyCache.has(k)) keyCache.set(k,await crypto.subtle.importKey('jwk',jwkOf(xy,['verify']),ECDSA,false,['verify'])); return keyCache.get(k);}
export async function signStr(m){return b64(await crypto.subtle.sign(SIGN,KEYS.sign,new TextEncoder().encode(m)));}
export async function verifyStr(xy,m,sig){try{return await crypto.subtle.verify(SIGN,await verifyKey(xy),unb64(sig),new TextEncoder().encode(m));}catch(e){return false;}}
export async function gameKey(code){
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode('mp2|'+code),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode('moropoly-relay-v2'),iterations:150000},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function seal(key,obj){const iv=crypto.getRandomValues(new Uint8Array(12)); const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(obj)))); const o=new Uint8Array(12+ct.length); o.set(iv); o.set(ct,12); return o;}
export async function open_(key,b){if(!b||b.length<29) return null; try{const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b.slice(0,12)},key,b.slice(12)); return JSON.parse(new TextDecoder().decode(pt));}catch(e){return null;}}
/* the table code travels encrypted to the host's own key, so other people holding the link cannot read it */
export async function pinFor(hostDh,pin){
  const e=await crypto.subtle.generateKey(ECDH,true,['deriveKey']);
  const k=await crypto.subtle.deriveKey({name:'ECDH',public:await crypto.subtle.importKey('jwk',jwkOf(hostDh,[]),ECDH,false,[])},e.privateKey,{name:'AES-GCM',length:256},false,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12)); const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(String(pin)));
  return {e:pubXY(await crypto.subtle.exportKey('jwk',e.publicKey)),iv:b64(iv),c:b64(ct)};
}
export async function pinOpen(pe){
  try{const k=await crypto.subtle.deriveKey({name:'ECDH',public:await crypto.subtle.importKey('jwk',jwkOf(pe.e,[]),ECDH,false,[])},KEYS.dh,{name:'AES-GCM',length:256},false,['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(pe.iv)},k,unb64(pe.c)));}catch(e){return null;}
}
