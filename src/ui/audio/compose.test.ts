import { describe, expect, it } from 'vitest';
import { Rng } from '@/engine/rng';
import { type Scene, modeFor, notesAt } from './compose';

const SCENES: Scene[] = [
  { kind: 'title' },
  { kind: 'shop' },
  { kind: 'over' },
  { kind: 'won' },
  { kind: 'round', wind: 0 },
  { kind: 'round', wind: 1 },
  { kind: 'round', wind: 2 },
  { kind: 'round', wind: 3 },
];

describe('the score', () => {
  it('has a mode for every scene, and each wind differs', () => {
    for (const s of SCENES) {
      const m = modeFor(s);
      expect(m.degrees).toHaveLength(5);
      expect(m.bpm).toBeGreaterThan(30);
    }
    const winds = [0, 1, 2, 3].map((wind) => modeFor({ kind: 'round', wind }).root);
    expect(new Set(winds).size).toBe(4);
    expect(modeFor({ kind: 'shop' }).bpm).toBeLessThan(modeFor({ kind: 'round', wind: 1 }).bpm);
  });
  it('is sparse and stays in the scale and the range of the instruments', () => {
    for (const s of SCENES) {
      const mode = modeFor(s);
      const rng = new Rng(7);
      const state = { degree: 2 };
      let notes = 0;
      for (let step = 0; step < 400; step++) {
        for (const n of notesAt(mode, step, state, rng)) {
          notes++;
          expect(n.freq).toBeGreaterThan(60);
          expect(n.freq).toBeLessThan(2400);
          // every pitch is a pentatonic degree of the mode's root
          const semis = 12 * Math.log2(n.freq / mode.root);
          const inScale = mode.degrees.some(
            (d) =>
              Math.abs((((semis - d) % 12) + 12) % 12) < 0.01 ||
              Math.abs(((((semis - d) % 12) + 12) % 12) - 12) < 0.01,
          );
          expect(inScale).toBe(true);
        }
      }
      expect(notes).toBeGreaterThan(20);
      expect(notes).toBeLessThan(400);
    }
  });
  it('is the same score for the same seed', () => {
    const run = () => {
      const rng = new Rng(3);
      const st = { degree: 2 };
      return Array.from({ length: 64 }, (_, i) => notesAt(modeFor({ kind: 'title' }), i, st, rng));
    };
    expect(run()).toEqual(run());
  });
});
