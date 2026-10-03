import { describe, expect, it } from 'vitest';
import { chooseMove, moveAction, playOut } from './ai';
import { roundReduce, startRound } from './round';
import { roundWith } from './testkit';
import { buildTiles } from './tiles';
import { BASE_ROUND_RULES } from './round';

describe('the hint bot', () => {
  it('plays a pong over a pair, and a chow when it has one', () => {
    const s = roundWith({ hand: 'p5 p5 p5 s1 s2 s3 m9 m9', rules: { handSize: 8 } });
    const m = chooseMove(s);
    expect(m?.type).toBe('play');
    expect(m && m.type === 'play' && m.kind).toBe('pong');
  });
  it('discards junk when it has no set and discards left', () => {
    const s = roundWith({ hand: 'p1 p5 s9 m3 w1 w2 m7 s4', rules: { handSize: 8 } });
    const m = chooseMove(s);
    expect(m?.type).toBe('discard');
  });
  it('plays a single only with no set and no discards', () => {
    const s = { ...roundWith({ hand: 'p1 p5 s9 m3', rules: { handSize: 4 } }), discardsLeft: 0 };
    const m = chooseMove(s);
    expect(m && m.type === 'play' && m.kind).toBe('single');
  });
  it('always chooses a legal move, across 300 seeded rounds', () => {
    for (const policy of ['greedy', 'pongs'] as const) {
      for (let seed = 1; seed <= 150; seed++) {
        let s = startRound({
          tiles: buildTiles('boneBamboo'),
          rules: BASE_ROUND_RULES,
          dragons: seed % 3 === 0 ? ['allSimples', 'abacus'] : [],
          levels: {},
          target: 0,
          rng: seed,
        });
        for (let n = 0; n < 200 && s.phase === 'play'; n++) {
          const m = chooseMove(s, policy);
          expect(m).not.toBeNull();
          if (!m) break;
          const r = roundReduce(s, moveAction(m));
          expect(r.events.some((e) => e.type === 'illegal')).toBe(false);
          s = r.state;
        }
        expect(s.phase).toBe('done');
      }
    }
  });
  it('plays a round out', () => {
    const s = startRound({
      tiles: buildTiles('boneBamboo'),
      rules: BASE_ROUND_RULES,
      dragons: [],
      levels: {},
      target: 0,
      rng: 11,
    });
    const done = playOut(s);
    expect(done.phase).toBe('done');
    expect(done.result?.score.total).toBeGreaterThan(300);
  });
  // The draw pile, hand 12, 4 discards, 5 plays of any number of sets (docs/work/2026-10-03-sets.md).
  it('plays the base round to a median of about 2,400 (within 10%)', () => {
    const scores: number[] = [];
    for (let seed = 0; seed < 600; seed++) {
      const s = startRound({
        tiles: buildTiles('boneBamboo'),
        rules: BASE_ROUND_RULES,
        dragons: [],
        levels: {},
        target: 0,
        rng: seed * 7 + 1,
      });
      scores.push(playOut(s).result?.score.total ?? 0);
    }
    scores.sort((a, b) => a - b);
    const median = scores[Math.floor(scores.length / 2)] as number;
    expect(median).toBeGreaterThan(2400 * 0.9);
    expect(median).toBeLessThan(2400 * 1.1);
  });
});
