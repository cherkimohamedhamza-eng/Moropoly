// Renders the property cards (and the card back) from scripts/cards/cards.html into public/assets/.
//   npm run cards                         all 24: card-NN.webp (720x1080) and card-back.webp
//   node scripts/cards/make-cards.mjs 32 back    only some of them
// Serves this folder on 127.0.0.1, captures each card with headless Chrome at 2x (360x540 CSS px ->
// 720x1080), checks the capture, and converts it to WebP with sharp. Set CHROME to use another browser.
// The web fonts (Jost, Amiri) come from Google Fonts, so this needs an internet connection.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(HERE, '..', '..', 'public', 'assets');
const CARDS = ['01', '03', '06', '08', '09', '11', '13', '14', '16', '18', '19', '21', '23', '24',
  '26', '27', '29', '30', '31', '32', '34', '37', '39', 'back'];
const W = 360, H = 540, SCALE = 2;
const QUALITY = 72;
const PARALLEL = 4;
const TRIES = 3;

const BROWSERS = [process.env.CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean);
const browser = BROWSERS.find(p => fs.existsSync(p));
if (!browser) { console.error('No browser found. Set CHROME to the path of chrome.exe or msedge.exe.'); process.exit(1); }

const wanted = process.argv.slice(2);
const bad = wanted.filter(c => !CARDS.includes(c));
if (bad.length) { console.error(`Unknown card(s): ${bad.join(' ')}. Known: ${CARDS.join(' ')}`); process.exit(1); }
const todo = wanted.length ? wanted : CARDS;

// --- a tiny static server for this folder ---
const TYPES = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  const file = path.resolve(HERE, rel);
  if (!file.startsWith(HERE + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'moropoly-cards-'));

function capture(card, png, profile) {
  const args = ['--headless=new', `--screenshot=${png}`, `--window-size=${W},${H}`,
    `--force-device-scale-factor=${SCALE}`, '--hide-scrollbars', '--virtual-time-budget=8000',
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `${base}/cards.html?card=${card}`];
  return new Promise((resolve, reject) =>
    execFile(browser, args, { timeout: 60000, windowsHide: true }, err => err ? reject(err) : resolve()));
}

// The page shows magenta while it is still loading fonts/painting and red if it could not; the card
// itself is cream (#f5ead0) at its top-left corner.
async function checkPng(png) {
  const meta = await sharp(png).metadata();
  if (meta.width !== W * SCALE || meta.height !== H * SCALE)
    throw new Error(`capture is ${meta.width}x${meta.height}, expected ${W * SCALE}x${H * SCALE}`);
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]]; };
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 3);
  for (const [x, y] of [[4, 4], [info.width - 5, 4], [4, info.height - 5], [info.width - 5, info.height - 5]]) {
    const c = px(x, y);
    if (near(c, [255, 0, 255])) throw new Error('captured before the fonts and painting were ready');
    if (near(c, [255, 0, 0])) throw new Error('the page could not load its fonts or painting');
    if (!near(c, [0xf5, 0xea, 0xd0])) throw new Error(`unexpected corner colour rgb(${c}) at ${x},${y}`);
  }
}

async function make(card, n) {
  const png = path.join(tmp, `card-${card}.png`);
  const out = path.join(OUT_DIR, `card-${card}.webp`);
  for (let attempt = 1; ; attempt++) {
    try {
      fs.rmSync(png, { force: true });
      await capture(card, png, path.join(tmp, `profile-${n}`));
      if (!fs.existsSync(png)) throw new Error('the browser wrote no screenshot');
      await checkPng(png);
      break;
    } catch (e) {
      if (attempt >= TRIES) throw new Error(`card ${card}: ${e.message}`);
      console.warn(`card ${card}: ${e.message}, retrying`);
    }
  }
  const info = await sharp(png).webp({ quality: QUALITY, effort: 6, smartSubsample: true }).toFile(out);
  if (info.width !== W * SCALE || info.height !== H * SCALE) throw new Error(`card ${card}: webp is ${info.width}x${info.height}`);
  console.log(`card-${card}.webp  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}

let failed = 0;
try {
  console.log(`Rendering ${todo.length} card(s) with ${browser}`);
  const queue = [...todo];
  await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, async (_, n) => {
    for (let card; (card = queue.shift()); ) {
      try { await make(card, n); } catch (e) { failed++; console.error(`FAILED ${e.message}`); }
    }
  }));
} finally {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
}
if (failed) { console.error(`${failed} card(s) failed`); process.exit(1); }
console.log(`Done: ${todo.length} card(s) in ${path.relative(process.cwd(), OUT_DIR) || OUT_DIR}`);
