import type { EnhancementId } from '@/content/enhancements';
import type { SetKind } from '@/content/sets';
import type { TileKind } from '@/content/tiles';
import { compareKinds, isBonus, isSuited, rankOf, suitOf } from './tiles';

/** A tile on your rack: the face it came from, and that face's enhancement. */
export interface RackTile {
  readonly kind: TileKind;
  readonly enh?: EnhancementId;
  readonly dieId: number;
  readonly face: number;
}

export interface RackSet {
  readonly kind: SetKind;
  readonly tiles: readonly RackTile[];
}

/** Which set these kinds make, or null. Honours never make a chow; bonus tiles make nothing. */
export function classify(kinds: readonly TileKind[]): SetKind | null {
  if (kinds.some((k) => isBonus(k))) return null;
  const same = kinds.every((k) => k === kinds[0]);
  switch (kinds.length) {
    case 2:
      return same ? 'pair' : null;
    case 3: {
      if (same) return 'pong';
      if (!kinds.every(isSuited)) return null;
      const suit = suitOf(kinds[0] as string);
      if (!kinds.every((k) => suitOf(k) === suit)) return null;
      const r = kinds.map(rankOf).sort((a, b) => a - b);
      return r[1] === (r[0] as number) + 1 && r[2] === (r[0] as number) + 2 ? 'chow' : null;
    }
    case 4:
      return same ? 'kong' : null;
    default:
      return null;
  }
}

/** The set's base kind: the lowest tile of a chow, or the repeated tile. */
export function baseKind(kinds: readonly TileKind[]): TileKind {
  return kinds.slice().sort(compareKinds)[0] as TileKind;
}

export function setKinds(s: RackSet): TileKind[] {
  return s.tiles.map((t) => t.kind);
}

export interface RackCount {
  readonly sets: number;
  readonly pairs: number;
}

export function countRack(rack: readonly RackSet[]): RackCount {
  let sets = 0;
  let pairs = 0;
  for (const s of rack) {
    if (s.kind === 'pair') pairs++;
    else sets++;
  }
  return { sets, pairs };
}

/** A finished hand: four sets and a pair, or seven different pairs. */
export function isComplete(rack: readonly RackSet[]): boolean {
  const { sets, pairs } = countRack(rack);
  return (sets === 4 && pairs === 1) || (sets === 0 && pairs === 7);
}

/** Why a set of this kind (base tile `base`) can't go on the rack, or null if it can. */
export function rackProblem(
  rack: readonly RackSet[],
  kind: SetKind,
  base: TileKind,
): string | null {
  const { sets, pairs } = countRack(rack);
  if (kind === 'pair') {
    if (pairs === 0) return sets <= 4 ? null : 'Your rack is full.';
    if (sets > 0) return 'You already have your pair.';
    if (pairs >= 7) return 'Your rack is full.';
    if (rack.some((s) => s.tiles[0]?.kind === base)) return 'Seven Pairs needs different pairs.';
    return null;
  }
  if (pairs >= 2) return 'You are building Seven Pairs: only pairs fit.';
  if (sets >= 4) return 'You already have four sets: you need a pair.';
  return null;
}
