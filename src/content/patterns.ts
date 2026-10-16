import type { TileKind } from './tiles';

/**
 * Hands. Every finished hand is at least a Chicken hand; on top of that it scores every pattern
 * it fits, each one multiplying the mult. Hand pages level a pattern up: the Chicken hand gains
 * chips and mult, the others gain `step` on their ×mult. The rules for each id live in
 * src/engine/patterns.ts; the numbers live here. *tune*
 */
export type PatternId =
  | 'chicken'
  | 'allChows'
  | 'allPongs'
  | 'halfFlush'
  | 'fullFlush'
  | 'allSimples'
  | 'outside'
  | 'pureStraight'
  | 'mixedChow'
  | 'triplePong'
  | 'sevenPairs'
  | 'littleDragons'
  | 'bigDragons'
  | 'littleWinds'
  | 'bigWinds'
  | 'allHonours'
  | 'allTerminals'
  | 'nineGates';

export interface PatternDef {
  readonly id: PatternId;
  readonly name: string;
  readonly text: string;
  /** ×mult when the hand fits (the Chicken hand has none: it adds chips and mult instead). */
  readonly xmult: number;
  /** Added to xmult per level. */
  readonly step: number;
  /** A finished example, for the hand book: sets as lists of kinds. */
  readonly example: readonly (readonly TileKind[])[];
  /** Patterns this one replaces when both fit. */
  readonly excludes?: readonly PatternId[];
}

/** The Chicken hand: any four sets and a pair. Its level adds chips and mult. */
export const CHICKEN = { chips: 20, mult: 2, levelChips: 15, levelMult: 1 } as const;

/** Value sets: a pong or kong of the round's wind, or of a dragon. */
export const VALUE_SETS = { roundWind: 2, dragon: 1.5 } as const;

const ex = (s: string): TileKind[][] => s.split(' ').map((g) => g.split(','));

export const PATTERNS: readonly PatternDef[] = [
  {
    id: 'chicken',
    name: 'Chicken hand',
    text: 'Any four sets and a pair.',
    xmult: 1,
    step: 0,
    example: ex('s2,s3,s4 p5,p5,p5 m6,m7,m8 s7,s8,s9 p1,p1'),
  },
  {
    id: 'allChows',
    name: 'All Chows',
    text: 'Four chows and a pair.',
    xmult: 1.25,
    step: 0.25,
    example: ex('s1,s2,s3 p4,p5,p6 m3,m4,m5 s6,s7,s8 m9,m9'),
  },
  {
    id: 'allSimples',
    name: 'All Simples',
    text: 'No 1s, no 9s, no honours.',
    xmult: 1.25,
    step: 0.25,
    example: ex('s2,s3,s4 p5,p5,p5 m6,m7,m8 s6,s7,s8 p2,p2'),
  },
  {
    id: 'halfFlush',
    name: 'Half Flush',
    text: 'One suit, plus honours.',
    xmult: 1.5,
    step: 0.5,
    example: ex('s1,s2,s3 s5,s5,s5 w1,w1,w1 s6,s7,s8 d1,d1'),
  },
  {
    id: 'outside',
    name: 'Outside Hand',
    text: 'Every set and the pair hold a 1, a 9 or an honour.',
    xmult: 2,
    step: 0.5,
    example: ex('s1,s2,s3 p9,p9,p9 m7,m8,m9 w2,w2,w2 p1,p1'),
  },
  {
    id: 'mixedChow',
    name: 'Mixed Triple Chow',
    text: 'The same chow in all three suits.',
    xmult: 2.5,
    step: 0.5,
    example: ex('p3,p4,p5 s3,s4,s5 m3,m4,m5 s7,s7,s7 m1,m1'),
  },
  {
    id: 'allPongs',
    name: 'All Pongs',
    text: 'Four pongs or kongs and a pair.',
    xmult: 2.5,
    step: 0.5,
    example: ex('s2,s2,s2 p5,p5,p5 m8,m8,m8 w1,w1,w1 s9,s9'),
  },
  {
    id: 'sevenPairs',
    name: 'Seven Pairs',
    text: 'Seven different pairs.',
    xmult: 1.5,
    step: 0.5,
    example: ex('s2,s2 s5,s5 p3,p3 p7,p7 m1,m1 m6,m6 w4,w4'),
  },
  {
    id: 'pureStraight',
    name: 'Pure Straight',
    text: '1-2-3, 4-5-6 and 7-8-9 of one suit.',
    xmult: 3,
    step: 1,
    example: ex('s1,s2,s3 s4,s5,s6 s7,s8,s9 p6,p6,p6 m2,m2'),
  },
  {
    id: 'fullFlush',
    name: 'Full Flush',
    text: 'Every tile from one suit.',
    xmult: 2,
    step: 0.5,
    example: ex('s1,s2,s3 s4,s4,s4 s5,s6,s7 s8,s8,s8 s9,s9'),
    excludes: ['halfFlush'],
  },
  {
    id: 'triplePong',
    name: 'Triple Pong',
    text: 'The same number as a pong in all three suits.',
    xmult: 4,
    step: 1,
    example: ex('p6,p6,p6 s6,s6,s6 m6,m6,m6 s2,s3,s4 w3,w3'),
  },
  {
    id: 'littleDragons',
    name: 'Little Three Dragons',
    text: 'Two dragon pongs and a pair of the third dragon.',
    xmult: 4,
    step: 1,
    example: ex('d1,d1,d1 d2,d2,d2 s4,s5,s6 p8,p8,p8 d3,d3'),
  },
  {
    id: 'bigDragons',
    name: 'Big Three Dragons',
    text: 'A pong of each dragon.',
    xmult: 8,
    step: 2,
    example: ex('d1,d1,d1 d2,d2,d2 d3,d3,d3 m2,m3,m4 s5,s5'),
    excludes: ['littleDragons'],
  },
  {
    id: 'littleWinds',
    name: 'Little Four Winds',
    text: 'Three wind pongs and a pair of the fourth wind.',
    xmult: 6,
    step: 2,
    example: ex('w1,w1,w1 w2,w2,w2 w3,w3,w3 p4,p5,p6 w4,w4'),
  },
  {
    id: 'bigWinds',
    name: 'Big Four Winds',
    text: 'A pong of every wind.',
    xmult: 12,
    step: 3,
    example: ex('w1,w1,w1 w2,w2,w2 w3,w3,w3 w4,w4,w4 s5,s5'),
    excludes: ['littleWinds'],
  },
  {
    id: 'allHonours',
    name: 'All Honours',
    text: 'Only winds and dragons.',
    xmult: 8,
    step: 2,
    example: ex('w1,w1,w1 w3,w3,w3 d1,d1,d1 d2,d2,d2 w4,w4'),
    excludes: ['outside'],
  },
  {
    id: 'allTerminals',
    name: 'All Terminals',
    text: 'Only 1s and 9s.',
    xmult: 8,
    step: 2,
    example: ex('s1,s1,s1 s9,s9,s9 p1,p1,p1 m9,m9,m9 p9,p9'),
    excludes: ['outside'],
  },
  {
    id: 'nineGates',
    name: 'Nine Gates',
    text: '1-1-1, 2 to 8, 9-9-9 of one suit, plus one more of that suit.',
    xmult: 20,
    step: 5,
    example: ex('s1,s1,s1 s2,s3,s4 s5,s6,s7 s9,s9,s9 s8,s8'),
    excludes: ['fullFlush'],
  },
];

export const PATTERN_BY_ID: Record<PatternId, PatternDef> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p]),
) as Record<PatternId, PatternDef>;
