// A tiny MQTT 3.1.1 client over WebSocket.
import {rid} from '../engine/util';

const U8=new TextEncoder(), D8=new TextDecoder();
function mqStr(s){const b=typeof s==='string'?U8.encode(s):s; const o=new Uint8Array(2+b.length); o[0]=b.length>>8; o[1]=b.length&255; o.set(b,2); return o;}
function mqPkt(h,...parts){let n=0; parts.forEach(p=>n+=p.length); const len=[]; let x=n; do{let d=x%128; x=Math.floor(x/128); if(x>0) d|=128; len.push(d);}while(x>0);
  const o=new Uint8Array(1+len.length+n); o[0]=h; o.set(len,1); let k=1+len.length; parts.forEach(p=>{o.set(p,k); k+=p.length;}); return o;}
export function MqConn(url,opt){
  // tiny MQTT 3.1.1 client: QoS 0, retained messages, last will, keep-alive, auto-reconnect
  const c={url,up:false,closed:false,subs:new Set(),ws:null,buf:new Uint8Array(0),pid:1,tries:0,ka:null,rt:null,lastIn:0};
  const send=b=>{try{if(c.ws&&c.ws.readyState===1){c.ws.send(b); return true;}}catch(e){} return false;};
  const sub=t=>send(mqPkt(0x82,new Uint8Array([c.pid>>8,(c.pid++)&255]),mqStr(t),new Uint8Array([0])));
  c.subscribe=t=>{c.subs.add(t); if(c.up) sub(t);};
  c.publish=(topic,payload,retain)=>{if(!c.up) return false; const body=typeof payload==='string'?U8.encode(payload):payload; return send(mqPkt(0x30|(retain?1:0),mqStr(topic),body));};
  const onPacket=(h,b)=>{
    const ty=h>>4;
    if(ty===2){ if(b[1]===0){c.up=true; c.tries=0; c.subs.forEach(sub); opt.onUp&&opt.onUp(c);} else {try{c.ws.close();}catch(e){}} }
    else if(ty===3){ const tl=(b[0]<<8)|b[1]; const topic=D8.decode(b.subarray(2,2+tl)); let k=2+tl; if((h>>1)&3) k+=2; opt.onMsg&&opt.onMsg(topic,b.subarray(k),!!(h&1),c); }
  };
  const onData=ab=>{
    c.lastIn=Date.now();
    const a=new Uint8Array(ab); const m=new Uint8Array(c.buf.length+a.length); m.set(c.buf); m.set(a,c.buf.length); c.buf=m;
    for(;;){
      if(c.buf.length<2) return;
      let mul=1,n=0,i=1,d; do{if(i>=c.buf.length) return; d=c.buf[i++]; n+=(d&127)*mul; mul*=128;}while(d&128);
      if(c.buf.length<i+n) return;
      const h=c.buf[0], body=c.buf.slice(i,i+n); c.buf=c.buf.slice(i+n);
      try{onPacket(h,body);}catch(e){}
    }
  };
  const retry=()=>{if(c.closed) return; clearTimeout(c.rt); c.rt=setTimeout(open,Math.min(15000,1000+c.tries*1500));};
  function open(){
    if(c.closed) return; c.tries++; c.up=false; c.buf=new Uint8Array(0);
    let ws; try{ws=new WebSocket(url,'mqtt');}catch(e){retry(); return;}
    c.ws=ws; ws.binaryType='arraybuffer';
    const guard=setTimeout(()=>{if(!c.up) try{ws.close();}catch(e){}},9000);
    ws.onopen=()=>{
      const id=U8.encode('mp'+rid(18));
      const will=opt.will&&opt.will();
      let flags=0x02; const parts=[mqStr('MQTT'),new Uint8Array([4,0,0,30]),mqStr(id)];
      if(will){flags|=0x04|0x20; parts.push(mqStr(will.topic),mqStr(U8.encode(will.payload||'')));}
      parts[1][1]=flags;
      send(mqPkt(0x10,...parts));
    };
    ws.onmessage=e=>{if(e.data instanceof ArrayBuffer) onData(e.data);};
    ws.onclose=()=>{clearTimeout(guard); const was=c.up; c.up=false; if(c.ws===ws) c.ws=null; if(was) opt.onDown&&opt.onDown(c); retry();};
    ws.onerror=()=>{};
  }
  c.ka=setInterval(()=>{if(c.up){send(new Uint8Array([0xC0,0])); if(Date.now()-c.lastIn>75000) try{c.ws.close();}catch(e){}}},20000);
  c.close=()=>{c.closed=true; clearInterval(c.ka); clearTimeout(c.rt); if(c.ws){try{send(new Uint8Array([0xE0,0])); c.ws.close();}catch(e){}} c.ws=null; c.up=false;};
  // waking a phone from sleep: reconnect right away instead of waiting for the timer
  c.kick=()=>{if(c.closed) return; if(!c.ws||c.ws.readyState>1){clearTimeout(c.rt); c.tries=0; open();} else if(c.up) send(new Uint8Array([0xC0,0]));};
  open();
  return c;
}
