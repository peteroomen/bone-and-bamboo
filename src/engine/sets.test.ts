import { describe, expect, it } from 'vitest';
import { classify, findSets, partitions, playProblem } from './sets';
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
    expect(kind('p1 p2 p3 p4')).toBeNull();
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

describe('several sets in one play', () => {
  it('splits a selection into sets, every way it can', () => {
    const kinds = (p: ReturnType<typeof partitions>) =>
      p
        .map((split) =>
          split
            .map((c) => c.kind)
            .sort()
            .join('+'),
        )
        .sort();
    expect(kinds(partitions(tiles('p5 p5 p5 s1 s2 s3')))).toEqual(['chow+pong']);
    // 1-6 of one suit: two chows
    expect(kinds(partitions(tiles('m1 m2 m3 m4 m5 m6')))).toEqual(['chow+chow']);
    // a chow would leave a loose 2: no split
    expect(partitions(tiles('p2 p2 p3 p4'))).toEqual([]);
    expect(kinds(partitions(tiles('p2 p2 p3 p3 p4 p4')))).toEqual(['chow+chow', 'pair+pair+pair']);
  });
  it('allows up to the limit of sets, and no singles inside a play', () => {
    const hand = tiles('p5 p5 p5 s1 s2 s3 m9 m9 w1');
    const pick = (k: string[]) => {
      const used = new Set<number>();
      return k.map((kind) => {
        const t = hand.find((x) => x.kind === kind && !used.has(x.id));
        used.add(t?.id as number);
        return t?.id as number;
      });
    };
    const two = pick(['p5', 'p5', 'p5', 's1', 's2', 's3']);
    expect(playProblem(hand, two, 3, 1)).toMatch(/One set at a time/);
    expect(playProblem(hand, two, 3, 2)).toBeNull();
    const three = pick(['p5', 'p5', 'p5', 's1', 's2', 's3', 'm9', 'm9']);
    expect(playProblem(hand, three, 3, 2)).toMatch(/Up to 2 sets/);
    expect(playProblem(hand, pick(['p5', 'p5', 'p5', 'w1']), 3, 2)).toMatch(/do not make sets/);
  });
});
