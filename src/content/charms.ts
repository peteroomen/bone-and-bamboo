import type { SetKind } from './sets';
import type { SuitedSuit } from './tiles';

/**
 * Charms: the jokers. Each is a small object with one passive power. Some change how your dice
 * roll; the rest add to a hand's score. Five charm slots. *tune*
 */
export type Rarity = 'common' | 'uncommon' | 'rare';

export type CharmEffect =
  // bending the dice
  | { readonly type: 'thumb' }
  | { readonly type: 'mirror' }
  | { readonly type: 'redString' }
  | { readonly type: 'bead' }
  | { readonly type: 'fan' }
  | { readonly type: 'shell' }
  | { readonly type: 'cup'; readonly amount: number }
  | { readonly type: 'rolls'; readonly amount: number }
  | { readonly type: 'returns'; readonly amount: number }
  | { readonly type: 'rollOnBonus'; readonly amount: number }
  | { readonly type: 'bonusDouble' }
  // money
  | { readonly type: 'money'; readonly amount: number }
  // scoring
  | { readonly type: 'chips'; readonly amount: number }
  | { readonly type: 'mult'; readonly amount: number }
  | { readonly type: 'multPerSet'; readonly set: SetKind; readonly amount: number }
  | { readonly type: 'chipsPerSuitTile'; readonly suit: SuitedSuit; readonly amount: number }
  | { readonly type: 'multPerOutsideSet'; readonly amount: number }
  | { readonly type: 'multPerWindSet'; readonly amount: number }
  | { readonly type: 'multPerPongTile'; readonly amount: number }
  | { readonly type: 'xmultIfPongs'; readonly count: number; readonly amount: number }
  | { readonly type: 'xmultIfSimples'; readonly amount: number }
  | { readonly type: 'xmultPerKong'; readonly amount: number }
  | { readonly type: 'xmultPerTwin'; readonly amount: number };

export interface CharmDef {
  readonly id: string;
  readonly name: string;
  readonly text: string;
  readonly rarity: Rarity;
  readonly effect: CharmEffect;
}

export const RARITY_PRICE: Record<Rarity, number> = { common: 4, uncommon: 6, rare: 8 };
export const RARITY_WEIGHT: Record<Rarity, number> = { common: 6, uncommon: 3, rare: 1 };
export const CHARM_SLOTS = 5;

