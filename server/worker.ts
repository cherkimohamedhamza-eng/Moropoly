// The Moropoly game server, as a Cloudflare Worker.
//   GET /api/games/<code>/ws   a player's WebSocket to that table (see src/online/protocol.ts)
//   GET /api/games/<code>      a short summary of the table, for the home page's "resume" list
// Every table lives in its own Durable Object, named after its code. Anything else is the website itself,
// served from dist/ when the site and the server are deployed together.
import { isCode } from '../src/online/protocol';
import { GameRoom } from './game-room';

export { GameRoom };

export interface Env {
  ROOMS: DurableObjectNamespace<GameRoom>;
  ASSETS?: Fetcher;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/api\/games\/([^/]+)(\/ws)?$/);
    if (m) {
      if (!isCode(m[1])) return new Response('Not found', { status: 404 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
    }
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS ? env.ASSETS.fetch(req) : new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
