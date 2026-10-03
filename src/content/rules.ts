/** The round, the money and the teahouse: every number from docs/design.md. */

/**
 * How the hand refills. `pile`: from a face-down pile, on its own (docs/work/2026-10-02-draw-pile.md).
 * `wall`: from this wind's side of a brick wall, a tap at a time (docs/work/2026-10-02-brick-wall.md).
 */
export type DrawMode = 'pile' | 'wall';
export const DRAW_MODES: readonly DrawMode[] = ['pile', 'wall'];

export interface DrawRules {
  readonly name: string;
  readonly text: string;
  readonly hand: number;
  readonly discards: number;
  /** Lantern 1 targets for the four rounds. */
  readonly targets: readonly number[];
  /** wall: rows of the side, top first; the widths alternate width - 1, width. */
  readonly wallRows: number;
  readonly wallWidth: number;
}

export const DRAW: Readonly<Record<DrawMode, DrawRules>> = {
  pile: {
    name: 'Pile',
    text: 'Your hand refills on its own from a face-down pile.',
    hand: 12,
    discards: 4,
    targets: [1000, 4000, 9000, 18000],
    wallRows: 0,
    wallWidth: 0,
  },
  wall: {
    name: 'Brick wall',
    text: 'Each wind is a side of the wall. Take a tile once both on top of it are gone.',
    hand: 10,
    discards: 3,
    targets: [1000, 4200, 9500, 19000],
    wallRows: 4,
    wallWidth: 8,
  },
};

export const ROUND = {
  hand: 12,
  /** The set is one face-down pile; the hand refills from its top. */
  stacks: 1,
  /** Tiles of the pile shown face up (the Lantern). */
  peek: 0,
  plays: 5,
  discards: 4,
  maxDiscard: 5,
  /** Sets one play may hold: any number (pick tiles that split into sets, three pairs say). */
  setsPerPlay: 99,
} as const;

export const MONEY = {
  start: 4,
  /** Paid after rounds 1-3. */
  rewards: [10, 12, 14] as readonly number[],
  perUnusedDiscard: 1,
  /** $1 per this much held, up to the cap. */
  interestPer: 5,
  interestCap: 5,
} as const;

export const SHOP = {
  dragons: 3,
  almanac: 2,
  fortunes: 2,
  rerollBase: 2,
  rerollStep: 1,
  burnPrice: 5,
  /** A sold dragon fetches this fraction of its price, rounded down. */
  sellFraction: 0.5,
} as const;

export const GIFT = {
  calmOffers: 2,
  stormOffers: 3,
  stormMoney: 5,
} as const;

/** The four winds of a run. */
export const WIND_NAMES = ['East', 'South', 'West', 'North'] as const;
export const SEASON_NAMES = ['spring', 'summer', 'autumn', 'winter'] as const;
