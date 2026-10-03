/**
 * The eight hosts: each round is hosted by its wind tile, which blows calm or storm, and each changes one rule for its
 * round. A twist is data here; the engine interprets it (src/engine/twists.ts), with no host
 * special-cased in the rules. All numbers are *tune* (docs/design.md).
 */
export type Twist =
  | {
      /** A smaller hand; each set of 3 or more tiles gives mult. */
      readonly id: 'masked';
      readonly hand: number;
      readonly mult: number;
    }
  | {
      /** No discarding until a run is played; runs score double chips. */
      readonly id: 'coil';
      readonly chowChipsX: number;
    }
  | {
      /** After every nth play a random hand tile goes back into the pile and is redrawn; the player may do it once. */
      readonly id: 'swaps';
      readonly every: number;
      readonly playerSwaps: number;
    }
  | {
      /** Some tiles in the set burn: a set containing one gives mult; one held too long burns away. */
      readonly id: 'embers';
      readonly burning: number;
      readonly mult: number;
      readonly turns: number;
    }
  | {
      /** A bigger hand, but discarded tiles are shuffled back into the pile. */
      readonly id: 'moonTide';
      readonly hand: number;
    }
  | {
      /** Pongs and kongs score double chips. */
      readonly id: 'claws';
      readonly bigChipsX: number;
    }
  | {
      /** Each discard costs points at the end; finish with none used for ×mult. */
      readonly id: 'report';
      readonly discardCost: number;
      readonly noDiscardX: number;
    }
  | {
      /** The first hand is armoured (no discarding it) until any set is played; kongs +mult. */
      readonly id: 'shell';
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
  /** This storm's target multiplier, where it differs from the usual storm's (planner tuning). */
  readonly targetMult?: number;
}

export const HOSTS: readonly Host[] = [
  {
    id: 'fox',
    wind: 0,
    storm: false,
    tile: 'w1',
    title: 'Masked',
    twistText: 'Hand size −1. Each set of 3 or more tiles gives +1 mult.',
    twist: { id: 'masked', hand: -1, mult: 1 },
  },
  {
    id: 'azureDragon',
    wind: 0,
    storm: true,
    tile: 'w1',
    title: 'The coil',
    twistText: 'No discarding until you play a run. Runs score double chips.',
    twist: { id: 'coil', chowChipsX: 2 },
  },
  {
    id: 'monkey',
    wind: 1,
    storm: false,
    tile: 'w2',
    title: 'Swaps',
    twistText:
      'After every 2nd play a random tile in your hand is swapped for a new one. Once a round you may swap a tile yourself.',
    twist: { id: 'swaps', every: 2, playerSwaps: 1 },
  },
  {
    id: 'vermilionBird',
    wind: 1,
    storm: true,
    tile: 'w2',
    title: 'Embers',
    twistText:
      '4 tiles in your set are burning. Play a set with one for +4 mult, or it burns away after 2 turns in your hand.',
    twist: { id: 'embers', burning: 4, mult: 4, turns: 2 },
  },
  {
    id: 'rabbit',
    wind: 2,
    storm: false,
    tile: 'w3',
    title: 'Moon tide',
    twistText: 'Hand size +1, but discarded tiles are shuffled back into the pile.',
    twist: { id: 'moonTide', hand: 1 },
  },
  {
    id: 'whiteTiger',
    wind: 2,
    storm: true,
    tile: 'w3',
    title: 'Claws',
    twistText: 'Pongs and kongs score double chips.',
    twist: { id: 'claws', bigChipsX: 2 },
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
    targetMult: 1.25,
    twistText: 'Your first hand is armoured: no discarding it until you play a set. Kongs +4 mult.',
    twist: { id: 'shell', kongMult: 4 },
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
