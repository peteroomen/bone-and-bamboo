/** Lantern 1 targets for the four rounds. */
export const TARGETS: readonly number[] = [1000, 3600, 8000, 16000];

export interface Lantern {
  readonly level: number;
  readonly targetMult: number;
  readonly interest: boolean;
  /** Replaces the base discards when lower. */
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
    discards: 3,
    text: 'Targets ×1.5. No interest. 3 discards.',
  },
];

/** The great storm's target, against the folk spirit's. */
export const STORM_TARGET_MULT = 1.5;