const list: CharmDef[] = [
  // ---- the dice
  {
    id: 'thumb',
    name: 'Thumb',
    text: 'Once per roll, tip a die onto a neighbouring face.',
    rarity: 'uncommon',
    effect: { type: 'thumb' },
  },
  {
    id: 'mirror',
    name: 'Mirror',
    text: 'Once per hand, a die copies the face another die shows.',
    rarity: 'rare',
    effect: { type: 'mirror' },
  },
  {
    id: 'redString',
    name: 'Red String',
    text: 'Your two leftmost dice are tied: the second lands on the first one’s suit if it can.',
    rarity: 'uncommon',
    effect: { type: 'redString' },
  },
  {
    id: 'bead',
    name: 'Counting Bead',
    text: 'Your leftmost die steps to its next face instead of rolling.',
    rarity: 'common',
    effect: { type: 'bead' },
  },
  {
    id: 'fan',
    name: 'Paper Fan',
    text: 'Once per hand, reroll one die for free.',
    rarity: 'common',
    effect: { type: 'fan' },
  },
  {
    id: 'shell',
    name: 'Oracle Shell',
    text: 'Once per hand, turn a die over to its opposite face.',
    rarity: 'uncommon',
    effect: { type: 'shell' },
  },
  {
    id: 'secondCup',
    name: 'Second Cup',
    text: 'Room for a seventh die.',
    rarity: 'rare',
    effect: { type: 'cup', amount: 1 },
  },
  {
    id: 'hourglass',
    name: 'Hourglass',
    text: '+3 rolls each round.',
    rarity: 'common',
    effect: { type: 'rolls', amount: 3 },
  },
  {
    id: 'inkStone',
    name: 'Ink Stone',
    text: '+2 returns each round.',
    rarity: 'common',
    effect: { type: 'returns', amount: 2 },
  },
  {
    id: 'magpie',
    name: 'Magpie',
    text: '+1 roll whenever a flower or season lands.',
    rarity: 'uncommon',
    effect: { type: 'rollOnBonus', amount: 1 },
  },
  {
    id: 'almanac',
    name: 'Almanac',
    text: 'Flowers and seasons count double.',
    rarity: 'uncommon',
    effect: { type: 'bonusDouble' },
  },
  {
    id: 'goldToad',
    name: 'Gold Toad',
    text: '+$3 after each round.',
    rarity: 'common',
    effect: { type: 'money', amount: 3 },
  },
  // ---- scoring
  {
    id: 'luckyKnot',
    name: 'Lucky Knot',
    text: '+5 mult.',
    rarity: 'common',
    effect: { type: 'mult', amount: 5 },
  },
  {
    id: 'coinString',
    name: 'Coin String',
    text: '+50 chips.',
    rarity: 'common',
    effect: { type: 'chips', amount: 50 },
  },
  {
    id: 'abacus',
    name: 'Abacus',
    text: '+2 mult per chow.',
    rarity: 'common',
    effect: { type: 'multPerSet', set: 'chow', amount: 2 },
  },
  {
    id: 'nest',
    name: 'Sparrow Nest',
    text: '+5 mult per pair.',
    rarity: 'common',
    effect: { type: 'multPerSet', set: 'pair', amount: 5 },
  },
  {
    id: 'bambooGrove',
    name: 'Bamboo Grove',
    text: '+8 chips per Bamboo tile.',
    rarity: 'common',
    effect: { type: 'chipsPerSuitTile', suit: 's', amount: 8 },
  },
  {
    id: 'coinPurse',
    name: 'Coin Purse',
    text: '+8 chips per Dots tile.',
    rarity: 'common',
    effect: { type: 'chipsPerSuitTile', suit: 'p', amount: 8 },
  },
  {
    id: 'scroll',
    name: 'Scroll',
    text: '+8 chips per Characters tile.',
    rarity: 'common',
    effect: { type: 'chipsPerSuitTile', suit: 'm', amount: 8 },
  },
  {
    id: 'moonGate',
    name: 'Moon Gate',
    text: '+4 mult per set with a 1, a 9 or an honour.',
    rarity: 'uncommon',
    effect: { type: 'multPerOutsideSet', amount: 4 },
  },
  {
    id: 'windChime',
    name: 'Wind Chime',
    text: '+10 mult per wind pong or kong.',
    rarity: 'uncommon',
    effect: { type: 'multPerWindSet', amount: 10 },
  },
  {
    id: 'bellHall',
    name: 'Bell Hall',
    text: '×2 mult with two or more pongs or kongs.',
    rarity: 'uncommon',
    effect: { type: 'xmultIfPongs', count: 2, amount: 2 },
  },
  {
    id: 'riceBowl',
    name: 'Rice Bowl',
    text: '×2 mult if the hand has no 1s, 9s or honours.',
    rarity: 'uncommon',
    effect: { type: 'xmultIfSimples', amount: 2 },
  },
  {
    id: 'stoneLion',
    name: 'Stone Lion',
    text: '+2 mult per tile in pongs and kongs.',
    rarity: 'rare',
    effect: { type: 'multPerPongTile', amount: 2 },
  },
  {
    id: 'greatBell',
    name: 'Great Bell',
    text: '×2 mult per kong.',
    rarity: 'rare',
    effect: { type: 'xmultPerKong', amount: 2 },
  },
  {
    id: 'twinCranes',
    name: 'Twin Cranes',
    text: '×1.5 mult per pair of identical sets.',
    rarity: 'rare',
    effect: { type: 'xmultPerTwin', amount: 1.5 },
  },
];

export const CHARMS: Record<string, CharmDef> = Object.fromEntries(list.map((c) => [c.id, c]));
export const CHARM_IDS: readonly string[] = list.map((c) => c.id);

export function charmPrice(id: string): number {
  const c = CHARMS[id];
  return c ? RARITY_PRICE[c.rarity] : 0;
}
