import type { ShapeId } from './shapes';
import type { TileKind } from './tiles';

/**
 * The dice. A template lists its faces as tokens, so one template makes many dice:
 *   'S+2'  the die's suit, two ranks above its base       (S and T are two different suits)
 *   'T+0'  the die's second suit, at its base
 *   'w1'   a fixed tile
 *   'H'    a random honour (wind or dragon), 'F' a random flower, 'Q' a random season
 * The base rank is chosen so every face fits in 1-9. *tune*
 */
export interface DieTemplate {
  readonly id: string;
  readonly name: string;
  readonly shape: ShapeId;
  readonly price: number;
  readonly faces: readonly string[];
  /** Offered by the shop and the hosts' gifts (the starting dice are not). */
  readonly offered: boolean;
  /** Gifts lean towards these. */
  readonly gift?: boolean;
}

const runOf = (n: number, suit = 'S'): string[] =>
  Array.from({ length: n }, (_, i) => `${suit}+${i}`);

const list: DieTemplate[] = [
  // ---- long dice: four faces
  {
    id: 'runStick',
    name: 'Run stick',
    shape: 'long',
    price: 4,
    faces: runOf(4),
    offered: true,
  },
  {
    id: 'twinStick',
    name: 'Twin stick',
    shape: 'long',
    price: 4,
    faces: ['S+0', 'S+0', 'S+1', 'S+1'],
    offered: true,
  },
  {
    id: 'windStick',
    name: 'Wind stick',
    shape: 'long',
    price: 4,
    faces: ['w1', 'w2', 'w3', 'w4'],
    offered: true,
  },
  {
    id: 'dragonStick',
    name: 'Dragon stick',
    shape: 'long',
    price: 5,
    faces: ['d1', 'd2', 'd3', 'd1'],
    offered: true,
    gift: true,
  },
  // ---- cubes
  {
    id: 'suitCube',
    name: 'Suit cube',
    shape: 'd6',
    price: 5,
    faces: runOf(6),
    offered: true,
  },
  {
    id: 'twinCube',
    name: 'Twin cube',
    shape: 'd6',
    price: 5,
    faces: ['S+0', 'S+0', 'S+1', 'S+1', 'S+2', 'S+2'],
    offered: true,
  },
  {
    id: 'tripleCube',
    name: 'Triple cube',
    shape: 'd6',
    price: 5,
    faces: ['S+0', 'S+0', 'S+0', 'S+2', 'S+2', 'S+2'],
    offered: true,
    gift: true,
  },
  {
    id: 'twoSuitCube',
    name: 'Two-suit cube',
    shape: 'd6',
    price: 5,
    faces: ['S+0', 'S+1', 'S+2', 'T+0', 'T+1', 'T+2'],
    offered: true,
  },
  {
    id: 'dragonCube',
    name: 'Dragon cube',
    shape: 'd6',
    price: 5,
    faces: ['d1', 'd1', 'd2', 'd2', 'd3', 'd3'],
    offered: true,
    gift: true,
  },
  {
    id: 'windCube',
    name: 'Wind cube',
    shape: 'd6',
    price: 5,
    faces: ['w1', 'w2', 'w3', 'w4', 'H', 'H'],
    offered: true,
  },
  {
    id: 'terminalCube',
    name: 'Terminal cube',
    shape: 'd6',
    price: 5,
    faces: ['p1', 'p9', 's1', 's9', 'm1', 'm9'],
    offered: true,
  },
  // ---- eight faces
  {
    id: 'runEight',
    name: 'Long run',
    shape: 'd8',
    price: 6,
    faces: runOf(8),
    offered: true,
  },
  {
    id: 'gardenEight',
    name: 'Garden die',
    shape: 'd8',
    price: 6,
    faces: [...runOf(6), 'F', 'Q'],
    offered: true,
    gift: true,
  },
  {
    id: 'honourEight',
    name: 'Honour die',
    shape: 'd8',
    price: 6,
    faces: ['w1', 'w2', 'w3', 'w4', 'd1', 'd2', 'd3', 'Q'],
    offered: true,
    gift: true,
  },
  // ---- twelve faces
  {
    id: 'fullSuit',
    name: 'Whole suit',
    shape: 'd12',
    price: 7,
    faces: [...runOf(9), 'H', 'F', 'Q'],
    offered: true,
    gift: true,
  },
  {
    id: 'courtTwelve',
    name: 'Court die',
    shape: 'd12',
    price: 7,
    faces: ['w1', 'w2', 'w3', 'w4', 'd1', 'd2', 'd3', 'w1', 'd1', 'd2', 'F', 'Q'],
    offered: true,
    gift: true,
  },
];

export const DIE_TEMPLATES: Record<string, DieTemplate> = Object.fromEntries(
  list.map((t) => [t.id, t]),
);
export const OFFERED_TEMPLATES: readonly string[] = list.filter((t) => t.offered).map((t) => t.id);
export const GIFT_TEMPLATES: readonly string[] = list.filter((t) => t.gift).map((t) => t.id);

/**
 * The starting cup. *tune* (`docs/balance/` has the starting kits the simulator compared.)
 */
export interface FixedDie {
  readonly name: string;
  readonly shape: ShapeId;
  readonly faces: readonly TileKind[];
}

export const STARTING_KITS: Record<string, readonly FixedDie[]> = {
  // Six bone cubes, each half Bamboo and half Dots, staggered so every run from 1 to 8 is there.
  // Chicken hands take about 10 rolls; nothing comes free.
  bone: [
    { name: 'Bone cube I', shape: 'd6', faces: ['s1', 's2', 's3', 'p4', 'p5', 'p6'] },
    { name: 'Bone cube II', shape: 'd6', faces: ['s2', 's3', 's4', 'p5', 'p6', 'p7'] },
    { name: 'Bone cube III', shape: 'd6', faces: ['s3', 's4', 's5', 'p6', 'p7', 'p8'] },
    { name: 'Bone cube IV', shape: 'd6', faces: ['s4', 's5', 's6', 'p1', 'p2', 'p3'] },
    { name: 'Bone cube V', shape: 'd6', faces: ['s5', 's6', 's7', 'p2', 'p3', 'p4'] },
    { name: 'Bone cube VI', shape: 'd6', faces: ['s6', 's7', 's8', 'p3', 'p4', 'p5'] },
  ],
};

export const STARTING_KIT = 'bone';
