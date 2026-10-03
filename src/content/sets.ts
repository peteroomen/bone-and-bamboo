export type SetKind = 'single' | 'pair' | 'chow' | 'run4' | 'run5' | 'pong' | 'kong' | 'winds';

/** Runs: three, four or five in a row of one suit. */
export const RUN_KINDS: readonly SetKind[] = ['chow', 'run4', 'run5'];

export interface SetType {
  readonly id: SetKind;
  readonly name: string;
  readonly chips: number;
  readonly mult: number;
  /** What one almanac page adds. */
  readonly levelChips: number;
  readonly levelMult: number;
  readonly tiles: number;
  readonly blurb: string;
}

export const SET_TYPES: Record<SetKind, SetType> = {
  single: {
    id: 'single',
    name: 'Single',
    chips: 5,
    mult: 0,
    levelChips: 0,
    levelMult: 0,
    tiles: 1,
    blurb: 'One tile, when you hold no set and have no discards.',
  },
  pair: {
    id: 'pair',
    name: 'Pair',
    chips: 5,
    mult: 1,
    levelChips: 5,
    levelMult: 1,
    tiles: 2,
    blurb: 'Two alike.',
  },
  chow: {
    id: 'chow',
    name: 'Chow',
    chips: 10,
    mult: 1,
    levelChips: 10,
    levelMult: 1,
    tiles: 3,
    blurb: 'Three in a row, one suit.',
  },
  run4: {
    id: 'run4',
    name: 'Four in a row',
    chips: 25,
    mult: 2,
    levelChips: 15,
    levelMult: 1,
    tiles: 4,
    blurb: 'Four in a row, one suit.',
  },
  run5: {
    id: 'run5',
    name: 'Five in a row',
    chips: 50,
    mult: 3,
    levelChips: 20,
    levelMult: 2,
    tiles: 5,
    blurb: 'Five in a row, one suit.',
  },
  pong: {
    id: 'pong',
    name: 'Pong',
    chips: 40,
    mult: 4,
    levelChips: 15,
    levelMult: 2,
    tiles: 3,
    blurb: 'Three alike.',
  },
  kong: {
    id: 'kong',
    name: 'Kong',
    chips: 100,
    mult: 8,
    levelChips: 30,
    levelMult: 3,
    tiles: 4,
    blurb: 'Four alike.',
  },
  winds: {
    id: 'winds',
    name: 'Four Winds',
    chips: 100,
    mult: 10,
    levelChips: 30,
    levelMult: 3,
    tiles: 4,
    blurb: 'One of each wind.',
  },
};

export const SET_ORDER: readonly SetKind[] = [
  'kong',
  'winds',
  'run5',
  'pong',
  'run4',
  'chow',
  'pair',
  'single',
];

/** Sets an almanac page can level up. The simulator's pool: Four Winds has a level-up in the
 *  design but no page rolls it until the planner decides. */
export const ALMANAC_POOL: readonly SetKind[] = ['chow', 'pong', 'pair', 'kong'];

export const ALMANAC_PRICE = 3;
