import { ENHANCEMENTS } from '@/content/enhancements';
import { FORTUNES, type FortuneId } from '@/content/fortunes';
import { SUITED, type SuitedSuit } from '@/content/tiles';
import type { FortuneArgs } from './runTypes';
import { type Tile, isSuited, rankOf } from './tiles';

export interface FortuneOutcome {
  readonly tiles: readonly Tile[];
  readonly nextTileId: number;
  /** Ids destroyed. */
  readonly removed: readonly number[];
  /** Tiles created. */
  readonly added: readonly Tile[];
}

/** Why a fortune can't be used on these tiles, or null. `tiles` is the pool it may act on. */
export function fortuneProblem(
  id: FortuneId,
  pool: readonly Tile[],
  args: FortuneArgs,
): string | null {
  const f = FORTUNES[id];
  const ids = new Set(args.tileIds);
  if (ids.size !== args.tileIds.length) return 'Pick each tile once.';
  if (ids.size < 1) return 'Pick a tile.';
  if (ids.size > f.maxTiles) return `Pick at most ${f.maxTiles}.`;
  const picked = pool.filter((t) => ids.has(t.id));
  if (picked.length !== ids.size) return 'Those tiles are not available.';
  if (f.needsSuit) {
    if (!args.suit || !SUITED.includes(args.suit)) return 'Pick a suit.';
    if (picked.some((t) => !isSuited(t.kind))) return 'Only suited tiles can change suit.';
  }
  return null;
}

/** Apply a fortune to the whole set. The caller checks the tiles with `fortuneProblem`. */
export function applyFortune(
  id: FortuneId,
  all: readonly Tile[],
  nextTileId: number,
  args: FortuneArgs,
): FortuneOutcome {
  const ids = new Set(args.tileIds);
  const f = FORTUNES[id];
  switch (id) {
    case 'rubbing': {
      const src = all.find((t) => ids.has(t.id)) as Tile;
      const copy: Tile = { id: nextTileId, kind: src.kind, ...(src.enh ? { enh: src.enh } : {}) };
      return { tiles: [...all, copy], nextTileId: nextTileId + 1, removed: [], added: [copy] };
    }
    case 'fire':
      return {
        tiles: all.filter((t) => !ids.has(t.id)),
        nextTileId,
        removed: [...ids],
        added: [],
      };
    case 'brush': {
      const suit = args.suit as SuitedSuit;
      return {
        tiles: all.map((t) => (ids.has(t.id) ? { ...t, kind: `${suit}${rankOf(t.kind)}` } : t)),
        nextTileId,
        removed: [],
        added: [],
      };
    }
    default: {
      const enh = f.enhancement;
      if (!enh || !ENHANCEMENTS[enh]) return { tiles: all, nextTileId, removed: [], added: [] };
      return {
        tiles: all.map((t) => (ids.has(t.id) ? { ...t, enh } : t)),
        nextTileId,
        removed: [],
        added: [],
      };
    }
  }
}
