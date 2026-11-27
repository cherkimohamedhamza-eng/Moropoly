// Records how the ORIGINAL single-file game (commit 360a102, before the split) plays the games in
// play.js, so tests/parity.test.ts can check that the current engine plays them exactly the same.
// Run from the repo root: node tests/parity/make-fixtures.mjs
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { GAMES, playGame } from './play.js';

const LEGACY_COMMIT = '360a102';
const html = execFileSync('git', ['show', `${LEGACY_COMMIT}:index.html`], { encoding: 'utf8', maxBuffer: 1 << 26 });
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
// the engine lives between the start of the script and the APP STATE section
const start = script.indexOf('/* ============================================================\n   DATA');
const end = script.indexOf('/* ============================================================\n   APP STATE');
if (start < 0 || end < 0) throw new Error('could not find the engine in the legacy script');
const engineSrc = script.slice(start, end);

const noop = () => {};
const context = vm.createContext({
  console,
  document: { addEventListener: noop, getElementById: () => null, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem: noop },
  navigator: { language: 'en' },
  matchMedia: () => ({ matches: false }),
});
vm.runInContext(
  `"use strict";\n${engineSrc}\nglobalThis.__eng={freshGame,apply,botDecide,actorOf,SP};globalThis.__setRandom=f=>{Math.random=f;};`,
  context,
  { filename: 'legacy-engine.js' },
);

const eng = context.__eng;
const out = GAMES.map(cfg => ({ seed: cfg.seed, prints: playGame(eng, context.__setRandom, cfg) }));
writeFileSync(new URL('./legacy-games.json', import.meta.url), JSON.stringify({ commit: LEGACY_COMMIT, games: out }) + '\n');
for (const g of out) console.log(`game ${g.seed}: ${g.prints.length - 1} moves`);
