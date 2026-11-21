// The house rules, one at a time. Board squares used below:
// 0 Al Inṭilāq · 1 Sidi Moussa (400) · 3 Tabriket (450) · 4 Impôts (2,000 tax) · 5 Tanger TGV (station)
// 6, 8, 9 Chefchaouen · 10 3okacha · 12 ONEE (utility) · 20 Qahwa · 28 Maroc Telecom (utility)
import { afterEach, describe, expect, it, vi } from 'vitest';
import { actorOf, apply, billFor, canBuild, canRide, rideTargets, canSell, canShufa, freshGame, interestOn, netWorth, pay, rentFor, shufaPrice } from '../src/engine/engine';
import { botDecide } from '../src/engine/bots';
import { BILL_DAR, BILL_RIAD, FAIR_STEP, GROUPS, LOAN_MAX, RAIL_RENT, RAIL_SIDE, RAILS, RIAD_PREMIUM, SHUFA_FROM, SP, START_CASH } from '../src/engine/data';
import { isOwnable, range, unmortCost } from '../src/engine/util';
import type { Game, Settings } from '../src/engine/types';

const NAMES = ['Hamza', 'Salma', 'Youssef', 'Imane'];
function game(n = 2, settings: Partial<Settings> = {}, human = true): Game {
  return freshGame(range(n).map(i => ({ name: NAMES[i], token: i, human })), settings);
}
/** the next dice rolls, as pairs */
function dice(...rolls: [number, number][]) {
  const faces = rolls.flat();
  vi.spyOn(Math, 'random').mockImplementation(() => ((faces.shift() ?? 1) - 1) / 6 + 0.01);
}
const own = (G: Game, pid: number, ...squares: number[]) => squares.forEach(i => { G.props[i].owner = pid; });
const lastLog = (G: Game) => G.log[0][0];

afterEach(() => { vi.restoreAllMocks(); });

describe('a new game', () => {
  it('starts everyone at Al Inṭilāq with 15,000 DH and every property for sale', () => {
    const G = game(4);
    expect(G.players.map(p => [p.cash, p.pos])).toEqual(range(4).map(() => [START_CASH, 0]));
    const ownable = SP.map((_, i) => i).filter(isOwnable);
    expect(ownable).toHaveLength(28);
    expect(ownable.every(i => G.props[i].owner === -1)).toBe(true);
    expect([G.cur, G.round, G.phase]).toEqual([0, 1, 'roll']);
    expect(G.decks.mektoub.slice().sort((a, b) => a - b)).toEqual(range(20));
    expect(G.decks.baraka.slice().sort((a, b) => a - b)).toEqual(range(16));
  });
});

describe('optional house rules: fair start, starting deeds, solidarity', () => {
  it('gives each later seat a little more starting money', () => {
    const G = game(4, { fairStart: true });
    expect(G.players.map(p => p.cash)).toEqual([0, 1, 2, 3].map(i => START_CASH + i * FAIR_STEP[4]));
  });
  it('deals everyone two properties of about the same value, never a whole city', () => {
    for (let n = 0; n < 50; n++) {
      const G = game(6, { deeds: true });
      const owned = G.players.map(p => Object.keys(G.props).map(Number).filter(i => G.props[i].owner === p.id));
      expect(owned.every(o => o.length === 2)).toBe(true);
      const values = owned.map(o => o.reduce((s, i) => s + (SP[i] as { price: number }).price, 0));
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(2000);
      for (const g of Object.keys(GROUPS)) expect(G.players.some(p => SP.every((s, i) => s.t !== 'prop' || s.g !== g || G.props[i].owner === p.id))).toBe(false);
    }
  });
  it('pays the poorest player double at Al Inṭilāq, and only them', () => {
    const G = game(2, { solidarity: true });
    G.players[1].cash = 30000;
    G.players[0].pos = 38;
    dice([2, 3]);
    apply(G, 0, { t: 'roll' });
    expect(G.players[0].cash).toBe(START_CASH + 4000);
    expect(lastLog(G) === 'passGoSolidarity' || G.log.some(e => e[0] === 'passGoSolidarity')).toBe(true);
  });
});

