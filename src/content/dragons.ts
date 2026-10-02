import type { SetKind } from './sets';
import type { SuitedSuit } from './tiles';

export type Rarity = 'common' | 'uncommon' | 'rare';

/** A condition on the table, for the ×mult dragons. */
export type TableCondition =
  | { readonly kind: 'bigSets'; readonly min: number }
  | { readonly kind: 'setsAndPair'; readonly sets: number }
  | { readonly kind: 'maxSuits'; readonly n: number }
  | { readonly kind: 'noOutside' }
  | { readonly kind: 'pureStraight' };

/** What a dragon does. The engine interprets these; the numbers live here. */
export type DragonEffect =
  | { readonly type: 'flat'; readonly chips?: number; readonly mult?: number }
  | {
      readonly type: 'perSet';
      readonly sets: readonly SetKind[];
      readonly chips?: number;
      readonly mult?: number;
    }
  | { readonly type: 'perTileSuit'; readonly suit: SuitedSuit; readonly chips: number }
  /** per set (not a single) with a 1, 9 or honour */
  | { readonly type: 'perOutsideSet'; readonly mult: number }
  /** per Four Winds, or pong or kong of a wind */
  | { readonly type: 'perWindSet'; readonly mult: number }
  /** per tile in the listed sets */
  | {
      readonly type: 'perSetTile';
      readonly sets: readonly SetKind[];
      readonly mult: number;
    }
  | { readonly type: 'xIf'; readonly x: number; readonly when: TableCondition }
  | { readonly type: 'xPerSet'; readonly sets: readonly SetKind[]; readonly x: number }
  | { readonly type: 'xPerIdenticalPair'; readonly x: number }
  | {
      readonly type: 'mod';
      readonly discards?: number;
      readonly plays?: number;
      readonly hand?: number;
      readonly peek?: number;
    }
  | { readonly type: 'income'; readonly money: number };

export interface Dragon {
  readonly id: string;
  readonly name: string;
  readonly rarity: Rarity;
  readonly text: string;
  readonly effects: readonly DragonEffect[];
}

export const DRAGON_PRICE: Record<Rarity, number> = { common: 4, uncommon: 6, rare: 8 };
/** How often each rarity comes up in the teahouse. */
export const DRAGON_WEIGHT: Record<Rarity, number> = { common: 6, uncommon: 3, rare: 1 };
export const DRAGON_SLOTS = 5;

