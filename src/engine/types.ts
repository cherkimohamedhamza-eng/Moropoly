// Types for the game state. The engine is pure: it only reads and changes a Game object, so the
// same code can run in the browser (local games) and, later, on the game server.

export type GroupId = 'brown' | 'lblue' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'dblue';
export interface Group { city: string; ar: string; color: string; house: number }

interface BaseSpace { name: string; ar: string; art?: string }
export interface PropSpace extends BaseSpace { t: 'prop'; g: GroupId; price: number; rent: number[]; note: string }
export interface RailSpace extends BaseSpace { t: 'rail'; price: number }
export interface UtilSpace extends BaseSpace { t: 'util'; price: number; kind: string; glyph: string }
export interface TaxSpace extends BaseSpace { t: 'tax'; amount: number; why: string }
export interface PlainSpace extends BaseSpace { t: 'go' | 'jail' | 'parking' | 'gojail' | 'mektoub' | 'baraka' }
export type Space = PropSpace | RailSpace | UtilSpace | TaxSpace | PlainSpace;
export type OwnableSpace = PropSpace | RailSpace | UtilSpace;

export interface Token { name: string; img: string; g: string }

export type Deck = 'mektoub' | 'baraka';
export interface CardRef { deck: Deck; id: number }
export interface Card { text: string; act?: (G: Game, p: Player) => void; goojf?: true }

/** who gets paid: a seat number, -1 for the bank, or the Daret pot */
export type Payee = number | 'daret';
export interface Debt { to: Payee; amt: number }

export interface Player {
  id: number;
  cid: string | null;
  name: string;
  token: number;
  human: boolean;
  color: string;
  cash: number;
  pos: number;
  inJail: boolean;
  jailTurns: number;
  /** "get out of 3okacha free" cards held */
  goojf: CardRef[];
  bankrupt: boolean;
  owes: Payee;
  /** computer players: the turn and phase they last managed their properties in */
  mt: string;
  debts?: Debt[];
  /** set when someone joins a game that has already started */
  lateRound?: number;
}

export interface PropState { owner: number; houses: number; mort: boolean }

export interface Settings {
  /** taxes and fines go into a pot that whoever lands on Qahwa collects */
  daret: boolean;
  /** unbought properties go to auction */
  dlala: boolean;
  /** the game ends after this many rounds (0: no limit) */
  rounds: number;
  fast: boolean;
  /** seconds per move for human players (0: off) */
  timer: number;
}

export interface Auction { idx: number; bidders: number[]; turn: number; high: number; highBidder: number }
export interface Trade { from: number; to: number; give: number[]; get: number[]; cashGive: number; cashGet: number }

/** a log line as [key, params]; the view turns it into text in the viewer's language */
export type LogEntry = [string, Record<string, unknown>];
/** an animation cue for the view (dice, moves, money effects) */
export interface Anim { k: string; n?: number; [field: string]: unknown }

export type Phase = 'roll' | 'buy' | 'end' | 'auction' | 'over';

export interface Game {
  gid: string;
  status: 'play';
  mode: string;
  code: string | null;
  hostCid: string | null;
  players: Player[];
  props: Record<number, PropState>;
  cur: number;
  phase: Phase;
  dice: [number, number];
  doubles: number;
  rollAgain: boolean;
  /** money in the Daret pot */
  daret: number;
  round: number;
  turn: number;
  log: LogEntry[];
  settings: Settings;
  decks: Record<Deck, number[]>;
  pending: { type: 'buy'; idx: number } | null;
  auction: Auction | null;
  trade: Trade | null;
  card: CardRef | null;
  event: LogEntry | '';
  winner: number | null;
  over: boolean;
  landed: number;
  seq: number;
  anims: Anim[];
  /** online games: the last move number handled for each player */
  ack: Record<string, number>;

  // set outside the engine, by whoever runs the game (this device, the in-browser host or the server)
  updated?: number;
  /** turn timer: when the current move times out, and the server's clock when the state was sent */
  tEnd?: number | null;
  tk?: string | null;
  tNow?: number;
  /** the table needs a code to join, and how many wrong codes each device has tried */
  pinOn?: boolean;
  denied?: Record<string, number>;
}

export interface Seat { name: string; token: number; human?: boolean; cid?: string | null }

type IndexAction = { t: 'build' | 'riad' | 'sell' | 'mort' | 'unmort'; i: number | string };
/** a move. Online moves arrive from other devices, so the engine checks and converts every field. */
export type Action =
  | { t: 'roll' | 'buy' | 'decline' | 'pass' | 'end' | 'fine' | 'card' | 'manage' | 'bankrupt' | 'tradeCancel' }
  | { t: 'bid'; inc?: number }
  | IndexAction
  | {
      t: 'trade';
      to: number | string;
      give?: (number | string)[];
      get?: (number | string)[];
      cashGive?: number | string;
      cashGet?: number | string;
    }
  | { t: 'tradeReply'; accept?: boolean };
