export type SetKind = 'single' | 'pair' | 'chow' | 'pong' | 'kong' | 'winds';

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

export const SET_ORDER: readonly SetKind[] = ['kong', 'winds', 'pong', 'chow', 'pair', 'single'];

/** Sets an almanac page can level up. The simulator's pool: Four Winds has a level-up in the
 *  design but no page rolls it until the planner decides. */
export const ALMANAC_POOL: readonly SetKind[] = ['chow', 'pong', 'pair', 'kong'];

export const ALMANAC_PRICE = 3;
