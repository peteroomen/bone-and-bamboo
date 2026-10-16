/**
 * The four winds host the run. Each wind plays two rounds: a plain one, then the host's own
 * round with a twist (one rule changes) and a gift of dice afterwards. Twists are data: the
 * engine reads these fields, never the ids. *tune*
 */
export interface Twist {
  readonly id: string;
  readonly name: string;
  readonly text: string;
  /** Hold at most this many dice. */
  readonly holdLimit?: number;
  /** Added to the round's rolls. */
  readonly rolls?: number;
  /** Rolls given back each time you finish a hand. */
  readonly rollsPerHand?: number;
  /** After each finished hand, this many random faces on your dice go blank for the round. */
  readonly blankPerHand?: number;
  /** A die you held for a roll can't be held for the next one. */
  readonly frost?: boolean;
}

export interface Host {
  readonly wind: 1 | 2 | 3 | 4;
  readonly name: string;
  readonly season: string;
  readonly twist: Twist;
}

export const HOSTS: readonly Host[] = [
  {
    wind: 1,
    name: 'East',
    season: 'Spring',
    twist: {
      id: 'gusts',
      name: 'Gusts',
      text: 'You can hold at most two dice.',
      holdLimit: 2,
    },
  },
  {
    wind: 2,
    name: 'South',
    season: 'Summer',
    twist: {
      id: 'heat',
      name: 'Summer heat',
      text: '4 fewer rolls, but every finished hand gives 2 back.',
      rolls: -4,
      rollsPerHand: 2,
    },
  },
  {
    wind: 3,
    name: 'West',
    season: 'Autumn',
    twist: {
      id: 'leaves',
      name: 'Falling leaves',
      text: 'Each finished hand blanks a random face on your dice for the rest of the round.',
      blankPerHand: 1,
    },
  },
  {
    wind: 4,
    name: 'North',
    season: 'Winter',
    twist: {
      id: 'frost',
      name: 'Frost',
      text: 'A die you held can’t be held again on the next roll.',
      frost: true,
    },
  },
];

export function hostOf(wind: number): Host {
  const h = HOSTS[wind - 1];
  if (!h) throw new Error(`no host for wind ${wind}`);
  return h;
}
