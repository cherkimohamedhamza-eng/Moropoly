// Checks a running game server with two pretend players: creating a table, joining, the host's controls,
// moves, reconnecting and the summary endpoint. Uses a fresh table each time.
//   node scripts/check-server.mjs                       the local server (npm run dev:server)
//   node scripts/check-server.mjs https://example.com   a deployed one
const base = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/+$/, '');
const ws = base.replace(/^http/, 'ws');
const code = 'chk' + Math.random().toString(36).slice(2, 7).replace(/[^a-z0-9]/g, 'x');
const wait = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (what, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failed++; };

function player(secret) {
  const p = { msgs: [], G: null, cid: null, online: [], secret };
  p.sock = new WebSocket(`${ws}/api/games/${code}/ws`);
  p.open = new Promise((res, rej) => { p.sock.addEventListener('open', res); p.sock.addEventListener('error', rej); });
  p.closed = new Promise(r => p.sock.addEventListener('close', e => r(e.code)));
  p.sock.addEventListener('message', e => {
    if (e.data === 'pong') { p.pong = true; return; }
    const m = JSON.parse(e.data); p.msgs.push(m);
    if (m.t === 'state') p.G = m.G; if (m.t === 'welcome') p.cid = m.cid; if (m.t === 'presence') p.online = m.online;
  });
  p.send = m => p.sock.send(typeof m === 'string' ? m : JSON.stringify(m));
  p.hello = create => p.send({ t: 'hello', secret, ...(create ? { create } : {}) });
  return p;
}
const rand = () => crypto.randomUUID();

const host = player(rand());
await host.open; host.hello({ name: 'Hamza', token: 0 }); await wait(500);
check('host opens a table and gets it back', host.cid && host.G?.status === 'lobby' && host.G.hostCid === host.cid);

const twice = player(rand());
await twice.open; twice.hello({ name: 'X', token: 1 }); await wait(500);
check('the same table cannot be opened twice', twice.msgs.some(m => m.t === 'error' && m.code === 'exists'));

const guestSecret = rand();
const guest = player(guestSecret);
await guest.open; guest.hello(); await wait(300);
guest.send({ t: 'join', name: 'Salma', token: 0, auto: true }); await wait(500);
check('a guest sits down with a free token', host.G.players.map(p => p.token).join() === '0,1' && guest.G.players.length === 2);
check('both players are shown online', host.online.length === 2);

guest.send({ t: 'host', op: 'start' }); await wait(400);
check('only the host can start', guest.msgs.some(m => m.t === 'rejected') && host.G.status === 'lobby');

host.send({ t: 'host', op: 'pin', pin: '2468' }); host.send({ t: 'host', op: 'addBot' }); host.send({ t: 'host', op: 'start' }); await wait(600);
check('the host adds a computer player and starts', host.G.status === 'play' && host.G.players.length === 3);
check('the table code is never sent to players', !JSON.stringify(host.msgs.concat(guest.msgs)).includes('2468'));

guest.send({ t: 'move', seat: 0, a: { t: 'roll' } }); host.send({ t: 'move', seat: 0, a: { t: 'roll' } }); await wait(600);
check('moves only count from the right player', guest.G.log.some(e => e[0] === 'rolls') && guest.msgs.some(m => m.t === 'rejected'));

host.send('ping'); await wait(400);
check('keep-alive pings are answered', host.pong);

const summary = await (await fetch(`${base}/api/games/${code}`)).json();
check('the summary endpoint answers', summary.code === code && summary.status === 'play');
check('unknown tables are 404', (await fetch(`${base}/api/games/nosuch99`)).status === 404);

guest.sock.close(); await wait(600);
check('a player who leaves shows as offline', host.online.length === 1);
const back = player(guestSecret);
await back.open; back.hello(); await wait(500);
check('reconnecting gives the same player and seat', back.cid === guest.cid && back.G.players.some(p => p.cid === back.cid));

host.sock.close(); back.sock.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
