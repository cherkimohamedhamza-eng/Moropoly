# Moropoly · مُوروبولي · ⵎⵓⵔⵓⴱⵓⵍⵉ

The Moroccan property game for 2 to 8 players. It runs entirely in the browser, as a phone app (PWA) or on a computer.

## Working on it
Needs Node 24 or newer.

```
npm install
npm run dev        # the game at http://localhost:5173, reloads as you edit
npm test           # rule tests, plus a check that the engine still plays exactly like the original
npm run build      # type-check and build the site into dist/
npm run preview    # serve dist/ to try the built site (offline cache included)
```

Testing online play on this computer: invite links point at the local address, and `?relay=wss://…` swaps the public relays for your own.

## How the code is organised
| Path | What it is |
|---|---|
| `src/engine/` | The game rules, in TypeScript. Pure functions on one game-state object, with no screen or network code, so the same rules can run on a server later |
| `src/engine/engine.ts` | Moves, rent, auctions, debts, bankruptcy, trades, turns: `apply(G, seat, action)` is the one way in |
| `src/engine/bots.ts` | Computer players |
| `src/engine/data.ts`, `cards.ts`, `types.ts` | The board, the Mektoub and Baraka cards, and the types for the game state |
| `src/app/` | App state shared by the screens (`state.js`), the authority that applies moves and runs the turn timer (`authority.js`), hosting and joining (`online.js`) |
| `src/net/` | Online play: public MQTT relays (`relay.js`, `mqtt.js`), keys and encryption (`crypto.js`), playing inside Claude (`claude.js`) |
| `src/ui/` | Screens: board, animations, windows, lobby, home, music |
| `src/i18n/` | English, French and Arabic text |
| `src/sw.js` | Offline cache template. The build fills in the file list and a version, so phones pick up every update without a manual version bump |
| `public/` | Files served as they are: card paintings and tokens (`assets/`), music, fonts, app icons, `manifest.webmanifest` and `CNAME` |
| `tests/` | `engine.test.ts` covers the rules one by one. `parity.test.ts` replays 18 recorded games against the original single-file version (see `tests/parity/`) |

The engine is TypeScript; the screens and networking are still plain JavaScript modules and get their types when they move to React.

## How online play works
- The host opens the site and taps **Host an online game**. That browser runs the game.
- Players open the invite link (`…/#code`), pick a name and a token, and play from their own phones.
- Game messages go through two free public relay servers (EMQX and HiveMQ, MQTT over secure WebSocket), so it works on any network. No accounts and no database.
- Everything sent through the relays is encrypted with a key that comes from the game code. The host signs every board, each player signs their own moves, and the table code is encrypted so only the host can read it.
- Keep the host's screen on. If the host closes the tab, the game pauses and continues when they reopen it from **Resume game** on the home page.

## Hosting
The site is built into `dist/`, which any static host can serve because there is no server code.
- **GitHub Pages** (current, at https://moropoly.win): the site has to be built first now, so Pages must publish `dist/` (for example from a GitHub Actions workflow running `npm run build`; Pages → Build and deployment → Source: **GitHub Actions**). The custom domain stays `moropoly.win`.
- **Cloudflare Pages**: Connect to Git → build command `npm run build`, output directory `dist`.
- **Netlify Drop** (no Git): run `npm run build` and drag the `dist` folder onto app.netlify.com/drop.
