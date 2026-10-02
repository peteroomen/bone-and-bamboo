/**
 * The eight hosts: each round is hosted by its wind tile, which blows calm or storm, and each changes one rule for its
 * round. A twist is data here; the engine interprets it (src/engine/twists.ts), with no host
 * special-cased in the rules. All numbers are *tune* (docs/design.md).
 */
export type Twist =
  | {
      /** The tile under each stack top is hidden; tiles played that were taken while hidden give mult. */
      readonly id: 'masked';
      readonly mult: number;
    }
  | {
      /** Stacks are locked until a chow is played; chows score double chips. */
      readonly id: 'coil';
      readonly lockedStacks: number;
      readonly chowChipsX: number;
    }
  | {
      /** After every nth play two stack tops swap; once a round the player may swap two. */
      readonly id: 'swaps';
      readonly every: number;
      readonly playerSwaps: number;
    }
  | {
      /** Some wall tiles burn: a set containing one gives mult, or it burns away if left on a top. */
      readonly id: 'embers';
      readonly burning: number;
      readonly mult: number;
      readonly turns: number;
    }
  | {
      /** A bigger hand, but discarded tiles go back to the bottom of a random stack. */
      readonly id: 'moonTide';
      readonly hand: number;
    }
  | {
      /** Pongs and kongs score double chips; chows score half. */
      readonly id: 'claws';
      readonly bigChipsX: number;
      readonly chowChipsX: number;
    }
  | {
      /** Each discard costs points at the end; finish with none used for ×mult. */
      readonly id: 'report';
      readonly discardCost: number;
      readonly noDiscardX: number;
    }
  | {
      /** Fewer stacks, armoured tops until a pong or kong; kongs +mult. */
      readonly id: 'shell';
      readonly stacks: number;
      readonly kongMult: number;
    };

export interface Host {
  /** The twist's id (the old spirit names, kept as ids only). */
  readonly id: string;
  /** 0-3: East, South, West, North. */
  readonly wind: number;
  /** Calm (a gentle twist) or storm (a sharper one, a harder target, a bigger gift). */
  readonly storm: boolean;
  /** The wind tile that hosts the round: w1-w4. */
  readonly tile: string;
  /** The twist's name. */
  readonly title: string;
  readonly twistText: string;
  readonly twist: Twist;
}

export const HOSTS: readonly Host[] = [
  {
    id: 'fox',
    wind: 0,
    storm: false,
    tile: 'w1',
    title: 'Masked',
    twistText:
      'The tile under each stack top is hidden. Each tile you play that you took while it was hidden gives +2 mult.',
    twist: { id: 'masked', mult: 2 },
  },
  {
    id: 'azureDragon',
    wind: 0,
    storm: true,
    tile: 'w1',
    title: 'The coil',
    twistText: 'One stack is locked until you play a chow. Chows score double chips.',
    twist: { id: 'coil', lockedStacks: 1, chowChipsX: 2 },
  },
  {
    id: 'monkey',
    wind: 1,
    storm: false,
    tile: 'w2',
    title: 'Swaps',
    twistText:
      'After every 2nd play two stack tops swap. Once a round you may swap two stack tops yourself.',
    twist: { id: 'swaps', every: 2, playerSwaps: 1 },
  },
  {
    id: 'vermilionBird',
    wind: 1,
    storm: true,
    tile: 'w2',
    title: 'Embers',
    twistText:
      '3 tiles in the wall are burning. Play a set with one for +3 mult, or it burns away after 2 turns on a stack top.',
    twist: { id: 'embers', burning: 3, mult: 3, turns: 2 },
  },
  {
    id: 'rabbit',
    wind: 2,
    storm: false,
    tile: 'w3',
    title: 'Moon tide',
    twistText: 'Hand size +1, but discarded tiles go back to the bottom of a random stack.',
    twist: { id: 'moonTide', hand: 1 },
  },
  {
    id: 'whiteTiger',
    wind: 2,
    storm: true,
    tile: 'w3',
    title: 'Claws',
    twistText: 'Pongs and kongs score double chips. Chows score half.',
    twist: { id: 'claws', bigChipsX: 2, chowChipsX: 0.5 },
  },
  {
    id: 'kitchenGod',
    wind: 3,
    storm: false,
    tile: 'w4',
    title: 'The report',
    twistText: 'Each discard costs 25 points at the end. Finish with no discards used for ×2 mult.',
    twist: { id: 'report', discardCost: 25, noDiscardX: 2 },
  },
  {
    id: 'blackTortoise',
    wind: 3,
    storm: true,
    tile: 'w4',
    title: 'The shell',
    twistText:
      '6 stacks instead of 8. The top tile of each stack is armoured until you play a pong or kong. Kongs +4 mult.',
    twist: { id: 'shell', stacks: 6, kongMult: 4 },
  },
];

export function hostFor(wind: number, storm: boolean): Host {
  const h = HOSTS.find((x) => x.wind === wind && x.storm === storm);
  if (!h) throw new Error(`No host for wind ${wind}`);
  return h;
}

export function hostById(id: string): Host {
  const h = HOSTS.find((x) => x.id === id);
  if (!h) throw new Error(`Unknown host ${id}`);
  return h;
}
