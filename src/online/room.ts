// One online table, as the game server runs it: it holds the game, takes requests from the players,
// moves for the computer players and the turn timer, and decides when to wake up next.
// No network or storage code here, so it can be tested directly and hosted anywhere.
import {botDecide} from '../engine/bots';
import {apply} from '../engine/engine';
import type {Game} from '../engine/types';
import {animMs, botDelay} from './pace';
import type {ClientMsg, TableSummary} from './protocol';
import {addBot, cleanSettings, handleRequest, lobbyJoin, newLobby, removeSeat, startGame, timeUp, timerStamp, toggleBot, type Lobby, type Table} from './table';

/** everything the server keeps for a table */
export interface RoomData {
  v: 1;
  G: Table;
  /** the table code; only the server knows it */
  pin: string;
  /** when players' screens will have finished showing the latest changes */
  busyUntil: number;
  /** when the computer makes its next move */
  botAt: number | null;
  /** the last animation already counted in busyUntil */
  seenSeq: number;
}

/** finished games are kept for a day so people can look at the final board; others for 30 days */
export const KEEP_OVER = 24 * 3600e3, KEEP_IDLE = 30 * 24 * 3600e3;
const FALLBACK_NAME = 'Player';

export type Result = 'changed' | 'rejected' | 'none';

export class Room {
  constructor(public d: RoomData | null) {}

  get exists() { return !!this.d; }

  /** opens a new table with `cid` as host, sitting in the first seat */
  create(code: string, cid: string, seat: {name: unknown; token: unknown}, now: number): boolean {
    if (this.d) return false;
    const G = newLobby(code, cid, now);
    lobbyJoin(G, cid, {name: seat.name, token: seat.token, auto: true}, FALLBACK_NAME);
    this.d = {v: 1, G, pin: '', busyUntil: 0, botAt: null, seenSeq: 0};
    this.commit(now);
    return true;
  }

  isHost(cid: string) { return !!this.d && this.d.G.hostCid === cid; }

  /** a request from the player `cid` */
  handle(cid: string, m: ClientMsg, now: number): Result {
    const d = this.d; if (!d) return 'none';
    let ok = false;
    switch (m.t) {
      case 'join': ok = handleRequest(d.G, cid, {a: {t: 'join', name: m.name, token: m.token, pin: m.pin, auto: !!m.auto}}, p => !!d.pin && String(p || '') === d.pin, FALLBACK_NAME); break;
      case 'leave': ok = d.G.status === 'lobby' && handleRequest(d.G, cid, {a: {t: 'leave'}}, () => false, FALLBACK_NAME); break;
      case 'move': ok = !!m.a && typeof m.a === 'object' && handleRequest(d.G, cid, {seat: m.seat, a: m.a}, () => false, FALLBACK_NAME); break;
      case 'host': if (this.isHost(cid)) ok = this.hostOp(m, now); break;
      default: return 'none';
    }
    if (!ok) return 'rejected';
    this.commit(now);
    return 'changed';
  }

  private hostOp(m: Extract<ClientMsg, {t: 'host'}>, now: number): boolean {
    const d = this.d!; const G = d.G;
    if (G.status === 'lobby') {
      const L = G as Lobby;
      switch (m.op) {
        case 'settings': Object.assign(L.settings, cleanSettings((m.settings || {}) as Record<string, unknown>)); return true;
        case 'pin': {
          const pin = String(m.pin || '').replace(/\D/g, '');
          if (pin && (pin.length < 4 || pin.length > 6)) return false;
          d.pin = pin; L.pinOn = !!pin; return true;
        }
        case 'kick': return removeSeat(L, +m.index);
        case 'addBot': return addBot(L);
        case 'start': {
          const g = startGame(L); if (!g) return false;
          d.G = g; d.busyUntil = now; d.seenSeq = g.seq;
          return true;
        }
      }
      return false;
    }
    if (m.op === 'bot') return toggleBot(G as Game, +m.seat);
    return false;
  }

  /** the computer's move or the turn timer, when one is due. Returns true when the table changed. */
  tick(now: number): boolean {
    const d = this.d; if (!d || d.G.status !== 'play') return false;
    const G = d.G as Game;
    let changed = false;
    if (timeUp(G, now)) changed = true;
    else if (d.botAt != null && now >= d.botAt) {
      d.botAt = null;
      const b = botDecide(G);
      if (b) changed = apply(G, b.seat, b.a);
    }
    if (changed) this.commit(now);
    else if (d.botAt == null) this.schedule(now); // a wake-up with nothing to do keeps the computer's slot
    return changed;
  }

  /** after every change: timestamps, the turn timer, how long screens need, and the computer's next move */
  private commit(now: number) {
    const d = this.d!; const G = d.G;
    G.updated = now;
    timerStamp(G, now);
    if (G.status === 'play') {
      const fast = !!G.settings.fast;
      const fresh = (G.anims || []).filter(a => (a.n || 0) > d.seenSeq);
      const ms = fresh.reduce((s, a) => s + animMs(a, fast), 0);
      d.busyUntil = Math.max(d.busyUntil, now) + ms;
      d.seenSeq = G.seq || 0;
    }
    this.schedule(now);
  }

  private schedule(now: number) {
    const d = this.d!; const G = d.G;
    d.botAt = null;
    if (G.status !== 'play' || (G as Game).over) return;
    const b = botDecide(G as Game);
    if (b) d.botAt = Math.max(d.busyUntil, now) + botDelay(b.a.t === 'manage', !!G.settings.fast);
  }

  /** when to wake up for the computer, the turn timer, or to delete a finished or abandoned table */
  nextWake(): number | null {
    const d = this.d; if (!d) return null;
    const G = d.G as Game;
    const times = [d.botAt, G.status === 'play' && !G.over ? G.tEnd : null, this.expiresAt()].filter((x): x is number => typeof x === 'number');
    return times.length ? Math.min(...times) : null;
  }
  expiresAt(): number | null {
    const d = this.d; if (!d) return null;
    const G = d.G as Game;
    return (G.updated || 0) + (G.status === 'play' && G.over ? KEEP_OVER : KEEP_IDLE);
  }

  /** the table as players see it */
  view(now: number): Table {
    const G = this.d!.G;
    if (G.status === 'play') (G as Game).tNow = now;
    return G;
  }
  summary(): TableSummary | null {
    const d = this.d; if (!d) return null;
    const G = d.G as Game;
    return {code: String(G.code), status: G.status, round: G.status === 'play' ? G.round : 0, over: !!(G.status === 'play' && G.over), players: G.players.length, updated: G.updated || 0};
  }
}
