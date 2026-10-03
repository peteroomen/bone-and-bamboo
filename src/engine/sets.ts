import type { SetKind } from '@/content/sets';
import { WINDS } from '@/content/tiles';
import { type Tile, isSuited, isWind, rankOf, suitOf } from './tiles';

export interface Candidate {
  readonly kind: SetKind;
  readonly tiles: Tile[];
}

const RUN_OF: Record<number, SetKind> = { 3: 'chow', 4: 'run4', 5: 'run5' };

/** Three to five suited tiles of one suit in a row. */
function isRun(kinds: readonly string[]): boolean {
  if (!kinds.every(isSuited)) return false;
  const suit = suitOf(kinds[0] as string);
  if (!kinds.every((k) => suitOf(k) === suit)) return false;
  const r = kinds.map(rankOf).sort((a, b) => a - b);
  return r.every((x, i) => x === (r[0] as number) + i);
}

/** Which set these tiles make, or null. Honours are never in a run. */
export function classify(tiles: readonly Tile[]): SetKind | null {
  const kinds = tiles.map((t) => t.kind);
  const same = kinds.every((k) => k === kinds[0]);
  switch (tiles.length) {
    case 1:
      return 'single';
    case 2:
      return same ? 'pair' : null;
    case 3:
      if (same) return 'pong';
      return isRun(kinds) ? 'chow' : null;
    case 4:
      if (same) return 'kong';
      if (WINDS.every((w) => kinds.includes(w))) return 'winds';
      return isRun(kinds) ? 'run4' : null;
    case 5:
      return isRun(kinds) ? 'run5' : null;
    default:
      return null;
  }
}

/** Runs are kept in rank order. */
export function isRunKind(k: SetKind): boolean {
  return k === 'chow' || k === 'run4' || k === 'run5';
}

/** A chow's tiles in rank order; other sets in kind order. */
export function orderSet(tiles: readonly Tile[]): Tile[] {
  return tiles.slice().sort((a, b) => rankOf(a.kind) - rankOf(b.kind) || a.id - b.id);
}

/** Enhanced tiles first, so a played set uses the tile that scores most. */
function preferred(a: Tile, b: Tile): number {
  return (b.enh ? 1 : 0) - (a.enh ? 1 : 0) || a.id - b.id;
}

/** Every set (not a single) that can be played from the hand. */
export function findSets(hand: readonly Tile[]): Candidate[] {
  const by = new Map<string, Tile[]>();
  for (const t of hand) {
    const list = by.get(t.kind);
    if (list) list.push(t);
    else by.set(t.kind, [t]);
  }
  for (const list of by.values()) list.sort(preferred);
  const out: Candidate[] = [];
  for (const [kind, list] of by) {
    if (list.length >= 4) out.push({ kind: 'kong', tiles: list.slice(0, 4) });
    if (list.length >= 3) out.push({ kind: 'pong', tiles: list.slice(0, 3) });
    if (list.length >= 2) out.push({ kind: 'pair', tiles: list.slice(0, 2) });
    if (isSuited(kind)) {
      const s = suitOf(kind);
      const r = rankOf(kind);
      const run: Tile[] = [list[0] as Tile];
      for (let n = 1; n < 5 && r + n <= 9; n++) {
        const next = by.get(`${s}${r + n}`);
        if (!next) break;
        run.push(next[0] as Tile);
        const k = RUN_OF[run.length];
        if (k) out.push({ kind: k, tiles: run.slice() });
      }
    }
  }
  if (WINDS.every((w) => by.has(w)))
    out.push({ kind: 'winds', tiles: WINDS.map((w) => (by.get(w) as Tile[])[0] as Tile) });
  return out;
}

export function hasSet(hand: readonly Tile[]): boolean {
  return findSets(hand).length > 0;
}

const SORT_KEY = (t: Tile) => `${isSuited(t.kind) ? suitOf(t.kind) : 'z'}${rankOf(t.kind)}`;

/**
 * Every way to split these tiles into sets (no singles), each set as a candidate. A play may hold
 * several sets at once. The first tile left (in suit and rank order) is the lowest of its run or
 * part of a group of its own kind, so the search only tries sets that start with it.
 */
export function partitions(tiles: readonly Tile[], limit = 64): Candidate[][] {
  const sorted = tiles
    .slice()
    .sort((a, b) => SORT_KEY(a).localeCompare(SORT_KEY(b)) || preferred(a, b));
  const out: Candidate[][] = [];
  const go = (rest: Tile[], acc: Candidate[]) => {
    if (out.length >= limit) return;
    if (rest.length === 0) {
      out.push(acc);
      return;
    }
    const t = rest[0] as Tile;
    const others = rest.slice(1);
    const tried = new Set<string>();
    const take = (set: Tile[], kind: SetKind) => {
      const key = `${kind}:${set.map((x) => x.kind).join(',')}`;
      if (tried.has(key)) return;
      tried.add(key);
      const used = new Set(set.map((x) => x.id));
      go(
        rest.filter((x) => !used.has(x.id)),
        [...acc, { kind, tiles: orderSet(set) }],
      );
    };
    // groups of t's own kind
    const same = others.filter((x) => x.kind === t.kind);
    if (same.length >= 1) take([t, same[0] as Tile], 'pair');
    if (same.length >= 2) take([t, ...same.slice(0, 2)], 'pong');
    if (same.length >= 3) take([t, ...same.slice(0, 3)], 'kong');
    // runs starting at t
    if (isSuited(t.kind)) {
      const s = suitOf(t.kind);
      const r = rankOf(t.kind);
      const run: Tile[] = [t];
      for (let n = 1; n < 5; n++) {
        const next = others.find((x) => x.kind === `${s}${r + n}`);
        if (!next) break;
        run.push(next);
        const k = RUN_OF[run.length];
        if (k) take(run.slice(), k);
      }
    }
    // four winds
    if (isWind(t.kind)) {
      const set = WINDS.map((w) => (w === t.kind ? t : others.find((x) => x.kind === w)));
      if (set.every((x) => x)) take(set as Tile[], 'winds');
    }
  };
  go(sorted, []);
  return out;
}

/** Why a selection can't be played now, or null if it can. */
export function playProblem(
  hand: readonly Tile[],
  ids: readonly number[],
  discardsLeft: number,
  maxSets = 1,
): string | null {
  if (ids.length === 0) return 'Pick some tiles.';
  if (new Set(ids).size !== ids.length) return 'Pick each tile once.';
  const picked: Tile[] = [];
  for (const id of ids) {
    const t = hand.find((x) => x.id === id);
    if (!t) return 'Those tiles are not in your hand.';
    picked.push(t);
  }
  if (picked.length === 1) {
    if (hasSet(hand)) return 'You hold a set: play it.';
    if (discardsLeft > 0) return 'Discard first: a single is a last resort.';
    return null;
  }
  const splits = partitions(picked);
  if (splits.length === 0) return 'Those tiles do not make sets.';
  if (splits.every((p) => p.length > maxSets))
    return maxSets === 1 ? 'One set at a time.' : `Up to ${maxSets} sets in one play.`;
  return null;
}