describe('optional house rule: credit', () => {
  it('lends up to the limit, one loan at a time, in steps of 500', () => {
    const G = game(2, { credit: true });
    expect(apply(G, 0, { t: 'borrow', a: 300 })).toBe(false);
    expect(apply(G, 0, { t: 'borrow', a: LOAN_MAX + 500 })).toBe(false);
    expect(apply(G, 0, { t: 'borrow', a: 3000 })).toBe(true);
    expect([G.players[0].cash, G.players[0].loan]).toEqual([START_CASH + 3000, 3000]);
    expect(apply(G, 0, { t: 'borrow', a: 500 })).toBe(false);
    expect(apply(G, 1, { t: 'borrow', a: 500 })).toBe(false);          // not their turn
  });
  it('is not offered when the rule is off', () => {
    expect(apply(game(2), 0, { t: 'borrow', a: 1000 })).toBe(false);
  });
  it('charges interest each time the borrower passes Al Inṭilāq, and counts the loan against net worth', () => {
    const G = game(2, { credit: true });
    apply(G, 0, { t: 'borrow', a: 5000 });
    expect(netWorth(G, G.players[0])).toBe(START_CASH);
    G.players[0].pos = 38;
    dice([2, 3]);
    apply(G, 0, { t: 'roll' });
    expect(G.players[0].cash).toBe(START_CASH + 5000 + 2000 - interestOn(5000));
    expect(interestOn(5000)).toBe(500);
  });
  it('can be repaid in part or in full', () => {
    const G = game(2, { credit: true });
    apply(G, 0, { t: 'borrow', a: 2000 });
    expect(apply(G, 0, { t: 'repay', a: 500 })).toBe(true);
    expect(G.players[0].loan).toBe(1500);
    expect(apply(G, 0, { t: 'repay', a: 9999 })).toBe(true);           // more than owed repays what is owed
    expect([G.players[0].loan, G.players[0].cash]).toEqual([0, START_CASH]);
  });
  it('gets a player out of debt: the borrowed money pays what they owe', () => {
    const G = game(2, { credit: true });
    G.players[0].cash = 100;
    pay(G, G.players[0], 1, 1100, 'rent');
    expect(G.players[0].cash).toBe(-1000);
    expect(apply(G, 0, { t: 'borrow', a: 1000 })).toBe(true);
    expect(G.players[0].cash).toBe(0);
    expect(G.players[1].cash).toBe(START_CASH + 1100);
  });
});

describe('optional house rule: the Shufa', () => {
  const setup = () => {
    const G = game(3, { shufa: true });
    own(G, 1, 6, 11, 16);                       // the others own plenty, player 0 nothing
    own(G, 2, 21, 26, 31);
    G.round = SHUFA_FROM;
    return G;
  };
  it('lets the player worth the least buy another player’s property at 150%, paid to the owner, once', () => {
    const G = setup();
    expect(canShufa(G, 0, 11)).toBe(true);
    expect(canShufa(G, 1, 21)).toBe(false);     // not the poorest
    const price = shufaPrice(11);
    expect(price).toBe(1500);
    expect(apply(G, 0, { t: 'shufa', i: 11 })).toBe(true);
    expect(G.props[11].owner).toBe(0);
    expect(G.players[0].cash).toBe(START_CASH - price);
    expect(G.players[1].cash).toBe(START_CASH + price);
    expect(apply(G, 0, { t: 'shufa', i: 21 })).toBe(false);     // once per game
  });
  it('cannot break up a whole city, take a property in a city with buildings, or a mortgaged one', () => {
    const G = setup();
    own(G, 1, 1, 3);                             // player 1 owns all of Salé
    expect(canShufa(G, 0, 1)).toBe(false);
    G.props[6].mort = true;
    expect(canShufa(G, 0, 6)).toBe(false);
    own(G, 2, 23, 24); G.props[21].houses = 1;   // player 2 owns Tangier, built
    expect(canShufa(G, 0, 21)).toBe(false);
    expect(canShufa(G, 0, 26)).toBe(true);
  });
  it('only opens from round ' + SHUFA_FROM + ', when being behind means something', () => {
    const G = setup();
    G.round = SHUFA_FROM - 1;
    expect(canShufa(G, 0, 11)).toBe(false);
    expect(apply(G, 0, { t: 'shufa', i: 11 })).toBe(false);
  });
  it('is not offered when the rule is off', () => {
    const G = game(3);
    own(G, 1, 6);
    expect(apply(G, 0, { t: 'shufa', i: 6 })).toBe(false);
  });
});

