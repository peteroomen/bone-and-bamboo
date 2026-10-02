/** The round, the money and the teahouse: every number from docs/design.md. */
export const ROUND = {
  hand: 8,
  stacks: 8,
  /** Tiles you can see under each stack top (as a strip). */
  peek: 1,
  plays: 8,
  discards: 3,
  maxDiscard: 5,
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
