# Moropoly · مُوروبولي · ⵎⵓⵔⵓⴱⵓⵍⵉ

The Moroccan property game for 2 to 8 players. It runs entirely in the browser, as a phone app (PWA) or on a computer.

## How online play works
- The host opens the site and taps **Host an online game**. That browser runs the game.
- Players open the invite link (`…/#code`), pick a name and a token, and play from their own phones.
- Browsers connect to each other directly (WebRTC, using the free PeerJS signalling server). No accounts and no database.
- Keep the host's screen on. If the host closes the tab, the game pauses and continues when they reopen it from **Resume game** on the home page.

## Files
| Path | What it is |
|---|---|
| `index.html` | The whole game: engine, board, animations, music |
| `manifest.webmanifest`, `icons/` | Lets phones install it as an app |
| `sw.js` | Offline cache. Bump `VERSION` after changing files so phones pick up the update |
| `assets/card-*.webp` | Property card paintings (card number = board square) |
| `assets/tok-*.webp` | The ten silver tokens |
| `assets/midnight-oud-plucks.mp3` | The soundtrack (Midnight Oud Plucks), looped. Default volume 30% |
| `assets/peerjs.min.js` | Connection library (PeerJS 1.5.4, MIT licence) |

## Hosting
Any static host works because there is no server code.
- **GitHub Pages**: Settings → Pages → Deploy from branch → `main` / root. Private repos need GitHub Pro for Pages.
- **Cloudflare Pages** (free, works with a private repo): Workers & Pages → Create → Pages → Connect to Git → pick this repo → no build command, output directory `/`.
- **Netlify Drop** (free, no Git): drag this folder onto app.netlify.com/drop.
