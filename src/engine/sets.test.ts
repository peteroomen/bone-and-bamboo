import { describe, expect, it } from 'vitest';
import { classify, findSets, playProblem } from './sets';
import { tiles } from './testkit';

const kind = (s: string) => classify(tiles(s));

describe('set detection', () => {
  it('recognises every set type', () => {
    expect(kind('p5')).toBe('single');
    expect(kind('p5 p5')).toBe('pair');
    expect(kind('w2 w2')).toBe('pair');
    expect(kind('s2 s3 s4')).toBe('chow');
    expect(kind('s4 s2 s3')).toBe('chow');
    expect(kind('m9 m9 m9')).toBe('pong');
    expect(kind('d1 d1 d1')).toBe('pong');
    expect(kind('p3 p3 p3 p3')).toBe('kong');
    expect(kind('w1 w2 w3 w4')).toBe('winds');
  });
  it('rejects things that are not sets', () => {
    expect(kind('p5 p6')).toBeNull();
    expect(kind('p1 p2 p4')).toBeNull();
    expect(kind('p1 p2 s3')).toBeNull();
    expect(kind('p8 p9 p1')).toBeNull();
    expect(kind('d1 d2 d3')).toBeNull();
    expect(kind('w1 w2 w3')).toBeNull();
    expect(kind('p1 p1 p1 p2')).toBeNull();
    expect(kind('p1 p2 p3 p4 p5')).toBeNull();
  });
  it('never puts honours in a run', () => {
    expect(kind('w1 w2 w3')).toBeNull();
    expect(findSets(tiles('w1 w2 w3 w1')).map((c) => c.kind)).toEqual(['pair']);
  });
  it('finds every playable set in a hand', () => {
    const kinds = findSets(tiles('p1 p2 p3 p3 p3 s5 s5 w1 w2 w3 w4')).map((c) => c.kind);
    expect(kinds.filter((k) => k === 'chow')).toHaveLength(1);
    expect(kinds).toContain('pong');
    expect(kinds.filter((k) => k === 'pair')).toHaveLength(2);
    expect(kinds).toContain('winds');
    expect(findSets(tiles('p4 p4 p4 p4')).map((c) => c.kind)).toEqual(['kong', 'pong', 'pair']);
  });
  it('prefers enhanced tiles when it picks a set from the hand', () => {
    const hand = tiles('p5 p5 jade:p5');
    const pair = findSets(hand).find((c) => c.kind === 'pair');
    expect(pair?.tiles.some((t) => t.enh === 'jade')).toBe(true);
  });
  it('allows a single only with no set in hand and no discards', () => {
    const hand = tiles('p1 p4 s7 m2');
    const ids = [hand[0]?.id as number];
    expect(playProblem(hand, ids, 1)).toMatch(/Discard first/);
    expect(playProblem(hand, ids, 0)).toBeNull();
    const withPair = tiles('p1 p1 s7');
    expect(playProblem(withPair, [withPair[2]?.id as number], 0)).toMatch(/hold a set/);
    expect(
      playProblem(withPair, [withPair[0]?.id as number, withPair[1]?.id as number], 3),
    ).toBeNull();
  });
});