describe('optional house rule: utility bills', () => {
  const setup = (settings: Partial<Settings> = { bills: true }) => {
    const G = game(3, settings);
    own(G, 0, 1, 3); G.props[1].houses = 2; G.props[3].houses = 5;   // two dars and a riad
    own(G, 1, 12); own(G, 2, 28); G.props[28].mort = true;           // a mortgaged utility sends no bill
    G.players[0].pos = 38;
    return G;
  };
  it('charges a player passing Al Inṭilāq for their dars and riads, paid to each utility’s owner', () => {
    const G = setup();
    expect(billFor(G, G.players[0])).toBe(2 * BILL_DAR + BILL_RIAD);
    dice([2, 3]);
    apply(G, 0, { t: 'roll' });
    expect(G.players[0].cash).toBe(START_CASH + 2000 - (2 * BILL_DAR + BILL_RIAD));
    expect(G.players[1].cash).toBe(START_CASH + 2 * BILL_DAR + BILL_RIAD);
    expect(G.players[2].cash).toBe(START_CASH);
  });
  it('sends no bill to a player for their own utility, or when the rule is off', () => {
    const G = setup(); own(G, 0, 12);
    dice([2, 3]);
    apply(G, 0, { t: 'roll' });
    expect(G.players[0].cash).toBe(START_CASH + 2000);
    const H = setup({});
    dice([2, 3]);
    apply(H, 0, { t: 'roll' });
    expect(H.players[0].cash).toBe(START_CASH + 2000);
  });
});

describe('optional house rule: the train', () => {
  /** player 0 stops on Tanger TGV, which they own along with Casa Oasis; player 1 has Rabat Ville */
  const setup = (settings: Partial<Settings> = { train: true }, mine = [5, 25]) => {
    const G = game(2, settings);
    own(G, 0, ...mine); own(G, 1, 15);
    G.players[0].pos = 2;
    dice([1, 2]);
    apply(G, 0, { t: 'roll' });
    return G;
  };
  it('takes a player who stopped on a station of theirs to another of their own, free', () => {
    const G = setup();
    expect(rideTargets(G, 0)).toEqual([25]);                          // not Rabat Ville (player 1's) or Marrakech (nobody's)
    expect(apply(G, 0, { t: 'ride', to: 15 })).toBe(false);
    expect(apply(G, 0, { t: 'ride', to: 25 })).toBe(true);
    expect(G.players[0].pos).toBe(25);
    expect(G.players[0].cash).toBe(START_CASH);
    expect(G.phase).toBe('end');
    expect(canRide(G, 0)).toBe(false);                                // once a turn
  });
  it('does not count a station bought on this stop', () => {
    const G = setup({ train: true }, [25]);
    expect(G.phase).toBe('buy');
    apply(G, 0, { t: 'buy' });
    expect(G.props[5].owner).toBe(0);
    expect(canRide(G, 0)).toBe(false);
  });
  it('needs a second station in service, and only runs on the turn the player stopped there', () => {
    const G = setup(); G.props[25].mort = true;
    expect(canRide(G, 0)).toBe(false);
    const H = setup();
    apply(H, 0, { t: 'end' });
    H.players[0].pos = 5;
    expect(canRide(H, 0)).toBe(false);
  });
  it('raises a station’s rent by a share of the rents of the dars and riads on its side of the board, whoever owns them', () => {
    const G = setup();
    expect(rentFor(G, 15)).toBe(RAIL_RENT[0]);                       // nothing built on the left side yet
    own(G, 1, 11, 13, 14); G.props[11].houses = 2; G.props[13].houses = 5;
    own(G, 0, 16); G.props[16].houses = 1;
    own(G, 1, 21); G.props[21].houses = 3;                             // the top side: not Rabat Ville's
    const extra = (SP[11] as { rent: number[] }).rent[2] + (SP[13] as { rent: number[] }).rent[5] + (SP[16] as { rent: number[] }).rent[1];
    expect(rentFor(G, 15)).toBe(RAIL_RENT[0] + Math.round(extra * RAIL_SIDE / 10) * 10);
    const H = setup({});
    own(H, 1, 11); H.props[11].houses = 2;
    expect(rentFor(H, 15)).toBe(RAIL_RENT[0]);
  });
  it('is not offered without the rule', () => {
    const H = setup({});
    expect(canRide(H, 0)).toBe(false);
    expect(apply(H, 0, { t: 'ride', to: 25 })).toBe(false);
  });
});

