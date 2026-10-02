/**
 * Tile kinds. A kind is a short string: a suit letter and a rank.
 *   p Dots (筒), s Bamboo (條), m Characters (萬): ranks 1-9
 *   w Winds: 1-4 = East South West North
 */
export type Suit = 'p' | 's' | 'm' | 'w';
export type SuitedSuit = 'p' | 's' | 'm';
export type TileKind = string;

export const SUITED: readonly SuitedSuit[] = ['p', 's', 'm'];
export const RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const WINDS: readonly TileKind[] = ['w1', 'w2', 'w3', 'w4'];
/** Honours are the four winds. The dragon tiles are the jokers (src/content/dragons.ts), not in play. */
export const HONOURS: readonly TileKind[] = WINDS;

export const SUIT_NAMES: Record<Suit, string> = {
  p: 'Dots',
  s: 'Bamboo',
  m: 'Characters',
  w: 'Winds',
};

export const HONOUR_NAMES: Record<string, string> = {
  w1: 'East',
  w2: 'South',
  w3: 'West',
  w4: 'North',
};

/** What an honour tile is worth in chips (a suited tile is worth its rank). */
export const HONOUR_CHIPS = 10;
