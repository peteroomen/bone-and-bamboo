import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { buildTiles } from './tiles';
import { buildWall, deal, freeSlots, wallCount, wallCovers, wallSlots } from './wall';
import { tiles } from './testkit';

describe('the pile', () => {
  it('is the whole set, shuffled by the seed', () => {
    const set = buildTiles('boneBamboo');
    const stacks = deal(set, 1, new Rng(7));
    expect(wallCount(stacks)).toBe(81);
    expect(new Set(stacks.flat().map((t) => t.id)).size).toBe(81);
    expect(deal(set, 1, new Rng(7))).toEqual(stacks);
    expect(deal(set, 1, new Rng(8))).not.toEqual(stacks);
  });
});

describe('the brick wall', () => {
  it('stacks rows of 7 and 8 like bricks, the top row first', () => {
    const slots = wallSlots(4, 8);
    expect(slots).toHaveLength(30);
    const row = (r: number) => slots.filter((s) => s.row === r).map((s) => s.x);
    expect(row(0)).toEqual([1, 3, 5, 7, 9, 11, 13]);
    expect(row(1)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
    expect(row(3)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
  });
  it('rests each tile on the two below it (one at the ends)', () => {
    const slots = wallSlots(4, 8);
    const covers = wallCovers(slots);
    // the second row's first tile has one tile on it; the next has two
    expect(covers[7]).toEqual([0]);
    expect(covers[8]).toEqual([0, 1]);
    // the top row has nothing on it
    expect(covers.slice(0, 7).every((c) => c.length === 0)).toBe(true);
  });
  it('frees a tile only when both tiles on top of it are gone', () => {
    const wall = tiles('p1 p2 p3 p4 p5 p6 p7 s1 s2 s3 s4 s5 s6 s7 s8');
    const w = [...wall, ...Array.from({ length: 15 }, () => null)];
    expect(freeSlots(w, 4, 8).slice(0, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(freeSlots(w, 4, 8)).not.toContain(8);
    const one = w.map((t, i) => (i === 0 ? null : t));
    // s1 (slot 7) had only p1 on it; s2 (slot 8) still has p2
    expect(freeSlots(one, 4, 8)).toContain(7);
    expect(freeSlots(one, 4, 8)).not.toContain(8);
    const two = one.map((t, i) => (i === 1 ? null : t));
    expect(freeSlots(two, 4, 8)).toContain(8);
  });
  it('builds a side from the top of the pile', () => {
    const pile = tiles('p1 p2 p3 p4 p5 p6 p7 p8 p9');
    const built = buildWall(pile, 2, 3);
    expect(built.wall).toHaveLength(5);
    expect(built.wall[0]?.kind).toBe('p9');
    expect(built.pile.map((t) => t.kind)).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
});