describe('house rules with numbers and the newer switches', () => {
  it('starts everyone with the chosen money', () => {
    const G = game(3, { cash: 30000 });
    expect(G.players.map(p => p.cash)).toEqual([30000, 30000, 30000]);
  });
  it('pays the chosen salary for passing Al Inṭilāq', () => {
    const G = game(2, { salary: 4000 });
    G.players[0].pos = 38;
    dice([2, 3]);                                  // 38 + 5 = 43: passes Al Inṭilāq onto square 3
    apply(G, 0, { t: 'roll' });
    expect(G.players[0].cash).toBe(START_CASH + 4000);
  });
  it('pays the salary twice for landing right on Al Inṭilāq when that rule is on, once when it is off', () => {
    for (const goDouble of [true, false]) {
      const G = game(2, { goDouble });
      G.players[0].pos = 35;
      dice([2, 3]);                                // 35 + 5 = 40: lands on Al Inṭilāq
      apply(G, 0, { t: 'roll' });
      expect(G.players[0].cash).toBe(START_CASH + (goDouble ? 4000 : 2000));
    }
  });
  it('charges the chosen fine to leave 3okacha', () => {
    const G = game(2, { fine: 1000 });
    G.players[0].pos = 10; G.players[0].inJail = true;
    expect(apply(G, 0, { t: 'fine' })).toBe(true);
    expect(G.players[0].cash).toBe(START_CASH - 1000);
  });
  it('does not allow "Riad now" when that rule is off', () => {
    const G = game(2, { riadNow: false });
    own(G, 0, 1, 3);
    expect(apply(G, 0, { t: 'riad', i: 1 })).toBe(false);
    expect(G.props[1].houses).toBe(0);
  });
  it('collects no rent for a player in 3okacha when that rule is off', () => {
    for (const jailRent of [true, false]) {
      const G = game(2, { jailRent });
      own(G, 1, 3);
      G.players[1].pos = 10; G.players[1].inJail = true;
      dice([1, 2]);                                // 0 + 3: Tabriket, owned by the jailed player
      apply(G, 0, { t: 'roll' });
      expect(G.players[0].cash).toBe(START_CASH - (jailRent ? rentFor(G, 3) : 0));
    }
  });
});

describe('rent', () => {
  it('is the base rent, doubled when the owner has the whole colour group', () => {
    const G = game();
    own(G, 1, 1);
    expect(rentFor(G, 1)).toBe(20);
    own(G, 1, 3);
    expect(rentFor(G, 1)).toBe(40);
  });
  it('follows the number of dars, then the riad', () => {
    const G = game();
    own(G, 1, 1, 3);
    G.props[1].houses = 2;
    expect(rentFor(G, 1)).toBe(300);
    G.props[1].houses = 5;
    expect(rentFor(G, 1)).toBe(2500);
  });
  it('for stations depends on how many the owner has, doubled by the Al Boraq card', () => {
    const G = game();
    own(G, 1, 5);
    expect(rentFor(G, 5)).toBe(250);
    own(G, 1, ...RAILS);
    expect(rentFor(G, 5)).toBe(2000);
    expect(rentFor(G, 5, { railDouble: true })).toBe(4000);
  });
  it('for utilities is 40 × the dice, or 100 × with both utilities', () => {
    const G = game();
    G.dice = [3, 4];
    own(G, 1, 12);
    expect(rentFor(G, 12)).toBe(280);
    own(G, 1, 28);
    expect(rentFor(G, 12)).toBe(700);
  });
  it('is paid to the owner when you land, unless the property is mortgaged', () => {
    const G = game();
    own(G, 1, 3);
    dice([1, 2]);
    apply(G, 0, { t: 'roll' });
    expect(G.players[0].cash).toBe(START_CASH - 40);
    expect(G.players[1].cash).toBe(START_CASH + 40);

    const H = game();
    own(H, 1, 3);
    H.props[3].mort = true;
    dice([1, 2]);
    apply(H, 0, { t: 'roll' });
    expect(H.players[0].cash).toBe(START_CASH);
    expect(lastLog(H)).toBe('mortNoRent');
  });
});

