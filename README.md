# Moropoly · مُوروبولي · ⵎⵓⵔⵓⴱⵓⵍⵉ

The Moroccan property game for 2 to 8 players. It runs entirely in the browser, as a phone app (PWA) or on a computer.

## How online play works
- The host opens the site and taps **Host an online game**. That browser runs the game.
- Players open the invite link (`…/#code`), pick a name and a token, and play from their own phones.
- Game messages go through two free public relay servers (EMQX and HiveMQ, MQTT over secure WebSocket), so it works on any network. No accounts and no database.
- Everything sent through the relays is encrypted with a key that comes from the game code. The host signs every board, each player signs their own moves, and the table code is encrypted so only the host can read it.
- Keep the host's screen on. If the host closes the tab, the game pauses and continues when they reopen it from **Resume game** on the home page.

## Files
| Path | What it is |
|---|---|
| `index.html` | The whole game: engine, board, animations, music |
| `manifest.webmanifest`, `icons/` | Lets phones install it as an app |
| `sw.js` | Offline cache. Bump `VERSION` after changing files so phones pick up the update |
| `assets/card-*.webp` | Property card paintings (card number = board square) |
| `assets/tok-*.webp` | The ten silver tokens |
| `assets/midnight-oud-plucks.mp3`, `andalusian-sunset.mp3`, `chaabi-wedding.mp3` | The three soundtracks (Oud Nights, Andalusian Sunset, Chaabi Wedding), looped. Default volume 30% |
| `assets/fonts/` | Unbounded, IBM Plex Sans, IBM Plex Sans Arabic and Noto Sans Tifinagh (SIL Open Font Licence), served from this site |
| `CNAME` | The custom domain (moropoly.win). Do not delete |

## Hosting
Any static host works because there is no server code.
- **GitHub Pages** (current, at https://moropoly.win): Settings → Pages → Deploy from branch → `main` / root.
- **Cloudflare Pages** (free, works with a private repo): Workers & Pages → Create → Pages → Connect to Git → pick this repo → no build command, output directory `/`.
- **Netlify Drop** (free, no Git): drag this folder onto app.netlify.com/drop.
