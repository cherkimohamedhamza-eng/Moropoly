# Moropoly · مُوروبولي · ⵎⵓⵔⵓⴱⵓⵍⵉ

The Moroccan property game for 2 to 8 players. It runs in the browser, as a phone app (PWA) or on a computer, with a small game server for online play.

## Working on it
Needs Node 24 or newer.

```
npm install
npm run dev:server   # the game server at http://127.0.0.1:8787 (keep it running in its own terminal)
npm run dev          # the site at http://localhost:5173; it reaches the game server through /api
npm test             # rules, the online table, and a replay of games against the original version
npm run build        # type-check and build the site into dist/
node scripts/check-server.mjs [address]   # two pretend players against a running game server
```

Games on one device don't need the game server; only online play does. To try online play with two players on one computer, open the invite link in a second browser profile, or at `http://[::1]:5173/…` (a different address keeps a separate player identity).

## How the code is organised
| Path | What it is |
|---|---|
| `src/engine/` | The game rules, in TypeScript. Pure functions on one game-state object; the browser runs them for games on one device, the server for online games |
| `src/engine/engine.ts` | Moves, rent, auctions, debts, bankruptcy, trades, turns: `apply(G, seat, action)` is the one way in |
| `src/engine/bots.ts`, `data.ts`, `cards.ts`, `types.ts` | Computer players, the board, the Mektoub and Baraka cards, the game-state types |
| `src/online/` | Online play, shared by the browser and the server: `room.ts` is a table as the server runs it (requests, computer players, turn timer); `table.ts` has seats, late joins, the table code and the host's controls; `protocol.ts` lists the messages; `pace.ts` tells the server how long screens take to animate a move |
| `server/` | The game server on Cloudflare: `worker.ts` routes requests, `game-room.ts` is one table as a Durable Object (storage, WebSockets, alarms). `wrangler.jsonc` configures it |
| `src/app/` | App state shared by the screens (`state.js`), the authority for games this device runs (`authority.js`), hosting and joining (`online.js`) |
| `src/net/` | Connecting: the game server (`server.js`), or the in-browser host used when the game runs inside Claude (`claude.js`) |
| `src/react/` | Every screen is React: the home page (`HomeScreen.tsx`), the lobby (`LobbyScreen.tsx`), the local game setup (`SetupScreen.tsx`), the board (`Board.tsx`), the game bar, turn card, side tabs and banner (`GamePanel.tsx`), every window (`Windows.tsx`) and the music controls (`MusicDock.tsx`), plus shared pieces (`common.tsx`). `store.ts` bridges the app state to React: the older code calls `refresh()` after changing state, and React screens draw again |
| `src/ui/` | What runs around the screens: playing each new game state with its animations (`view.js`, `anim.js`: pawns hopping, dice, reveals, floating money, confetti), placing pawns on the board (`board.js`), the music and sound player (`music.js`), switching screens and language |
| `src/i18n/` | English, French and Arabic text |
| `src/sw.js` | Offline cache template. The build fills in the file list and a version, so phones pick up every update |
| `public/` | Files served as they are: card paintings and tokens, music, fonts, app icons, `manifest.webmanifest`, `CNAME` |
| `tests/` | `engine.test.ts` (the rules), `room.test.ts` (the online table, with a pretend clock), `parity.test.ts` (18 recorded games replayed against the original single-file version, see `tests/parity/`) |

The engine, online code and React screens are TypeScript; the code in `src/app`, `src/net` and `src/ui` is still plain JavaScript. Each React screen takes over one element of `index.html` (see `src/react/mount.tsx`). The animations move things React draws but leaves alone (pawn positions, the dice's rotation, the board's caption and reveal stage); anything an animation shows ahead of the game state (the square being passed, a house going up) goes through `app.boardFx`, which `Board.tsx` draws.

## How online play works
- The host taps **Host an online game**. The game server opens a table with an 8-character code; players join with the invite link (`…/#code`), pick a name and a token, and play from their own phones.
- The server holds the game: it checks every move, plays for the computer players (waiting while screens animate the previous move), runs the turn timer, and saves the table after every move. Nobody's browser has to stay open, and a player who closes the page or loses signal picks up where they were from the link or from **Resume game** on the home page.
- Each device keeps a random secret that it sends only to the server, over an encrypted connection; the server turns it into the player's id, so nobody can play someone else's seat. A table code (set by the host) is checked by the server and never sent to players.
- Finished tables are deleted after a day, abandoned ones after 30 days.

## Hosting
The site is static (`dist/`); online play needs the game server, which runs on Cloudflare Workers with Durable Objects (the free plan is enough for a hobby game).

**Everything on Cloudflare (simplest).** One Worker serves the site and the game server from the same address:
1. `npx wrangler login` once, then `npm run deploy`. The site and server come up at `https://moropoly.<your-subdomain>.workers.dev`.
2. To use moropoly.win, add it to Cloudflare and attach it to the Worker (Workers & Pages → moropoly → Settings → Domains & Routes). GitHub Pages is then no longer needed.
3. Check it: `node scripts/check-server.mjs https://moropoly.win`.

**Site on GitHub Pages, server on Cloudflare.** Deploy the server as above, then build the site with the server's address, `VITE_GAME_SERVER=https://… npm run build`, and publish `dist/` to Pages, for example from a GitHub Actions workflow (Pages → Build and deployment → Source: **GitHub Actions**). Pages can no longer serve the repository files directly, because the site has to be built first.
