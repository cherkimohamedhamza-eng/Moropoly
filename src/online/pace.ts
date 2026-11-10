// How long players' screens take to show a change, so the server waits before the computer's next move
// instead of running ahead of what people see. Mirrors the timings in src/ui/anim.js.
import {BARAKA, MEKTOUB} from '../engine/cards';
import type {Anim} from '../engine/types';

const REVEAL_OUT = 420; // fade-out after a property or card reveal

export function animMs(a: Anim, fast: boolean): number {
  const sp = fast ? 0.45 : 1;
  switch (a.k) {
    case 'dice': return 950 * sp;
    case 'move': return (a.steps as number) * Math.max(70, 190 * sp) + 260;
    case 'jump': return 700 * sp + 200 + (a.f === 'jail' ? 1300 * sp + REVEAL_OUT : 0);
    case 'card': {
      const text = ((a.deck === 'mektoub' ? MEKTOUB : BARAKA)[a.id as number] || {text: ''}).text;
      return Math.min(9000, 4000 + text.length * 40) * (fast ? 0.75 : 1) + REVEAL_OUT;
    }
    case 'fx':
      switch (a.f) {
        case 'deed': return 1300 * sp + REVEAL_OUT;
        case 'buy': case 'deal': case 'joined': return 500 * sp;
        case 'pay': return 450 * sp;
        case 'gain': case 'go': return 350 * sp;
        case 'daret': return 700 * sp;
        case 'build': return 220 * sp;
        case 'dlala': return 400;
        case 'bankrupt': return 800 * sp;
        case 'win': return 1200;
      }
      return 0;
  }
  return 0;
}

/** after the screens catch up: how long the computer waits before a move, as on the old host */
export const botDelay = (manage: boolean, fast: boolean) => (manage ? (fast ? 60 : 250) : (fast ? 280 : 900));
