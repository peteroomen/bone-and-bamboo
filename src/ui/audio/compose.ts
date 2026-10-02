import type { Rng } from '@/engine/rng';

/**
 * The score, as data: a sparse guzheng and dizi on a pentatonic scale. A scene says which scale,
 * how fast and how busy; `notesAt` turns a step number into the notes to play on it. Pure, so it
 * can be tested without a sound card.
 */
export type SceneKind = 'title' | 'round' | 'shop' | 'over' | 'won';

export interface Scene {
  readonly kind: SceneKind;
  /** 0-3: East, South, West, North (for a round). */
  readonly wind?: number;
}

export interface Mode {
  /** The root, in Hz, of the middle octave. */
  readonly root: number;
  /** Semitones above the root for each of the five scale degrees. */
  readonly degrees: readonly number[];
  readonly bpm: number;
  /** Chance a plucked note falls on a step. */
  readonly pluck: number;
  /** Steps between dizi phrases. */
  readonly dizi: number;
}

const MAJOR_PENT = [0, 2, 4, 7, 9];
const MINOR_PENT = [0, 3, 5, 7, 10];

export function modeFor(scene: Scene): Mode {
  switch (scene.kind) {
    case 'title':
      return { root: 293.66, degrees: MAJOR_PENT, bpm: 60, pluck: 0.5, dizi: 16 };
    case 'shop':
      return { root: 349.23, degrees: MAJOR_PENT, bpm: 50, pluck: 0.4, dizi: 24 };
    case 'over':
      return { root: 220, degrees: MINOR_PENT, bpm: 40, pluck: 0.25, dizi: 32 };
    case 'won':
      return { root: 329.63, degrees: MAJOR_PENT, bpm: 72, pluck: 0.6, dizi: 12 };
    case 'round':
      switch (scene.wind ?? 0) {
        case 0:
          return { root: 293.66, degrees: MAJOR_PENT, bpm: 66, pluck: 0.45, dizi: 16 };
        case 1:
          return { root: 392, degrees: MAJOR_PENT, bpm: 80, pluck: 0.6, dizi: 12 };
        case 2:
          return { root: 220, degrees: MINOR_PENT, bpm: 62, pluck: 0.45, dizi: 16 };
        default:
          return { root: 146.83, degrees: MINOR_PENT, bpm: 46, pluck: 0.3, dizi: 24 };
      }
  }
}

export interface Note {
  readonly inst: 'guzheng' | 'dizi';
  readonly freq: number;
  /** Beats it rings (dizi) or is allowed to ring (guzheng). */
  readonly beats: number;
  readonly vel: number;
}

const degreeFreq = (mode: Mode, degree: number, octave: number): number => {
  const n = mode.degrees.length;
  const oct = octave + Math.floor(degree / n);
  const d = ((degree % n) + n) % n;
  return mode.root * 2 ** ((mode.degrees[d] ?? 0) / 12 + oct);
};

/** The notes on step `step` (a half beat). `walk` is the melody's current degree, moved by `rng`. */
export function notesAt(mode: Mode, step: number, state: { degree: number }, rng: Rng): Note[] {
  const out: Note[] = [];
  if (step % 2 === 0 && rng.next() < mode.pluck) {
    state.degree = Math.max(-3, Math.min(8, state.degree + rng.pick([-2, -1, -1, 0, 1, 1, 2])));
    out.push({
      inst: 'guzheng',
      freq: degreeFreq(mode, state.degree, 0),
      beats: 2,
      vel: 0.5 + rng.next() * 0.3,
    });
    // now and then a low root under it
    if (step % 8 === 0)
      out.push({ inst: 'guzheng', freq: degreeFreq(mode, 0, -1), beats: 4, vel: 0.5 });
  }
  if (step > 0 && step % mode.dizi === 0) {
    const d = Math.max(3, Math.min(9, state.degree + rng.pick([2, 3, 4])));
    out.push({ inst: 'dizi', freq: degreeFreq(mode, d, 0), beats: 3 + rng.int(3), vel: 0.4 });
  }
  return out;
}
