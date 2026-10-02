import type { SuitedSuit, TileKind } from './tiles';

export interface TileSetDef {
  readonly id: string;
  readonly name: string;
  readonly text: string;
  readonly suits: readonly SuitedSuit[];
  readonly copies: number;
  /** Extra honours in the starting set: kind -> copies. */
  readonly honours: Readonly<Record<TileKind, number>>;
  readonly hand?: number;
  readonly discards?: number;
  readonly unlock:
    | { readonly kind: 'start' }
    | { readonly kind: 'win' }
    | { readonly kind: 'hosts'; readonly n: number };
}

export const TILE_SETS: readonly TileSetDef[] = [
  {
    id: 'boneBamboo',
    name: 'Bone & Bamboo',
    text: 'Three suits, 1-9, three copies each: 81 tiles.',
    suits: ['p', 's', 'm'],
    copies: 3,
    honours: {},
    unlock: { kind: 'start' },
  },
  {
    id: 'twoRivers',
    name: 'Two Rivers',
    text: 'Dots and Bamboo only, four copies, and two of each dragon.',
    suits: ['p', 's'],
    copies: 4,
    honours: { d1: 2, d2: 2, d3: 2 },
    unlock: { kind: 'win' },
  },
  {
    id: 'jadeCourt',
    name: 'Jade Court',
    text: 'The 81, with a hand of 9 and 2 discards.',
    suits: ['p', 's', 'm'],
    copies: 3,
    honours: {},
    hand: 9,
    discards: 2,
    unlock: { kind: 'hosts', n: 3 },
  },
];

export const TILE_SET_IDS: readonly string[] = TILE_SETS.map((t) => t.id);
export function tileSetDef(id: string): TileSetDef {
  const t = TILE_SETS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tile set ${id}`);
  return t;
}
