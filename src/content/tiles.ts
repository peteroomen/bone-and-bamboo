/**
 * Tile kinds. A kind is a short string: a suit letter and a rank.
 *   p Dots (筒), s Bamboo (條), m Characters (萬): ranks 1-9
 *   w Winds: 1-4 = East South West North
 *   d Dragons: 1-3 = Red Green White
 *   f Flowers: 1-4 = Plum Orchid Chrysanthemum Bamboo (bonus faces)
 *   q Seasons: 1-4 = Spring Summer Autumn Winter (bonus faces)
 */
export type Suit = 'p' | 's' | 'm' | 'w' | 'd' | 'f' | 'q';
export type SuitedSuit = 'p' | 's' | 'm';
export type TileKind = string;

export const SUITED: readonly SuitedSuit[] = ['p', 's', 'm'];
export const RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const WINDS: readonly TileKind[] = ['w1', 'w2', 'w3', 'w4'];
export const DRAGONS: readonly TileKind[] = ['d1', 'd2', 'd3'];
export const HONOURS: readonly TileKind[] = [...WINDS, ...DRAGONS];
export const FLOWERS: readonly TileKind[] = ['f1', 'f2', 'f3', 'f4'];
export const SEASONS: readonly TileKind[] = ['q1', 'q2', 'q3', 'q4'];
export const BONUS_KINDS: readonly TileKind[] = [...FLOWERS, ...SEASONS];

/** Every kind a die face can show, in book order. */
export const ALL_KINDS: readonly TileKind[] = [
  ...SUITED.flatMap((s) => RANKS.map((r) => `${s}${r}`)),
  ...HONOURS,
  ...BONUS_KINDS,
];

export const SUIT_NAMES: Record<Suit, string> = {
  p: 'Dots',
  s: 'Bamboo',
  m: 'Characters',
  w: 'Wind',
  d: 'Dragon',
  f: 'Flower',
  q: 'Season',
};

export const KIND_NAMES: Record<string, string> = {
  w1: 'East Wind',
  w2: 'South Wind',
  w3: 'West Wind',
  w4: 'North Wind',
  d1: 'Red Dragon',
  d2: 'Green Dragon',
  d3: 'White Dragon',
  f1: 'Plum',
  f2: 'Orchid',
  f3: 'Chrysanthemum',
  f4: 'Bamboo flower',
  q1: 'Spring',
  q2: 'Summer',
  q3: 'Autumn',
  q4: 'Winter',
};

/** What an honour tile is worth in chips (a suited tile is worth its rank). */
export const HONOUR_CHIPS = 10;
