// What happens around the game itself: taking seats, joining late, the table code, the turn timer and the
// host's controls. Pure functions on the table, shared by the game server and the in-browser host that is
// still used when the game runs inside Claude.
import {BOT_NAMES, COLORS, START_CASH, TOKENS} from '../engine/data';
import {A, actorOf, apply, freshGame, log} from '../engine/engine';
import {range, rid} from '../engine/util';
import type {Action, Anim, Game, LogEntry, Settings} from '../engine/types';

/** a seat before the game starts */
export interface LobbySeat { cid: string | null; name: string; token: number; human: boolean }
/** an online table before the game starts */
export interface Lobby {
  gid: string;
  status: 'lobby';
  mode: string;
  code: string;
  hostCid: string | null;
  players: LobbySeat[];
  settings: Settings;
  seq: number;
  anims: Anim[];
  ack: Record<string, number>;
  log: LogEntry[];
  event: LogEntry | '';
  updated?: number;
  pinOn?: boolean;
  denied?: Record<string, number>;
  [extra: string]: unknown;
}
export type Table = Lobby | Game;

/** what a player sends to sit down, or to change their name or token */
export interface JoinRequest { name?: unknown; token?: unknown; pin?: unknown; auto?: boolean }

export const DEFAULT_SETTINGS: Settings = {daret: true, dlala: true, rounds: 25, fast: false, timer: 0};

export function newLobby(code: string, hostCid: string | null, now: number, extra?: Record<string, unknown>): Lobby {
  const G: Lobby = {...extra, gid: rid(10), status: 'lobby', mode: 'online', code, hostCid, players: [], settings: {...DEFAULT_SETTINGS}, seq: 0, anims: [], ack: {}, log: [], event: '', updated: now};
  log(G, 'tableSet');
  return G;
}

/** house rules from the lobby screen; anything unexpected is dropped */
export function cleanSettings(s: Partial<Record<keyof Settings, unknown>>): Partial<Settings> {
  const out: Partial<Settings> = {};
  for (const k of ['daret', 'dlala', 'fast'] as const) if (typeof s[k] === 'boolean') out[k] = s[k];
  if ([0, 15, 25, 40].includes(s.rounds as number)) out.rounds = s.rounds as number;
  if ([0, 30, 60, 90, 120].includes(s.timer as number)) out.timer = s.timer as number;
  return out;
}

const cleanName = (n: unknown, fallback: string) => String(n || '').trim().slice(0, 16) || fallback;
const freeToken = (G: Lobby, want: number, except: string | null) => {
  const used = new Set(G.players.filter(p => p.cid !== except).map(p => p.token));
  if (want >= 0 && want < TOKENS.length && !used.has(want)) return want;
  const k = range(TOKENS.length).find(k => !used.has(k));
  return k == null ? -1 : k;
};

/** sitting down (or changing name and token) before the game starts */
export function lobbyJoin(G: Lobby, cid: string, a: JoinRequest, fallbackName: string): boolean {
  const name = cleanName(a.name, fallbackName);
  let tok = +(a.token as number);
  const mine = G.players.find(p => p.cid === cid);
  if (!(tok >= 0 && tok < TOKENS.length) || G.players.some(p => p.token === tok && p !== mine)) {
    if (!a.auto && mine) return false;
    tok = freeToken(G, tok, cid);
  }
  if (tok < 0) return false;
  if (mine) { mine.name = name; mine.token = tok; return true; }
  if (G.players.length >= 8) return false;
  G.players.push({cid, name, token: tok, human: true});
  log(G, 'joins', {p: name});
  return true;
}

/* someone opens the invite link after the game has started: they get a seat at the end of the turn order */
export function playJoin(G: Game, cid: string, a: JoinRequest, fallbackName: string): boolean {
  const name = cleanName(a.name, fallbackName);
  const mine = G.players.find(p => p.cid === cid);
  if (mine) { // changing name or token during the game
    let tok = +(a.token as number);
    if (!(tok >= 0 && tok < TOKENS.length) || G.players.some(p => p !== mine && !p.bankrupt && p.token === tok)) tok = mine.token;
    if (mine.name === name && mine.token === tok) return false;
    mine.name = name; mine.token = tok; return true;
  }
  if (G.over || G.players.length >= 8) return false;
  const used = new Set(G.players.filter(p => !p.bankrupt).map(p => p.token));
  let tok: number | undefined = +(a.token as number);
  if (!(tok >= 0 && tok < TOKENS.length) || used.has(tok)) tok = range(TOKENS.length).find(k => !used.has(k));
  if (tok == null) return false;
  const id = G.players.length;
  G.players.push({id, cid, name, token: tok, human: true, color: COLORS[id % COLORS.length], cash: START_CASH, pos: 0, inJail: false, jailTurns: 0, goojf: [], bankrupt: false, owes: -1, mt: '', lateRound: G.round});
  log(G, 'joinsMid', {p: name});
  A(G, {k: 'fx', f: 'joined', pid: id});
  return true;
}

