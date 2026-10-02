import type { SetKind } from '@/content/sets';
import { WINDS } from '@/content/tiles';
import { type Tile, isSuited, rankOf, suitOf } from './tiles';

export interface Candidate {
  readonly kind: SetKind;
  readonly tiles: Tile[];
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
    case 3: {
      if (same) return 'pong';
      if (kinds.every(isSuited)) {
        const suit = suitOf(kinds[0] as string);
        if (kinds.every((k) => suitOf(k) === suit)) {
          const r = kinds.map(rankOf).sort((a, b) => a - b);
          if (
            (r[1] as number) === (r[0] as number) + 1 &&
            (r[2] as number) === (r[0] as number) + 2
          )
            return 'chow';
        }
      }
      return null;
    }
    case 4:
      if (same) return 'kong';
      if (WINDS.every((w) => kinds.includes(w))) return 'winds';
      return null;
    default:
      return null;
  }
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
      const a = by.get(`${s}${r + 1}`);
      const b = by.get(`${s}${r + 2}`);
      if (r <= 7 && a && b)
        out.push({ kind: 'chow', tiles: [list[0] as Tile, a[0] as Tile, b[0] as Tile] });
    }
  }
  if (WINDS.every((w) => by.has(w)))
    out.push({ kind: 'winds', tiles: WINDS.map((w) => (by.get(w) as Tile[])[0] as Tile) });
  return out;
}

export function hasSet(hand: readonly Tile[]): boolean {
  return findSets(hand).length > 0;
}

/** Why a selection can't be played now, or null if it can. */
export function playProblem(
  hand: readonly Tile[],
  ids: readonly number[],
  discardsLeft: number,
): string | null {
  if (ids.length === 0) return 'Pick some tiles.';
  if (new Set(ids).size !== ids.length) return 'Pick each tile once.';
  const picked: Tile[] = [];
  for (const id of ids) {
    const t = hand.find((x) => x.id === id);
    if (!t) return 'Those tiles are not in your hand.';
    picked.push(t);
  }
  const kind = classify(picked);
  if (!kind) return 'That is not a set.';
  if (kind === 'single') {
    if (hasSet(hand)) return 'You hold a set: play it.';
    if (discardsLeft > 0) return 'Discard first: a single is a last resort.';
  }
  return null;
}
