// Messages between a player's browser and the game server, over one WebSocket per player.
import type {Action, Settings} from '../engine/types';
import type {Table} from './table';

export type HostOp =
  | {op: 'settings'; settings: Partial<Settings>}
  | {op: 'pin'; pin: string}
  | {op: 'kick'; index: number}
  | {op: 'addBot'}
  | {op: 'start'}
  | {op: 'bot'; seat: number};

export type ClientMsg =
  /** first message: the device's secret proves who it is; `create` opens a new table with this device as host */
  | {t: 'hello'; secret: string; create?: {name: string; token: number}}
  /** sit down, or change name and token */
  | {t: 'join'; name: string; token: number; pin?: string; auto?: boolean}
  /** leave the table before the game starts */
  | {t: 'leave'}
  | {t: 'move'; seat: number; a: Action}
  | ({t: 'host'} & HostOp);

export type ServerMsg =
  | {t: 'welcome'; cid: string; code: string}
  | {t: 'state'; G: Table}
  /** the players who have the game open right now */
  | {t: 'presence'; online: string[]}
  /** a move or request that the game did not accept */
  | {t: 'rejected'; of: ClientMsg['t']}
  | {t: 'error'; code: 'noGame' | 'exists' | 'badHello'};

/** what the home page shows for a saved game */
export interface TableSummary { code: string; status: 'lobby' | 'play'; round: number; over: boolean; players: number; updated: number }

export const CODE_ABC = 'abcdefghjkmnpqrstuvwxyz23456789';
export const isCode = (s: string) => /^[a-z0-9]{4,12}$/.test(s);

/** a player's id is derived from their device's secret, which only the server ever sees */
export async function cidFromSecret(secret: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mp3|cid|' + secret)));
  return 'k' + [...h.slice(0, 9)].map(x => x.toString(16).padStart(2, '0')).join('');
}
