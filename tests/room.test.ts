// The game server's table logic, with a pretend clock.
import { describe, expect, it } from 'vitest';
import { Room, KEEP_OVER } from '../src/online/room';
import type { Game } from '../src/engine/types';
import type { Lobby } from '../src/online/table';

const HOST = 'khost', ANA = 'kana', BOB = 'kbob';
const T0 = 1_000_000;

function lobby() {
  const r = new Room(null);
  expect(r.create('abcd2345', HOST, { name: 'Hamza', token: 0 }, T0)).toBe(true);
  return r;
}
function started(...others: string[]) {
  const r = lobby();
  others.forEach((cid, i) => r.handle(cid, { t: 'join', name: 'P' + i, token: i + 1 }, T0));
  expect(r.handle(HOST, { t: 'host', op: 'start' }, T0)).toBe('changed');
  return r;
}
const G = (r: Room) => r.d!.G as Game;
const L = (r: Room) => r.d!.G as Lobby;
/** runs the clock forward, letting the computer and the turn timer move, until `until` is true */
function runUntil(r: Room, until: () => boolean, maxSteps = 5000) {
  let now = T0;
  for (let i = 0; i < maxSteps && !until(); i++) {
    const at = r.nextWake();
    if (at == null) break;
    now = Math.max(now, at);
    r.tick(now);
  }
  return now;
}

describe('a new table', () => {
  it('seats the host and can only be created once', () => {
    const r = lobby();
    expect(L(r)).toMatchObject({ status: 'lobby', code: 'abcd2345', hostCid: HOST });
    expect(L(r).players).toEqual([{ cid: HOST, name: 'Hamza', token: 0, human: true }]);
    expect(r.create('abcd2345', ANA, { name: 'x', token: 1 }, T0)).toBe(false);
  });
  it('lets players sit down, picks a free token when theirs is taken, and stops at 8', () => {
    const r = lobby();
    expect(r.handle(ANA, { t: 'join', name: '  Salma  ', token: 0, auto: true }, T0)).toBe('changed');
    expect(L(r).players[1]).toMatchObject({ cid: ANA, name: 'Salma', token: 1 });
    for (let i = 0; i < 6; i++) r.handle('k' + i, { t: 'join', name: 'p' + i, token: 2 + i }, T0);
    expect(L(r).players).toHaveLength(8);
    expect(r.handle('kextra', { t: 'join', name: 'late', token: 9 }, T0)).toBe('rejected');
  });
  it('lets a player leave before the game starts', () => {
    const r = lobby();
    r.handle(ANA, { t: 'join', name: 'Salma', token: 1 }, T0);
    expect(r.handle(ANA, { t: 'leave' }, T0)).toBe('changed');
    expect(L(r).players).toHaveLength(1);
  });
});

describe('the table code', () => {
  it('is set by the host, checked by the server, and never sent to players', () => {
    const r = lobby();
    expect(r.handle(ANA, { t: 'host', op: 'pin', pin: '1234' }, T0)).toBe('rejected');
    expect(r.handle(HOST, { t: 'host', op: 'pin', pin: '12' }, T0)).toBe('rejected');
    expect(r.handle(HOST, { t: 'host', op: 'pin', pin: '4321' }, T0)).toBe('changed');
    expect(L(r).pinOn).toBe(true);
    r.handle(ANA, { t: 'join', name: 'Salma', token: 1, pin: '0000' }, T0);
    expect(L(r).denied).toEqual({ [ANA]: 1 });
    expect(L(r).players).toHaveLength(1);
    r.handle(ANA, { t: 'join', name: 'Salma', token: 1, pin: '4321' }, T0);
    expect(L(r).players).toHaveLength(2);
    expect(JSON.stringify(r.view(T0))).not.toContain('4321');
  });
});

describe('host controls', () => {
  it('only the host changes the rules, adds computers, removes seats and starts', () => {
    const r = lobby();
    for (const op of [{ op: 'addBot' }, { op: 'start' }, { op: 'kick', index: 0 }] as const) {
      expect(r.handle(ANA, { t: 'host', ...op }, T0)).toBe('rejected');
    }
    expect(r.handle(HOST, { t: 'host', op: 'start' }, T0)).toBe('rejected'); // needs 2 players
    r.handle(HOST, { t: 'host', op: 'settings', settings: { rounds: 15, timer: 999 as never, daret: 'yes' as never, fast: true } }, T0);
    expect(L(r).settings).toEqual({ daret: true, dlala: true, rounds: 15, fast: true, timer: 0 });
    r.handle(HOST, { t: 'host', op: 'addBot' }, T0);
    expect(L(r).players[1]).toMatchObject({ cid: null, human: false, name: 'Salma' });
    r.handle(HOST, { t: 'host', op: 'start' }, T0);
    expect(G(r)).toMatchObject({ status: 'play', code: 'abcd2345', hostCid: HOST });
    expect(G(r).settings.rounds).toBe(15);
  });
  it('can let the computer play for someone, and hand the seat back', () => {
    const r = started(ANA);
    expect(r.handle(ANA, { t: 'host', op: 'bot', seat: 1 }, T0)).toBe('rejected');
    r.handle(HOST, { t: 'host', op: 'bot', seat: 1 }, T0);
    expect(G(r).players[1].human).toBe(false);
    r.handle(HOST, { t: 'host', op: 'bot', seat: 1 }, T0);
    expect(G(r).players[1].human).toBe(true);
  });
});

