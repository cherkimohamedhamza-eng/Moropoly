// Moropoly offline cache. Bump VERSION when you change the game.
const VERSION='moropoly-v4';
const FILES=['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png', 'assets/board.webp', 'assets/card-01.webp', 'assets/card-03.webp', 'assets/card-06.webp', 'assets/card-08.webp', 'assets/card-09.webp', 'assets/card-11.webp', 'assets/card-13.webp', 'assets/card-14.webp', 'assets/card-16.webp', 'assets/card-18.webp', 'assets/card-19.webp', 'assets/card-21.webp', 'assets/card-23.webp', 'assets/card-24.webp', 'assets/card-26.webp', 'assets/card-27.webp', 'assets/card-29.webp', 'assets/card-30.webp', 'assets/card-31.webp', 'assets/card-32.webp', 'assets/card-34.webp', 'assets/card-37.webp', 'assets/card-39.webp', 'assets/peerjs.min.js', 'assets/tok-0.webp', 'assets/tok-1.webp', 'assets/tok-2.webp', 'assets/tok-3.webp', 'assets/tok-4.webp', 'assets/tok-5.webp', 'assets/tok-6.webp', 'assets/tok-7.webp', 'assets/tok-8.webp', 'assets/tok-9.webp'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin) return; // never touch the connection servers or fonts
  if(u.pathname.endsWith('.mp3')) return; // music streams straight from the network
  if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const cp=r.clone(); caches.open(VERSION).then(c=>c.put('index.html',cp)); return r;}).catch(()=>caches.match('index.html')));return;}
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const cp=r.clone(); caches.open(VERSION).then(c=>c.put(e.request,cp)); return r;})));
});