describe('moving', () => {
  it('pays 2,000 DH for passing Al Inṭilāq', () => {
    const G = game();
    G.players[0].pos = 38;
    dice([2, 3]);
    apply(G, 0, { t: 'roll' });
    expect(G.players[0].pos).toBe(3);
    expect(G.players[0].cash).toBe(START_CASH + 2000);
  });
  it('only lets the current player roll, once, unless they rolled a double', () => {
    const G = game();
    expect(apply(G, 1, { t: 'roll' })).toBe(false);
    own(G, 1, 3, 6);
    dice([1, 2]);
    expect(apply(G, 0, { t: 'roll' })).toBe(true);
    expect(G.phase).toBe('end');
    expect(apply(G, 0, { t: 'roll' })).toBe(false);

    const H = game();
    own(H, 1, 6);
    dice([3, 3]);
    apply(H, 0, { t: 'roll' });
    expect(H.phase).toBe('roll');
  });
});

describe('buying and the dlala (auction)', () => {
  it('buys the property you land on', () => {
    const G = game();
    dice([1, 2]);
    apply(G, 0, { t: 'roll' });
    expect(G.phase).toBe('buy');
    expect(apply(G, 0, { t: 'buy' })).toBe(true);
    expect(G.props[3].owner).toBe(0);
    expect(G.players[0].cash).toBe(START_CASH - 450);
    expect(G.phase).toBe('end');
  });
  it('cannot buy without the money', () => {
    const G = game();
    G.players[0].cash = 400;
    dice([1, 2]);
    apply(G, 0, { t: 'roll' });
    expect(apply(G, 0, { t: 'buy' })).toBe(false);
  });
  it('auctions a declined property; bidders take turns from the next player and the last one in buys it', () => {
    const G = game(3);
    dice([1, 2]);
    apply(G, 0, { t: 'roll' });
    apply(G, 0, { t: 'decline' });
    expect(G.auction).toMatchObject({ idx: 3, bidders: [1, 2, 0], turn: 0 });
    expect(actorOf(G)).toBe(1);
    expect(apply(G, 0, { t: 'bid', inc: 100 })).toBe(false); // not their turn
    apply(G, 1, { t: 'bid', inc: 500 });
    apply(G, 2, { t: 'pass' });
    apply(G, 0, { t: 'pass' });
    expect(G.auction).toBeNull();
    expect(G.props[3].owner).toBe(1);
    expect(G.players[1].cash).toBe(START_CASH - 500);
  });
  it('leaves the property unsold when nobody bids', () => {
    const G = game(2);
    dice([1, 2]);
    apply(G, 0, { t: 'roll' });
    apply(G, 0, { t: 'decline' });
    apply(G, 1, { t: 'pass' });
    apply(G, 0, { t: 'pass' });
    expect(G.props[3].owner).toBe(-1);
    expect(lastLog(G)).toBe('noBids');
  });
  it('has no auction when the dlala rule is off', () => {
    const G = game(2, { dlala: false });
    dice([1, 2]);
    apply(G, 0, { t: 'roll' });
    apply(G, 0, { t: 'decline' });
    expect(G.auction).toBeNull();
    expect(G.phase).toBe('end');
  });
});

