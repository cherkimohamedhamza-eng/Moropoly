// Turns the large pictures Blender renders (scripts/.renders/*.png) into the small, sharp ones the game shows
// (public/assets/*.webp). Run by `npm run pieces` and `npm run buildings` after Blender; to run it alone:
//   node scripts/finish-renders.mjs
//
// A browser that has to shrink a picture several times blurs it, so each picture is made here at the sizes it
// is really shown at (and for sharp screens), shrunk with a good filter and sharpened a little:
//   piece-N   the pawns on the board: 80, 112, 160, 224 and 320 wide; the game picks one (src/engine/data.ts)
//   tok-N     the round token coins: 96, 192 and 288 wide
//   dar, riad the buildings on the tiles: 32/64 and 48/96 wide (src/styles.css)
//   wood      the table top behind the board: 1600 wide
// The largest of each keeps the plain name (piece-0.webp); the others carry their width (piece-0-112.webp).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const RENDERS = path.join(here, '.renders'), ASSETS = path.join(here, '..', 'public', 'assets');
const SIZES = [
  [/^piece-\d+$/, [80, 112, 160, 224, 320]],
  [/^tok-\d+$/, [96, 192, 288]],
  [/^dar$/, [32, 64]],
  [/^riad$/, [48, 96]],
  [/^wood$/, [1600]],
];

if (!fs.existsSync(RENDERS)) { console.error('nothing to finish: run the Blender step first (' + RENDERS + ' is missing)'); process.exit(1); }
let made = 0;
for (const file of fs.readdirSync(RENDERS).filter(f => f.endsWith('.png')).sort()) {
  const name = file.slice(0, -4);
  const widths = SIZES.find(([re]) => re.test(name))?.[1];
  if (!widths) continue;
  const master = sharp(path.join(RENDERS, file));
  const { width, height } = await master.metadata();
  for (const w of widths) {
    const out = path.join(ASSETS, (w === widths.at(-1) ? name : `${name}-${w}`) + '.webp');
    await master.clone()
      .resize(w, Math.round(w * height / width), { kernel: 'lanczos3' })
      .sharpen({ sigma: 0.55, m1: 0.6, m2: 1.6 })          // a light touch: firmer edges without halos
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
      .toFile(out);
    made++;
  }
}
console.log(`finished ${made} pictures into ${path.relative(process.cwd(), ASSETS)}`);
