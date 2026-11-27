/* ============================================================
   APP STATE
   ============================================================ */
import type {Anim} from '../engine/types';
import {rid} from '../engine/util';
import {lsGet, lsSet} from '../lib/storage';
import type {Table} from '../online/table';

export type Lang = 'en' | 'fr' | 'ar';
/** local: a game on this device · online: on the game server · host / guest: inside Claude */
export type Mode = 'local' | 'online' | 'host' | 'guest' | null;

/** a connection for online play (src/net/server.js, or src/net/claude.js inside Claude) */
export interface Transport {
  kind: 'server' | 'claude';
  onlineCids(): Set<string> | null;
  hostOnline(): boolean;
  // the rest of each transport is still plain JavaScript
  [more: string]: any;
}

/** what the lobby screen shows: the table, or the steps before it (connecting, asking for the table code) */
export type LobbyPanel =
  | {kind: 'table'}
  | {kind: 'connecting'; code: string; title: string; hint: [string, Record<string, unknown>?]}
  | {kind: 'pin'; code: string; checking: boolean; wrong: boolean; submit: (pin: string) => void};

export interface BoardFx { hl: number | null; houses: Record<number, number>; pop: number | null }
export const noBoardFx = (): BoardFx => ({hl: null, houses: {}, pop: null});

interface AppState {
  LANG: Lang;
  MODE: Mode;
  /** the game this device runs (local, or the host inside Claude) */
  G: Table | null;
  /** the game as it is on screen */
  V: Table | null;
  lastSeen: number;
  PEND: Table | null;
  Q: Anim[];
  /** animations are playing */
  playing: boolean;
  /** this device's player id */
  myCid: string | null;
  NET: {T: Transport | null; code: string | null; myQ: unknown[]; mySeq: number};
  LANG_DIRTY: boolean;
  JOIN: {sent: boolean; pin: string | null; denied: number; wrong: boolean; welcomed: string | null; base?: number};
  tab: string;
  modal: {kind: string; min?: boolean} | null;
  botTimer: ReturnType<typeof setTimeout> | null;
  dpos: Record<number, number>;
  shownOver: string | null;
  lobbyDraft: {name: string; token: number};
  lobbyPanel: LobbyPanel;
  /** the parts of the home page that change: the online-play note (text keys), whether hosting works, tables to resume, the install button */
  home: {note: string[]; canHost: boolean; games: {code: string; status: string; round: number}[]; canInstall: boolean};
  /** what an animation shows ahead of the game state: the square being passed, houses being built (with the newest one popping) */
  boardFx: BoardFx;
  /** claude capabilities, resolved once */
  CAPS: unknown;
}

/* shared app state: read and written by several modules */
export const app: AppState = {
  LANG: (() => {
    const s = lsGet('moropoly.lang');
    if (['en', 'fr', 'ar'].includes(s)) return s;
    const n = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return ['fr', 'ar'].includes(n) ? n : 'en';
  })(),
  MODE: null,
  G: null,
  V: null,
  lastSeen: 0,
  PEND: null,
  Q: [],
  playing: false,
  myCid: null,
  NET: {T: null, code: null, myQ: [], mySeq: 0},
  LANG_DIRTY: false,
  JOIN: {sent: false, pin: null, denied: 0, wrong: false, welcomed: null},
  tab: 'players',
  modal: null,
  botTimer: null,
  dpos: {},
  shownOver: null,
  lobbyDraft: {name: '', token: -1},
  lobbyPanel: {kind: 'table'},
  home: {note: [], canHost: true, games: [], canInstall: false},
  boardFx: noBoardFx(),
  CAPS: null,
};

const ARTIFACT_URL = 'https://claude.ai/artifact/XDcFd4N2BwtHHV2BwcZCFb';
export const myName = (): string => { const n = lsGet('moropoly.name'); return (typeof n === 'string' && n.trim()) ? n.trim().slice(0, 16) : ''; };
export const saveName = (n: string) => { if (n && n.trim()) lsSet('moropoly.name', n.trim().slice(0, 16)); };
export const inClaude = () => { const c = (window as {claude?: {use?: unknown}}).claude; return !!(c && typeof c.use === 'function'); };
export function ensureCid(): string {
  if (app.myCid) return app.myCid;
  let c: string | null = null; try { c = localStorage.getItem('moropoly.cid'); } catch (e) { /* storage blocked */ }
  if (!c) { c = 'c' + rid(12); try { localStorage.setItem('moropoly.cid', c); } catch (e) { /* storage blocked */ } }
  app.myCid = c; return c;
}
const SITE_URL = 'https://moropoly.win/';
// invite links point at the address the game is open on (players must reach the same game server),
// except on the old GitHub address, which sends people to moropoly.win
export function inviteLink(code: string) { if (inClaude()) return `${ARTIFACT_URL}#${code}`; const old = /\.github\.io$/.test(location.hostname); return `${old ? SITE_URL : location.origin + location.pathname}#${code}`; }
