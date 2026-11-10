// Moropoly offline cache. This is a template: `npm run build` writes dist/sw.js with VERSION and FILES filled in.
const VERSION='dev';
const FILES=[];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin) return; // never touch the connection servers or fonts
  if(u.pathname.endsWith('.mp3')) return; // music streams straight from the network
  if(e.request.mode==='navigate'){e.respondWith(fetch(e.request.url,{cache:'no-cache'}).then(r=>{if(r.redirected) return Response.redirect(r.url,302); const cp=r.clone(); caches.open(VERSION).then(c=>c.put('index.html',cp)); return r;}).catch(()=>caches.match('index.html')));return;}
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const cp=r.clone(); caches.open(VERSION).then(c=>c.put(e.request,cp)); return r;})));
});
