/**
 * The eight hosts: each wind has a folk spirit and a great beast, and each changes one rule for its
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
  readonly id: string;
  /** 0-3: East, South, West, North. */
  readonly wind: number;
  readonly beast: boolean;
  readonly name: string;
  readonly title: string;
  readonly colour: string;
  readonly twistText: string;
  readonly twist: Twist;
}

export const HOSTS: readonly Host[] = [
  {
    id: 'fox',
    wind: 0,
    beast: false,
    name: 'Fox spirit',
    title: 'Masked',
    colour: '#d9843a',
    twistText:
      'The tile under each stack top is hidden. Each tile you play that you took while it was hidden gives +2 mult.',
    twist: { id: 'masked', mult: 2 },
  },
  {
    id: 'azure',
    wind: 0,
    beast: true,
    name: 'Azure Dragon',
    title: 'The coil',
    colour: '#3a78b8',
    twistText: 'One stack is locked until you play a chow. Chows score double chips.',
    twist: { id: 'coil', lockedStacks: 1, chowChipsX: 2 },
  },
  {
    id: 'monkey',
    wind: 1,
    beast: false,
    name: 'Monkey spirit',
    title: 'Swaps',
    colour: '#c9a23a',
    twistText:
      'After every 2nd play two stack tops swap. Once a round you may swap two stack tops yourself.',
    twist: { id: 'swaps', every: 2, playerSwaps: 1 },
  },
  {
    id: 'vermilion',
    wind: 1,
    beast: true,
    name: 'Vermilion Bird',
    title: 'Embers',
    colour: '#d2391f',
    twistText:
      '3 tiles in the wall are burning. Play a set with one for +3 mult, or it burns away after 2 turns on a stack top.',
    twist: { id: 'embers', burning: 3, mult: 3, turns: 2 },
  },
  {
    id: 'rabbit',
    wind: 2,
    beast: false,
    name: 'Jade Rabbit',
    title: 'Moon tide',
    colour: '#7fbfa0',
    twistText: 'Hand size +1, but discarded tiles go back to the bottom of a random stack.',
    twist: { id: 'moonTide', hand: 1 },
  },
  {
    id: 'tiger',
    wind: 2,
    beast: true,
    name: 'White Tiger',
    title: 'Claws',
    colour: '#d8d2c4',
    twistText: 'Pongs and kongs score double chips. Chows score half.',
    twist: { id: 'claws', bigChipsX: 2, chowChipsX: 0.5 },
  },
  {
    id: 'kitchen',
    wind: 3,
    beast: false,
    name: 'Kitchen God',
    title: 'The report',
    colour: '#a8461c',
    twistText: 'Each discard costs 25 points at the end. Finish with no discards used for ×2 mult.',
    twist: { id: 'report', discardCost: 25, noDiscardX: 2 },
  },
  {
    id: 'tortoise',
    wind: 3,
    beast: true,
    name: 'Black Tortoise',
    title: 'The shell',
    colour: '#3d4a5a',
    twistText:
      '6 stacks instead of 8. The top tile of each stack is armoured until you play a pong or kong. Kongs +4 mult.',
    twist: { id: 'shell', stacks: 6, kongMult: 4 },
  },
];

export function hostFor(wind: number, beast: boolean): Host {
  const h = HOSTS.find((x) => x.wind === wind && x.beast === beast);
  if (!h) throw new Error(`No host for wind ${wind}`);
  return h;
}

export function hostById(id: string): Host {
  const h = HOSTS.find((x) => x.id === id);
  if (!h) throw new Error(`Unknown host ${id}`);
  return h;
}