describe('3okacha (jail)', () => {
  const allOwnedBy1 = () => {
    const G = game();
    own(G, 1, ...SP.map((_, i) => i).filter(isOwnable));
    return G;
  };
  it('three doubles in a row send you there', () => {
    const G = allOwnedBy1();
    dice([4, 4], [1, 1], [2, 2]);
    apply(G, 0, { t: 'roll' });
    apply(G, 0, { t: 'roll' });
    apply(G, 0, { t: 'roll' });
    expect(G.players[0]).toMatchObject({ pos: 10, inJail: true });
    expect(G.phase).toBe('end');
  });
  it('a double gets you out and moves you, with no extra roll', () => {
    const G = allOwnedBy1();
    Object.assign(G.players[0], { pos: 10, inJail: true });
    dice([2, 2]);
    apply(G, 0, { t: 'roll' });
    expect(G.players[0]).toMatchObject({ pos: 14, inJail: false });
    expect(G.phase).toBe('end');
  });
  it('after three failed rolls you pay 500 DH and move', () => {
    const G = allOwnedBy1();
    Object.assign(G.players[0], { pos: 10, inJail: true, jailTurns: 2 });
    dice([1, 2]);
    apply(G, 0, { t: 'roll' });
    expect(G.players[0]).toMatchObject({ pos: 13, inJail: false });
    expect(G.daret).toBe(500);
  });
  it('you can pay the 500 DH fine, or use a card, before rolling', () => {
    const G = game();
    Object.assign(G.players[0], { pos: 10, inJail: true });
    expect(apply(G, 0, { t: 'card' })).toBe(false);
    expect(apply(G, 0, { t: 'fine' })).toBe(true);
    expect(G.players[0]).toMatchObject({ inJail: false, cash: START_CASH - 500 });

    const H = game();
    Object.assign(H.players[0], { pos: 10, inJail: true, goojf: [{ deck: 'mektoub', id: 10 }] });
    H.decks.mektoub = H.decks.mektoub.filter(id => id !== 10);
    expect(apply(H, 0, { t: 'card' })).toBe(true);
    expect(H.players[0].inJail).toBe(false);
    expect(H.decks.mektoub.at(-1)).toBe(10); // back under the deck
  });
});

describe('the Daret pot', () => {
  it('collects taxes and pays out at Qahwa', () => {
    const G = game();
    dice([1, 3]);
    apply(G, 0, { t: 'roll' });
    expect(G.daret).toBe(2000);
    expect(G.players[0].cash).toBe(START_CASH - 2000);
    G.players[1].pos = 15;
    apply(G, 0, { t: 'end' });
    dice([2, 3]);
    apply(G, 1, { t: 'roll' });
    expect(G.players[1].cash).toBe(START_CASH + 2000);
    expect(G.daret).toBe(0);
  });
  it('sends taxes to the bank when the rule is off', () => {
    const G = game(2, { daret: false });
    dice([1, 3]);
    apply(G, 0, { t: 'roll' });
    expect(G.daret).toBe(0);
    expect(G.players[0].cash).toBe(START_CASH - 2000);
  });
});

describe('building', () => {
  it('needs the whole colour group and goes evenly, one dar at a time', () => {
    const G = game();
    own(G, 0, 1);
    expect(canBuild(G, 1, 0)).toBe(false);
    own(G, 0, 3);
    expect(apply(G, 0, { t: 'build', i: 1 })).toBe(true);
    expect(G.players[0].cash).toBe(START_CASH - 500);
    expect(apply(G, 0, { t: 'build', i: 1 })).toBe(false); // Tabriket first
    expect(apply(G, 0, { t: 'build', i: 3 })).toBe(true);
    expect(apply(G, 0, { t: 'build', i: 1 })).toBe(true);
  });
  it('is not allowed while a property in the group is mortgaged', () => {
    const G = game();
    own(G, 0, 1, 3);
    G.props[3].mort = true;
    expect(canBuild(G, 1, 0)).toBe(false);
  });
  it('can put a riad up in one go, paying for the missing dars plus a premium', () => {
    const G = game();
    own(G, 0, 1, 3);
    G.props[1].houses = 1;
    expect(apply(G, 0, { t: 'riad', i: 1 })).toBe(true);
    expect(G.props[1].houses).toBe(5);
    expect(G.players[0].cash).toBe(START_CASH - 4 * 500 * (1 + RIAD_PREMIUM)); // 3,000 DH
  });
  it('does not give the riad premium back: selling and net worth go by the normal dar cost', () => {
    const G = game();
    own(G, 0, 1, 3);
    expect(apply(G, 0, { t: 'riad', i: 1 })).toBe(true);
    expect(G.players[0].cash).toBe(START_CASH - 5 * 500 * (1 + RIAD_PREMIUM)); // 3,750 DH
    expect(apply(G, 0, { t: 'sell', i: 1 })).toBe(true);
    expect(G.props[1].houses).toBe(4);
    expect(G.players[0].cash).toBe(START_CASH - 5 * 500 * (1 + RIAD_PREMIUM) + 250);
    expect(netWorth(G, G.players[0])).toBe(G.players[0].cash + 400 + 450 + 4 * 500);
  });
  it('sells back at half price, from the most built property first', () => {
    const G = game();
    own(G, 0, 1, 3);
    G.props[1].houses = 2;
    G.props[3].houses = 1;
    expect(canSell(G, 3, 0)).toBe(false);
    expect(apply(G, 0, { t: 'sell', i: 1 })).toBe(true);
    expect(G.players[0].cash).toBe(START_CASH + 250);
  });
});

