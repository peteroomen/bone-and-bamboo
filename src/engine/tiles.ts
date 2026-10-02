import type { EnhancementId } from '@/content/enhancements';
import {
  HONOUR_CHIPS,
  HONOUR_NAMES,
  RANKS,
  SUIT_NAMES,
  type Suit,
  type TileKind,
} from '@/content/tiles';
import { tileSetDef } from '@/content/tilesets';

/** One physical tile. It keeps its id for the whole run and may carry an enhancement. */
export interface Tile {
  readonly id: number;
  readonly kind: TileKind;
  readonly enh?: EnhancementId;
}

export function suitOf(kind: TileKind): Suit {
  return kind.charAt(0) as Suit;
}

export function rankOf(kind: TileKind): number {
  return Number(kind.slice(1));
}

export function isSuited(kind: TileKind): boolean {
  const s = suitOf(kind);
  return s === 'p' || s === 's' || s === 'm';
}

export function isHonour(kind: TileKind): boolean {
  return !isSuited(kind);
}

export function isWind(kind: TileKind): boolean {
  return suitOf(kind) === 'w';
}

/** A 1, a 9 or an honour. */
export function isOutside(kind: TileKind): boolean {
  if (!isSuited(kind)) return true;
  const r = rankOf(kind);
  return r === 1 || r === 9;
}

export function tileChips(kind: TileKind): number {
  return isSuited(kind) ? rankOf(kind) : HONOUR_CHIPS;
}

export function kindName(kind: TileKind): string {
  const honour = HONOUR_NAMES[kind];
  if (honour) return `${honour} Wind`;
  return `${rankOf(kind)} ${SUIT_NAMES[suitOf(kind)]}`;
}

/** Sort key: suit order p s m w d, then rank. */
const SUIT_ORDER = 'psmw';
export function compareKinds(a: TileKind, b: TileKind): number {
  const d = SUIT_ORDER.indexOf(suitOf(a)) - SUIT_ORDER.indexOf(suitOf(b));
  return d !== 0 ? d : rankOf(a) - rankOf(b);
}

export function sortTiles(tiles: readonly Tile[]): Tile[] {
  return tiles.slice().sort((a, b) => compareKinds(a.kind, b.kind) || a.id - b.id);
}

/** The starting set of a tile set, with ids 1..n. */
export function buildTiles(tileSetId: string): Tile[] {
  const def = tileSetDef(tileSetId);
  const kinds: TileKind[] = [];
  for (const suit of def.suits) {
    for (const r of RANKS) for (let c = 0; c < def.copies; c++) kinds.push(`${suit}${r}`);
  }
  for (const [kind, n] of Object.entries(def.honours)) for (let c = 0; c < n; c++) kinds.push(kind);
  return kinds.map((kind, i) => ({ id: i + 1, kind }));
}

export function countKinds(tiles: readonly { kind: TileKind }[]): Map<TileKind, number> {
  const m = new Map<TileKind, number>();
  for (const t of tiles) m.set(t.kind, (m.get(t.kind) ?? 0) + 1);
  return m;
}