describe('moves', () => {
  it('are only taken from the device in that seat, on its turn', () => {
    const r = started(ANA);
    expect(r.handle(ANA, { t: 'move', seat: 0, a: { t: 'roll' } }, T0)).toBe('rejected');
    expect(r.handle(ANA, { t: 'move', seat: 1, a: { t: 'roll' } }, T0)).toBe('rejected');
    expect(r.handle(HOST, { t: 'move', seat: 0, a: { t: 'roll' } }, T0)).toBe('changed');
    expect(G(r).turn === 1 && G(r).log.some(e => e[0] === 'rolls')).toBe(true);
  });
  it('lets someone join after the game has started', () => {
    const r = started(ANA);
    expect(r.handle(BOB, { t: 'join', name: 'Youssef', token: 0, auto: true }, T0)).toBe('changed');
    expect(G(r).players[2]).toMatchObject({ cid: BOB, name: 'Youssef', cash: 15000, lateRound: 1 });
    expect(G(r).players[2].token).not.toBe(0);
  });
});

describe('computer players', () => {
  it('move on their own, waiting for screens to finish the previous move', () => {
    const r = lobby();
    r.handle(HOST, { t: 'host', op: 'addBot' }, T0);
    r.handle(HOST, { t: 'host', op: 'addBot' }, T0);
    r.handle(HOST, { t: 'host', op: 'start' }, T0);
    expect(r.d!.botAt).toBeNull(); // the host goes first
    for (let i = 0; i < 20 && G(r).phase !== 'end'; i++) { // roll (again after a double), buying whatever is for sale
      const a = G(r).phase === 'buy' ? 'buy' : G(r).auction ? 'pass' : 'roll';
      r.handle(HOST, { t: 'move', seat: 0, a: { t: a } }, T0);
    }
    expect(G(r).phase).toBe('end');
    r.handle(HOST, { t: 'move', seat: 0, a: { t: 'end' } }, T0);
    const firstBot = r.d!.botAt!;
    expect(firstBot).toBeGreaterThan(r.d!.busyUntil - 1); // after the animations
    expect(firstBot - T0).toBeGreaterThan(1000); // at least the dice and the pawn's walk
    expect(r.tick(firstBot - 1)).toBe(false);
    expect(r.tick(firstBot)).toBe(true);
    runUntil(r, () => G(r).cur === 0 && !G(r).auction && !G(r).trade);
    expect(G(r).turn).toBeGreaterThanOrEqual(3);
  });
  it('play a whole game among themselves', () => {
    const r = lobby();
    r.handle(HOST, { t: 'host', op: 'settings', settings: { rounds: 15 } }, T0);
    r.handle(HOST, { t: 'host', op: 'addBot' }, T0);
    r.handle(HOST, { t: 'host', op: 'addBot' }, T0);
    r.handle(HOST, { t: 'host', op: 'start' }, T0);
    r.handle(HOST, { t: 'host', op: 'bot', seat: 0 }, T0); // the host lets the computer play for them too
    const end = runUntil(r, () => G(r).over, 20000);
    expect(G(r).over).toBe(true);
    expect(end - T0).toBeGreaterThan(15 * 3 * 2000); // paced like a real game, not instant
    expect(r.expiresAt()).toBe(G(r).updated! + KEEP_OVER);
    expect(r.summary()).toMatchObject({ code: 'abcd2345', status: 'play', over: true, players: 3 });
  });
});

describe('the turn timer', () => {
  it('moves for a player who lets the clock run out', () => {
    const r = lobby();
    r.handle(ANA, { t: 'join', name: 'Salma', token: 1 }, T0);
    r.handle(HOST, { t: 'host', op: 'settings', settings: { timer: 30 } }, T0);
    r.handle(HOST, { t: 'host', op: 'start' }, T0);
    expect(G(r).tEnd).toBe(T0 + 33000);
    expect(r.nextWake()).toBe(T0 + 33000);
    expect(r.tick(T0 + 32999)).toBe(false);
    expect(r.tick(T0 + 33000)).toBe(true);
    expect(G(r).log.some(e => e[0] === 'timeUp')).toBe(true);
    expect(G(r).log.some(e => e[0] === 'rolls')).toBe(true);
  });
});
