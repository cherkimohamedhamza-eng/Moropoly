// Cuts the small pictures the board's tiles show: public/assets/art-NN.webp (and a half-size art-NN-112.webp).
//   node scripts/cards/make-tile-art.mjs        (npm run tiles)
//
// A tile shows only the property's painting, in a small frame; the full card with its border and lettering is
// what you get when the tile is opened. The paintings are the same ones the cards are made from
// (scripts/cards/paintings/), cropped square around their middle so they suit both upright and sideways tiles.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const FROM = path.join(here, 'paintings'), TO = path.join(here, '..', '..', 'public', 'assets');
let made = 0;
for (const file of fs.readdirSync(FROM).filter(f => /^p-(\d+|mektoub|baraka)\.webp$/.test(f)).sort()) {
  const id = file.slice(2, -5);
  for (const w of [112, 224]) {
    await sharp(path.join(FROM, file))
      .resize(w, w, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
      .sharpen({ sigma: 0.5, m1: 0.5, m2: 1.4 })
      .webp({ quality: 84, effort: 6 })
      .toFile(path.join(TO, w === 224 ? `art-${id}.webp` : `art-${id}-${w}.webp`));
    made++;
  }
}
console.log(`made ${made} tile pictures`);
