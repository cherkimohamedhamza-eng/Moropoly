// One table on the game server: a Durable Object that keeps the table in its storage, holds the players'
// WebSockets (hibernating between messages, so an idle table costs nothing) and wakes itself with an alarm
// for the computer's moves, the turn timer and deleting old tables. The game logic is in src/online/room.ts.
import { DurableObject } from 'cloudflare:workers';
import { cidFromSecret, type ClientMsg, type ServerMsg } from '../src/online/protocol';
import { Room, type RoomData } from '../src/online/room';
import type { Env } from './worker';

interface Attachment { code: string; cid: string | null }
type ErrorCode = Extract<ServerMsg, { t: 'error' }>['code'];

const MAX_MESSAGE = 16_000;

export class GameRoom extends DurableObject<Env> {
  private room = new Room(null);

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.room = new Room((await ctx.storage.get<RoomData>('room')) ?? null);
    });
    // keep-alive pings are answered without waking the object up
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const code = url.pathname.split('/')[3];
    if (url.pathname.endsWith('/ws')) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      const { 0: client, 1: server } = new WebSocketPair();
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ code, cid: null } satisfies Attachment);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (req.method === 'GET') {
      const s = this.room.summary();
      return Response.json(s ?? { error: 'noGame' }, { status: s ? 200 : 404, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    return new Response('Method not allowed', { status: 405 });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    if (typeof data !== 'string' || data.length > MAX_MESSAGE) return;
    let m: ClientMsg;
    try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m !== 'object') return;
    const att = ws.deserializeAttachment() as Attachment;
    const now = Date.now();

    if (m.t === 'hello') {
      if (att.cid) return;
      if (typeof m.secret !== 'string' || m.secret.length < 16 || m.secret.length > 200) return this.refuse(ws, 'badHello');
      const cid = await cidFromSecret(m.secret);
      if (m.create) {
        if (!this.room.create(att.code, cid, m.create, now)) return this.refuse(ws, 'exists');
        await this.save();
      } else if (!this.room.exists) return this.refuse(ws, 'noGame');
      ws.serializeAttachment({ code: att.code, cid } satisfies Attachment);
      this.send(ws, { t: 'welcome', cid, code: att.code });
      this.send(ws, { t: 'state', G: this.room.view(now) });
      this.sendPresence();
      await this.arm();
      return;
    }

    if (!att.cid || !this.room.exists) return;
    const r = this.room.handle(att.cid, m, now);
    if (r === 'changed') {
      await this.save();
      this.sendState(now);
      await this.arm();
    } else if (r === 'rejected') this.send(ws, { t: 'rejected', of: m.t } as ServerMsg);
  }

  async webSocketClose(ws: WebSocket, code: number) {
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* already closed */ }
    this.sendPresence(ws);
  }

  async webSocketError(ws: WebSocket) {
    this.sendPresence(ws);
  }

  async alarm() {
    const now = Date.now();
    const exp = this.room.expiresAt();
    if (exp != null && now >= exp) {
      for (const ws of this.ctx.getWebSockets()) { try { ws.close(4004, 'noGame'); } catch { /* gone */ } }
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      this.room = new Room(null);
      return;
    }
    if (this.room.tick(now)) {
      await this.save();
      this.sendState(now);
    }
    await this.arm();
  }

  /* ---------- helpers ---------- */
  private async save() {
    if (this.room.d) await this.ctx.storage.put('room', this.room.d);
  }
  private async arm() {
    const at = this.room.nextWake();
    if (at == null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(at, Date.now() + 10));
  }
  private players(except?: WebSocket) {
    return this.ctx.getWebSockets().filter(ws => ws !== except && (ws.deserializeAttachment() as Attachment).cid);
  }
  private send(ws: WebSocket, m: ServerMsg) {
    try { ws.send(JSON.stringify(m)); } catch { /* closing */ }
  }
  private sendState(now: number) {
    const msg = JSON.stringify({ t: 'state', G: this.room.view(now) } satisfies ServerMsg);
    for (const ws of this.players()) { try { ws.send(msg); } catch { /* closing */ } }
  }
  private sendPresence(except?: WebSocket) {
    const sockets = this.players(except);
    const online = [...new Set(sockets.map(ws => (ws.deserializeAttachment() as Attachment).cid!))];
    const msg = JSON.stringify({ t: 'presence', online } satisfies ServerMsg);
    for (const ws of sockets) { try { ws.send(msg); } catch { /* closing */ } }
  }
  private refuse(ws: WebSocket, code: ErrorCode) {
    this.send(ws, { t: 'error', code });
    try { ws.close(4000, code); } catch { /* gone */ }
  }
}