describe('mortgages', () => {
  it('pay half the price, and cost 55% (rounded up to 10 DH) to lift', () => {
    const G = game();
    own(G, 0, 3);
    expect(apply(G, 0, { t: 'mort', i: 3 })).toBe(true);
    expect(G.players[0].cash).toBe(START_CASH + 225);
    expect(unmortCost(3)).toBe(250);
    expect(apply(G, 0, { t: 'unmort', i: 3 })).toBe(true);
    expect(G.players[0].cash).toBe(START_CASH + 225 - 250);
  });
  it('are not allowed while the colour group has buildings', () => {
    const G = game();
    own(G, 0, 1, 3);
    G.props[1].houses = 1;
    expect(apply(G, 0, { t: 'mort', i: 3 })).toBe(false);
  });
});

describe('debts', () => {
  it('only the money a player really has changes hands; the rest is owed', () => {
    const G = game();
    G.players[0].cash = 100;
    pay(G, G.players[0], 1, 300, 'rent');
    expect(G.players[1].cash).toBe(START_CASH + 100);
    expect(G.players[0]).toMatchObject({ cash: -200, owes: 1, debts: [{ to: 1, amt: 200 }] });
  });
  it('money raised later goes straight to the people owed', () => {
    const G = game();
    own(G, 0, 1);
    G.players[0].cash = 100;
    pay(G, G.players[0], 1, 300, 'rent');
    apply(G, 0, { t: 'mort', i: 1 }); // raises 200
    expect(G.players[1].cash).toBe(START_CASH + 300);
    expect(G.players[0]).toMatchObject({ cash: 0, owes: -1, debts: [] });
  });
  it('a player in debt must sort it out before rolling or ending the turn', () => {
    const G = game();
    G.players[0].cash = -50;
    expect(apply(G, 0, { t: 'roll' })).toBe(false);
    G.phase = 'end';
    expect(apply(G, 0, { t: 'end' })).toBe(false);
  });
});

describe('bankruptcy', () => {
  it('sells buildings and mortgages first, and stays in the game if that covers the debt', () => {
    const G = game();
    own(G, 0, 1, 3);
    G.props[1].houses = 1;
    G.players[0].cash = 0;
    pay(G, G.players[0], 1, 300, 'rent');
    expect(apply(G, 0, { t: 'bankrupt' })).toBe(true);
    expect(G.players[0].bankrupt).toBe(false);
    expect(G.props[1].houses).toBe(0);
    expect(G.players[1].cash).toBe(START_CASH + 300);
  });
  it('hands everything to the player owed, and the last player standing wins', () => {
    const G = game();
    own(G, 0, 1);
    G.players[0].cash = 0;
    pay(G, G.players[0], 1, 5000, 'rent');
    apply(G, 0, { t: 'bankrupt' });
    expect(G.players[0].bankrupt).toBe(true);
    expect(G.props[1]).toMatchObject({ owner: 1, mort: true });
    expect(G.over).toBe(true);
    expect(G.winner).toBe(1);
  });
  it('returns the properties to the bank when the debt is to the bank', () => {
    const G = game(3);
    own(G, 0, 1);
    G.players[0].cash = 0;
    pay(G, G.players[0], -1, 5000, 'fuel');
    apply(G, 0, { t: 'bankrupt' });
    expect(G.props[1]).toEqual({ owner: -1, houses: 0, mort: false });
    expect(G.over).toBe(false);
    expect(G.cur).toBe(1);
  });
  it('happens on its own for anyone who is not the current human player', () => {
    const G = game(3);
    G.players[1].human = false;
    G.players[1].cash = 0;
    own(G, 0, 3);
    G.players[1].pos = 1;
    G.cur = 1;
    dice([1, 1]);
    apply(G, 1, { t: 'roll' }); // lands on Tabriket with no money and nothing to sell
    expect(G.players[1].bankrupt).toBe(true);
    expect(G.players[0].cash).toBe(START_CASH);
  });
});