export const isSeated = (G: Table, cid: string) => G.players.some(p => p.cid === cid);
/** a seat only takes moves from the device sitting in it, and never while the computer plays it */
export const authorized = (G: Game, seat: number, cid: string) => { const p = G.players[seat]; return !!p && p.human && p.cid === cid; };

/**
 * A request from a player at the table: sit down, leave the lobby, or make a move.
 * `pinOk` checks a table code. Returns true when the table changed.
 */
export function handleRequest(G: Table, cid: string, req: {a?: unknown; seat?: unknown}, pinOk: (pin: unknown) => boolean, fallbackName: string): boolean {
  const a = (req.a || {}) as {t?: string} & JoinRequest;
  if (a.t === 'join') {
    if (G.pinOn && !isSeated(G, cid) && !pinOk(a.pin)) { G.denied = G.denied || {}; G.denied[cid] = (G.denied[cid] || 0) + 1; return true; }
    if (G.status === 'lobby') return lobbyJoin(G, cid, a, fallbackName);
    if (G.status === 'play') return playJoin(G, cid, a, fallbackName);
    return false;
  }
  if (G.status === 'lobby') {
    if (a.t === 'leave') { const n = G.players.length; G.players = G.players.filter(p => p.cid !== cid); return n !== G.players.length; }
    return false;
  }
  if (G.status === 'play') {
    const seat = +(req.seat as number);
    if (!authorized(G, seat, cid)) return false;
    return apply(G, seat, a as Action);
  }
  return false;
}

/* ---------- host controls ---------- */
export function startGame(G: Lobby): Game | null {
  if (G.status !== 'lobby' || G.players.length < 2) return null;
  const seats = G.players.map(p => ({cid: p.cid, name: p.name, token: p.token, human: p.human}));
  const g = freshGame(seats, G.settings, {mode: 'online', code: G.code, hostCid: G.hostCid, ack: G.ack});
  g.pinOn = !!G.pinOn; g.denied = G.denied || {};
  for (const k of ['nonce', 'hostKey', 'hostDh']) if (G[k]) (g as unknown as Record<string, unknown>)[k] = G[k];
  return g;
}
export function addBot(G: Lobby): boolean {
  if (G.players.length >= 8) return false;
  const used = new Set(G.players.map(p => p.token));
  const tok = range(TOKENS.length).find(k => !used.has(k));
  if (tok == null) return false;
  const name = BOT_NAMES.find(n => !G.players.some(p => p.name === n)) || 'Computer';
  G.players.push({cid: null, name, token: tok, human: false});
  return true;
}
export function removeSeat(G: Lobby, index: number): boolean {
  if (!(index >= 0 && index < G.players.length)) return false;
  G.players.splice(index, 1);
  return true;
}
/** the host lets the computer play for someone who dropped out, or hands their seat back */
export function toggleBot(G: Game, seat: number): boolean {
  const p = G.players[seat];
  if (!p || p.bankrupt || G.over) return false;
  p.human = !p.human;
  log(G, p.human ? 'back' : 'botPlays', {p: p.name});
  return true;
}

/* ---------- turn timer ---------- */
const TIMER_GRACE = 3000; // time for the dice and pawn animations before the clock really starts
export function timerStamp(G: Table, now: number) {
  const g = G as Game;
  const sec = +((G.settings || {}).timer || 0);
  if (G.status !== 'play' || g.over || !sec) { g.tEnd = null; g.tk = null; return; }
  const a = actorOf(g), q = g.players[a], hum = !!(q && q.human && !q.bankrupt);
  const k = hum ? [g.turn, g.phase, a, g.auction ? g.auction.turn + ':' + g.auction.high + ':' + g.auction.bidders.length : '', g.trade ? 1 : 0, (g.players[g.cur] || {cash: 0}).cash < 0 ? 1 : 0].join('|') : '';
  if (k !== g.tk) { g.tk = k; g.tEnd = hum ? now + sec * 1000 + TIMER_GRACE : null; }
  g.tNow = now;
}
function timeoutAction(G: Game, a: number): Action | null {
  if (G.trade && G.trade.to === a) return {t: 'tradeReply', accept: false};
  if (G.auction) return {t: 'pass'};
  const p = G.players[a]; if (a !== G.cur) return null;
  if (p.cash < 0) return {t: 'bankrupt'};
  if (G.phase === 'roll') return {t: 'roll'};
  if (G.phase === 'buy') return {t: 'decline'};
  if (G.phase === 'end') return {t: 'end'};
  return null;
}
/** the clock ran out: the game moves for whoever's turn it is. Returns false when it was not time yet. */
export function timeUp(G: Table, now: number): boolean {
  if (G.status !== 'play') return false;
  const g = G as Game;
  if (g.over || !g.tEnd || now < g.tEnd) return false;
  const a = actorOf(g), q = g.players[a]; g.tEnd = null; g.tk = null;
  if (!q || !q.human) return true;
  const act = timeoutAction(g, a); log(g, 'timeUp', {p: q.name});
  if (!(act && apply(g, a, act)) && g.cur === a && g.phase === 'end' && q.cash >= 0) apply(g, a, {t: 'end'});
  return true;
}
