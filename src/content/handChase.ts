/** Preview tuning: standard numbered tiles and winds, never dragon tiles. */
export const CHASE = {
  rack: 16,
  plays: 3,
  exchanges: 8,
  exchangeSize: 5,
  targets: [200, 700, 1200, 1800],
  completeChips: 180,
  completeMult: 4,
  upgradeMult: 2,
  specialistUpgradeMult: 4,
  fallback: { pair: 20, chow: 35, pong: 70, kong: 150 },
} as const;

export const PATTERNS = [
  {
    id: 'complete',
    name: 'Complete hand',
    mult: 0,
    rule: 'Four chows, pongs or kongs and one pair.',
  },
  {
    id: 'sevenPairs',
    name: 'Seven Pairs',
    mult: 2,
    rule: 'Seven pairs of different tile kinds. A kong is not two pairs.',
  },
  {
    id: 'allPongs',
    name: 'All Pongs',
    mult: 4,
    rule: 'A complete hand with four pongs or kongs and a pair.',
  },
  {
    id: 'fullFlush',
    name: 'Full Flush',
    mult: 6,
    rule: 'A complete hand using one numbered suit, without winds.',
  },
  {
    id: 'halfFlush',
    name: 'Half Flush',
    mult: 3,
    rule: 'A complete hand using one numbered suit and at least one wind.',
  },
  {
    id: 'pureStraight',
    name: 'Pure Straight',
    mult: 4,
    rule: 'A complete hand with 123, 456 and 789 chows in one suit.',
  },
  {
    id: 'mixedStraight',
    name: 'Three-colour Straight',
    mult: 3,
    rule: 'A complete hand with the same chow ranks in all three suits.',
  },
  {
    id: 'allSimples',
    name: 'All Simples',
    mult: 1,
    rule: 'A complete hand without 1s, 9s or winds.',
  },
  {
    id: 'windPong',
    name: 'Wind Pongs',
    mult: 1,
    rule: '+1 mult for each wind pong or kong in a complete hand.',
  },
] as const;
export type PatternId = (typeof PATTERNS)[number]['id'];
