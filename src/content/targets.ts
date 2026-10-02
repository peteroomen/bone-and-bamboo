import { DRAW } from './rules';

/** Lantern 1 targets for the four rounds (the pile's; each draw mode has its own in DRAW). */
export const TARGETS: readonly number[] = DRAW.pile.targets;

export interface Lantern {
  readonly level: number;
  readonly targetMult: number;
  readonly interest: boolean;
  /** Added to the discards (a negative number takes some away). */
  readonly discards?: number;
  readonly text: string;
}

export const LANTERNS: readonly Lantern[] = [
  { level: 1, targetMult: 1, interest: true, text: 'The base game.' },
  { level: 2, targetMult: 1.25, interest: true, text: 'Targets ×1.25.' },
  { level: 3, targetMult: 1.25, interest: false, text: 'Targets ×1.25. No interest.' },
  {
    level: 4,
    targetMult: 1.5,
    interest: false,
    discards: -1,
    text: 'Targets ×1.5. No interest. One discard fewer.',
  },
];

/** The great storm's target, against the folk spirit's. */
export const STORM_TARGET_MULT = 1.5;
