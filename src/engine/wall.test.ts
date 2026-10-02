import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { buildTiles } from './tiles';
import { deal, viewStack, visibleTiles, wallCount } from './wall';
import { tiles } from './testkit';

describe('the wall', () => {
  it('deals the whole set round-robin into 8 stacks', () => {
    const set = buildTiles('boneBamboo');
    const stacks = deal(set, 8, new Rng(7));
    expect(stacks).toHaveLength(8);
    expect(wallCount(stacks)).toBe(81);
    expect(stacks.map((s) => s.length)).toEqual([11, 10, 10, 10, 10, 10, 10, 10]);
    expect(new Set(stacks.flat().map((t) => t.id)).size).toBe(81);
  });
  it('is the same wall for the same seed, and a different one for another', () => {
    const set = buildTiles('boneBamboo');
    const a = deal(set, 8, new Rng(7));
    expect(deal(set, 8, new Rng(7))).toEqual(a);
    expect(deal(set, 8, new Rng(8))).not.toEqual(a);
  });
  it('shows the top tile and the strip of the one under it, and hides the rest', () => {
    const stack = tiles('p1 p2 p3 p4 p5');
    const v = viewStack(stack, 1);
    expect(v.count).toBe(5);
    expect(v.top?.kind).toBe('p5');
    expect(v.under.map((t) => t.kind)).toEqual(['p4']);
  });
  it('shows one tile deeper with the Lantern (peek 2)', () => {
    const stack = tiles('p1 p2 p3 p4 p5');
    expect(viewStack(stack, 2).under.map((t) => t.kind)).toEqual(['p4', 'p3']);
    expect(visibleTiles(stack, 2).map((t) => t.kind)).toEqual(['p5', 'p4', 'p3']);
  });
  it('copes with short and empty stacks', () => {
    expect(viewStack(tiles('p1'), 1).under).toEqual([]);
    expect(viewStack([], 1)).toEqual({ count: 0, top: null, under: [] });
    expect(viewStack(tiles('p1 p2'), 5).under.map((t) => t.kind)).toEqual(['p1']);
  });
});
