// The engine must play exactly like the original single-file game did. tests/parity/legacy-games.json
// holds a fingerprint of the game after every move the original code made (see make-fixtures.mjs);
// here the current engine plays the same seeded games and every fingerprint has to match.
// The one deliberate rule change since the original, the premium on the "Riad now" shortcut
// (RIAD_PREMIUM in data.ts), is switched off for the replay, so everything else is still checked.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { actorOf, apply, freshGame } from '../src/engine/engine';
import { botDecide } from '../src/engine/bots';
import { SP } from '../src/engine/data';
import { GAMES, playGame } from './parity/play.js';
import recorded from './parity/legacy-games.json';

vi.mock('../src/engine/data', async importOriginal => ({ ...(await importOriginal<typeof import('../src/engine/data')>()), RIAD_PREMIUM: 0 }));

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });

const engine = { freshGame, apply, botDecide, actorOf, SP };
const setRandom = (f: () => number) => { Math.random = f; };

describe('plays exactly like the original game', () => {
  for (const cfg of GAMES) {
    it(`game ${cfg.seed}: ${cfg.seats.length} players${cfg.setup ? `, ${cfg.setup[0]} start` : ''}`, () => {
      const want = recorded.games.find(g => g.seed === cfg.seed)!.prints;
      const got = playGame(engine, setRandom, cfg);
      const firstDiff = want.findIndex((p, i) => p !== got[i]);
      expect(firstDiff, `first different move: ${firstDiff}`).toBe(-1);
      expect(got.length).toBe(want.length);
    });
  }
});
