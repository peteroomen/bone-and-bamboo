import type { Rng } from './rng';
import type { Tile } from './tiles';

/** Stacks of tiles. The round keeps one: `stacks[0]` is the face-down pile; its top is the last element. */
export type Stacks = Tile[][];

/** Shuffle the set and deal it round-robin into n stacks; the top is the last tile dealt. */
export function deal(tiles: readonly Tile[], stackCount: number, rng: Rng): Stacks {
  const shuffled = rng.shuffle(tiles);
  const stacks: Stacks = Array.from({ length: stackCount }, () => []);
  shuffled.forEach((t, i) => (stacks[i % stackCount] as Tile[]).push(t));
  return stacks;
}

export function wallCount(stacks: readonly (readonly Tile[])[]): number {
  return stacks.reduce((n, s) => n + s.length, 0);
}

// ---- the brick wall ----------------------------------------------------------------------------

/**
 * One wind's side of the wall, stacked like bricks. Row 0 is the top. The bottom row has `width`
 * tiles; each row above is offset by half a tile, so rows alternate width and width - 1. `x` is
 * in half tiles: a tile spans x to x + 2, and it rests on the tiles below it that it overlaps.
 */
export interface Slot {
  readonly row: number;
  readonly x: number;
}

export function wallSlots(rows: number, width: number): Slot[] {
  const out: Slot[] = [];
  for (let row = 0; row < rows; row++) {
    const full = (rows - 1 - row) % 2 === 0;
    const n = full ? width : width - 1;
    for (let i = 0; i < n; i++) out.push({ row, x: full ? 2 * i : 2 * i + 1 });
  }
  return out;
}

/** For each slot, the slots resting on it (the row above, overlapping it). */
export function wallCovers(slots: readonly Slot[]): number[][] {
  return slots.map((b) =>
    slots
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => a.row === b.row - 1 && Math.abs(a.x - b.x) === 1)
      .map(({ i }) => i),
  );
}

/** The wall's slots, top row first: a tile or an empty place. */
export type Wall = readonly (Tile | null)[];

/** Slot indexes holding a tile with nothing resting on it. */
export function freeSlots(wall: Wall, rows: number, width: number): number[] {
  const covers = wallCovers(wallSlots(rows, width));
  const out: number[] = [];
  wall.forEach((t, i) => {
    if (t && (covers[i] ?? []).every((j) => !wall[j])) out.push(i);
  });
  return out;
}

/** Build a side of the wall from the top of a pile (the pile loses those tiles). */
export function buildWall(
  pile: readonly Tile[],
  rows: number,
  width: number,
): { wall: Wall; pile: Tile[] } {
  const n = wallSlots(rows, width).length;
  const rest = pile.slice();
  const wall: Tile[] = [];
  for (let i = 0; i < n && rest.length > 0; i++) wall.push(rest.pop() as Tile);
  return { wall, pile: rest };
}

export function wallTiles(wall: Wall | null | undefined): number {
  return wall ? wall.filter((t) => t !== null).length : 0;
}