const list: Dragon[] = [
  // common
  {
    id: 'abacus',
    name: 'Abacus',
    rarity: 'common',
    text: '+2 mult per chow',
    effects: [{ type: 'perSet', sets: ['chow'], mult: 2 }],
  },
  {
    id: 'redString',
    name: 'Red String',
    rarity: 'common',
    text: '+6 mult',
    effects: [{ type: 'flat', mult: 6 }],
  },
  {
    id: 'coinString',
    name: 'Coin String',
    rarity: 'common',
    text: '+50 chips',
    effects: [{ type: 'flat', chips: 50 }],
  },
  {
    id: 'bambooGrove',
    name: 'Bamboo Grove',
    rarity: 'common',
    text: '+12 chips per Bamboo tile on the table',
    effects: [{ type: 'perTileSuit', suit: 's', chips: 12 }],
  },
  {
    id: 'coinPurse',
    name: 'Coin Purse',
    rarity: 'common',
    text: '+12 chips per Dots tile on the table',
    effects: [{ type: 'perTileSuit', suit: 'p', chips: 12 }],
  },
  {
    id: 'scroll',
    name: 'Scroll',
    rarity: 'common',
    text: '+12 chips per Characters tile on the table',
    effects: [{ type: 'perTileSuit', suit: 'm', chips: 12 }],
  },
  {
    id: 'sparrowNest',
    name: 'Nest',
    rarity: 'common',
    text: 'Pairs +6 mult',
    effects: [{ type: 'perSet', sets: ['pair'], mult: 6 }],
  },
  {
    id: 'goldToad',
    name: 'Gold Toad',
    rarity: 'common',
    text: '+$4 after each round',
    effects: [{ type: 'income', money: 4 }],
  },
  // uncommon
  {
    id: 'pongHall',
    name: 'Bell Hall',
    rarity: 'uncommon',
    text: '×2 mult with 2+ pongs or kongs',
    effects: [{ type: 'xIf', x: 2, when: { kind: 'bigSets', min: 2 } }],
  },
  {
    id: 'outside',
    name: 'Moon Gate',
    rarity: 'uncommon',
    text: '+4 mult per set with a 1, 9 or honour',
    effects: [{ type: 'perOutsideSet', mult: 4 }],
  },
  {
    id: 'ironTeapot',
    name: 'Iron Teapot',
    rarity: 'uncommon',
    text: '+2 discards',
    effects: [{ type: 'mod', discards: 2 }],
  },
  {
    id: 'longSleeves',
    name: 'Long Sleeves',
    rarity: 'uncommon',
    text: '+1 hand size',
    effects: [{ type: 'mod', hand: 1 }],
  },
  {
    id: 'lantern',
    name: 'Lantern',
    rarity: 'uncommon',
    text: 'See 1 tile deeper in every stack',
    effects: [{ type: 'mod', peek: 1 }],
  },
  {
    id: 'mahjong',
    name: 'Mahjong!',
    rarity: 'uncommon',
    text: '×2 mult with 4+ sets and a pair',
    effects: [{ type: 'xIf', x: 2, when: { kind: 'setsAndPair', sets: 4 } }],
  },
  {
    id: 'twoSuits',
    name: 'Two Fish',
    rarity: 'uncommon',
    text: '×1.5 mult if the table uses 2 suits or fewer',
    effects: [{ type: 'xIf', x: 1.5, when: { kind: 'maxSuits', n: 2 } }],
  },
  // rare
  {
    id: 'allSimples',
    name: 'Rice Bowl',
    rarity: 'rare',
    text: '×2 mult if no 1s, 9s or honours on the table',
    effects: [{ type: 'xIf', x: 2, when: { kind: 'noOutside' } }],
  },
  {
    id: 'pureStraight',
    name: 'Nine Rings',
    rarity: 'rare',
    text: '×3 mult with 1-2-3, 4-5-6, 7-8-9 of one suit',
    effects: [{ type: 'xIf', x: 3, when: { kind: 'pureStraight' } }],
  },
  {
    id: 'nightOwl',
    name: 'Night Owl',
    rarity: 'rare',
    text: '+1 play',
    effects: [{ type: 'mod', plays: 1 }],
  },
  {
    id: 'kongBell',
    name: 'Great Bell',
    rarity: 'rare',
    text: '×2 mult per kong',
    effects: [{ type: 'xPerSet', sets: ['kong'], x: 2 }],
  },
  {
    id: 'windChime',
    name: 'Wind Chime',
    rarity: 'rare',
    text: '+12 mult per wind set',
    effects: [{ type: 'perWindSet', mult: 12 }],
  },
  {
    id: 'twinCranes',
    name: 'Twin Cranes',
    rarity: 'rare',
    text: '×1.5 mult per pair of identical sets',
    effects: [{ type: 'xPerIdenticalPair', x: 1.5 }],
  },
  {
    id: 'threeTreasures',
    name: 'Three Treasures',
    rarity: 'rare',
    text: '×1.5 mult per pong',
    effects: [{ type: 'xPerSet', sets: ['pong'], x: 1.5 }],
  },
  {
    id: 'stoneLion',
    name: 'Stone Lion',
    rarity: 'rare',
    text: '+3 mult per tile in pongs and kongs',
    effects: [{ type: 'perSetTile', sets: ['pong', 'kong'], mult: 3 }],
  },
];

export const DRAGONS: Record<string, Dragon> = Object.fromEntries(list.map((c) => [c.id, c]));
export const DRAGON_IDS: readonly string[] = list.map((c) => c.id);

export function dragonPrice(id: string): number {
  const c = DRAGONS[id];
  return c ? DRAGON_PRICE[c.rarity] : 0;
}
