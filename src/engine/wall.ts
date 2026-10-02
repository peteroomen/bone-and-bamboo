import type { Rng } from './rng';
import type { Tile } from './tiles';

/** Stacks of face-up tiles. The top of a stack is the last element. */
export type Stacks = Tile[][];

/** Shuffle the set and deal it round-robin into n stacks; the top is the last tile dealt. */
export function deal(tiles: readonly Tile[], stackCount: number, rng: Rng): Stacks {
  const shuffled = rng.shuffle(tiles);
  const stacks: Stacks = Array.from({ length: stackCount }, () => []);
  shuffled.forEach((t, i) => (stacks[i % stackCount] as Tile[]).push(t));
  return stacks;
}

export interface StackView {
  /** Tiles left in the stack. */
  readonly count: number;
  /** The top tile, fully visible. */
  readonly top: Tile | null;
  /** The tiles under the top whose top strip shows, nearest first. */
  readonly under: readonly Tile[];
}

/** What the player sees of a stack: the top, and a strip of the next `peek` tiles. */
export function viewStack(stack: readonly Tile[], peek: number): StackView {
  const n = stack.length;
  if (n === 0) return { count: 0, top: null, under: [] };
  const under: Tile[] = [];
  for (let i = 1; i <= peek && n - 1 - i >= 0; i++) under.push(stack[n - 1 - i] as Tile);
  return { count: n, top: stack[n - 1] as Tile, under };
}

/** The tiles a stack shows, top first (the top and the strips). */
export function visibleTiles(stack: readonly Tile[], peek: number): Tile[] {
  const v = viewStack(stack, peek);
  return v.top ? [v.top, ...v.under] : [];
}

export function wallCount(stacks: readonly (readonly Tile[])[]): number {
  return stacks.reduce((n, s) => n + s.length, 0);
}