describe('trades', () => {
  it('swap properties and cash when accepted', () => {
    const G = game();
    own(G, 0, 1);
    own(G, 1, 6);
    expect(apply(G, 0, { t: 'trade', to: 1, give: [1], get: [6], cashGive: 300 })).toBe(true);
    expect(actorOf(G)).toBe(1);
    apply(G, 1, { t: 'tradeReply', accept: true });
    expect([G.props[1].owner, G.props[6].owner]).toEqual([1, 0]);
    expect(G.players.map(p => p.cash)).toEqual([START_CASH - 300, START_CASH + 300]);
    expect(G.trade).toBeNull();
  });
  it('can be refused, or withdrawn by the player who made the offer', () => {
    const G = game();
    own(G, 0, 1);
    apply(G, 0, { t: 'trade', to: 1, give: [1] });
    apply(G, 1, { t: 'tradeReply', accept: false });
    expect(G.props[1].owner).toBe(0);
    apply(G, 0, { t: 'trade', to: 1, give: [1] });
    expect(apply(G, 1, { t: 'tradeCancel' })).toBe(false);
    expect(apply(G, 0, { t: 'tradeCancel' })).toBe(true);
    expect(G.trade).toBeNull();
  });
  it('cannot include built-up colour groups, more cash than you have, or nothing at all', () => {
    const G = game();
    own(G, 0, 1, 3);
    G.props[3].houses = 1;
    expect(apply(G, 0, { t: 'trade', to: 1, give: [1] })).toBe(false);
    expect(apply(G, 0, { t: 'trade', to: 1, cashGive: START_CASH + 1 })).toBe(false);
    expect(apply(G, 0, { t: 'trade', to: 1 })).toBe(false);
    expect(apply(G, 0, { t: 'trade', to: 0, cashGive: 10 })).toBe(false);
  });
  it('fall through if the properties changed hands in the meantime', () => {
    const G = game();
    own(G, 0, 1);
    apply(G, 0, { t: 'trade', to: 1, give: [1] });
    G.props[1].owner = -1;
    apply(G, 1, { t: 'tradeReply', accept: true });
    expect(lastLog(G)).toBe('tradeVoid');
  });
});

describe('turns and the end of the game', () => {
  it('pass to the next player still in the game, and count rounds', () => {
    const G = game(3);
    G.players[1].bankrupt = true;
    G.phase = 'end';
    apply(G, 0, { t: 'end' });
    expect(G.cur).toBe(2);
    G.phase = 'end';
    apply(G, 2, { t: 'end' });
    expect([G.cur, G.round]).toEqual([0, 2]);
  });
  it('end after the last round, and the richest player wins', () => {
    const G = game(2, { rounds: 1 });
    own(G, 1, 39);
    G.phase = 'end';
    apply(G, 0, { t: 'end' });
    G.phase = 'end';
    apply(G, 1, { t: 'end' });
    expect(G.over).toBe(true);
    expect(G.winner).toBe(1);
    expect(netWorth(G, G.players[1])).toBe(START_CASH + 4000);
  });
});

describe('computer players', () => {
  it('only move for themselves', () => {
    expect(botDecide(game(2, {}, true))).toBeNull();
  });
  it('sort out their properties, then roll', () => {
    const G = game(2, {}, false);
    expect(botDecide(G)).toEqual({ seat: 0, a: { t: 'manage' } });
    apply(G, 0, { t: 'manage' });
    expect(botDecide(G)).toEqual({ seat: 0, a: { t: 'roll' } });
  });
});
