// Plays seeded games against any copy of the engine, so the original single-file version and the
// current modules can be compared move by move. Plain JavaScript so the fixture script can use it too.
import { createHash } from 'node:crypto';

/** mulberry32: small seeded random number generator */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** JSON with sorted keys, so harmless key-order changes do not count as differences */
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}
export const fingerprint = (ok, G) => createHash('sha1').update(stable({ ok, G })).digest('hex').slice(0, 10);

/** a human player who tries all kinds of moves, legal or not */
function humanAction(G, seat, r) {
  const pick = a => a[Math.floor(r() * a.length)];
  const p = G.players[seat];
  if (G.trade && G.trade.to === seat) return { t: 'tradeReply', accept: r() < 0.5 };
  if (G.auction) return r() < 0.55 ? { t: 'bid', inc: pick([100, 500, 1000, 7]) } : { t: 'pass' };
  const owned = pid => Object.keys(G.props).map(Number).filter(i => G.props[i].owner === pid);
  const mine = owned(seat);
  const x = r();
  if (x < 0.25 && mine.length) return { t: pick(['build', 'build', 'riad', 'sell', 'mort', 'unmort']), i: pick(mine) };
  if (x < 0.3) {
    const others = G.players.filter(q => q.id !== seat && !q.bankrupt);
    if (others.length) {
      const o = pick(others);
      return {
        t: 'trade', to: o.id,
        give: mine.filter(() => r() < 0.3), get: owned(o.id).filter(() => r() < 0.3),
        cashGive: r() < 0.5 ? Math.floor(r() * 2000) : 0, cashGet: r() < 0.3 ? Math.floor(r() * 1000) : 0,
      };
    }
  }
  if (x < 0.32 && G.trade && G.trade.from === seat) return { t: 'tradeCancel' };
  if (p.cash < 0) return r() < 0.5 || !mine.length ? { t: 'bankrupt' } : { t: pick(['sell', 'mort']), i: pick(mine) };
  if (G.phase === 'roll') return p.inJail ? pick([{ t: 'roll' }, { t: 'fine' }, { t: 'card' }]) : { t: 'roll' };
  if (G.phase === 'buy') return r() < 0.6 ? { t: 'buy' } : { t: 'decline' };
  return { t: 'end' };
}

/** starting positions that reach the rarer rules quickly (building, debts, bankruptcy) */
const SETUPS = {
  // every colour group, station and utility already owned, and little cash left
  owned(G, SP, cash) {
    const n = G.players.length;
    const groups = [...new Set(SP.filter(s => s.t === 'prop').map(s => s.g))];
    SP.forEach((s, i) => {
      if (s.t === 'prop') G.props[i].owner = groups.indexOf(s.g) % n;
      else if (s.t === 'rail' || s.t === 'util') G.props[i].owner = i % n;
    });
    G.players.forEach(p => { p.cash = cash; });
  },
  poor(G, SP, cash) { G.players.forEach(p => { p.cash = cash; }); },
};

/**
 * Plays one game. `eng` is {freshGame, apply, botDecide, actorOf, SP}; `setRandom` installs the engine's
 * random number generator (Math.random) for whichever copy of the engine is being played.
 * Returns the fingerprint after every move.
 */
export function playGame(eng, setRandom, cfg) {
  setRandom(makeRng(cfg.seed));
  const r = makeRng(cfg.seed ^ 0x5bd1e995); // the human players' own dice, separate from the engine's
  const G = eng.freshGame(cfg.seats, cfg.settings);
  if (cfg.setup) SETUPS[cfg.setup[0]](G, eng.SP, cfg.setup[1]);
  const prints = [fingerprint(true, G)];
  for (let step = 0; step < cfg.maxSteps && !G.over; step++) {
    // now and then someone acts out of turn: withdrawing their trade offer, or trying a move they may not make
    if (G.trade && G.players[G.trade.from].human && r() < 0.15) {
      prints.push(fingerprint(eng.apply(G, G.trade.from, { t: 'tradeCancel' }), G));
      continue;
    }
    if (r() < 0.04) {
      const s = Math.floor(r() * G.players.length);
      prints.push(fingerprint(eng.apply(G, s, humanAction(G, s, r)), G));
      continue;
    }
    const seat = eng.actorOf(G);
    if (seat < 0) break;
    let a;
    if (G.players[seat].human) a = humanAction(G, seat, r);
    else {
      const d = eng.botDecide(G);
      if (!d) break;
      a = d.a;
    }
    const ok = eng.apply(G, seat, a);
    prints.push(fingerprint(ok, G));
  }
  return prints;
}

const NAMES = ['Hamza', 'Salma', 'Youssef', 'Imane', 'Karim', 'Nadia', 'Omar', 'Zineb'];
const seats = humans => humans.map((h, i) => ({ name: NAMES[i], token: i, human: h }));

/** the games both versions play: player counts, house rules and human/computer mixes */
export const GAMES = [
  { seed: 1, seats: seats([false, false]), settings: {}, maxSteps: 4000 },
  { seed: 2, seats: seats([false, false, false, false]), settings: {}, maxSteps: 4000 },
  { seed: 3, seats: seats([false, false, false, false, false, false, false, false]), settings: {}, maxSteps: 6000 },
  { seed: 4, seats: seats([false, false, false]), settings: { daret: false, dlala: false }, maxSteps: 4000 },
  { seed: 5, seats: seats([false, false, false, false]), settings: { rounds: 60 }, maxSteps: 8000 },
  { seed: 6, seats: seats([true, false]), settings: {}, maxSteps: 4000 },
  { seed: 7, seats: seats([true, true, false]), settings: {}, maxSteps: 4000 },
  { seed: 8, seats: seats([true, true, true, true]), settings: { rounds: 40 }, maxSteps: 6000 },
  { seed: 9, seats: seats([true, false, true, false, true]), settings: { daret: false }, maxSteps: 6000 },
  { seed: 10, seats: seats([true, true]), settings: { dlala: false, rounds: 30 }, maxSteps: 4000 },
  { seed: 11, seats: seats([false, true, false, true, false, true]), settings: { rounds: 25 }, maxSteps: 6000 },
  { seed: 12, seats: seats([true, true, true]), settings: { rounds: 80 }, maxSteps: 8000 },
  { seed: 13, seats: seats([false, false, false, false]), settings: {}, setup: ['owned', 3000], maxSteps: 6000 },
  { seed: 14, seats: seats([true, true, true]), settings: {}, setup: ['owned', 2500], maxSteps: 6000 },
  { seed: 15, seats: seats([true, false, true, false]), settings: { daret: false }, setup: ['owned', 4000], maxSteps: 6000 },
  { seed: 16, seats: seats([false, false, false, false, false, false]), settings: {}, setup: ['poor', 1200], maxSteps: 6000 },
  { seed: 17, seats: seats([true, true, true, true, true]), settings: { dlala: false }, setup: ['poor', 1500], maxSteps: 6000 },
  { seed: 18, seats: seats([true, true]), settings: { rounds: 0 }, setup: ['owned', 1000], maxSteps: 6000 },
];
