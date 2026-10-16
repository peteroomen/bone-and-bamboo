import { HONOUR_CHIPS, KIND_NAMES, SUIT_NAMES, type Suit, type TileKind } from '@/content/tiles';

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

export function isWind(kind: TileKind): boolean {
  return suitOf(kind) === 'w';
}

export function isDragon(kind: TileKind): boolean {
  return suitOf(kind) === 'd';
}

/** A wind or a dragon. */
export function isHonour(kind: TileKind): boolean {
  return isWind(kind) || isDragon(kind);
}

/** A flower or a season: set aside when it lands, never part of a set. */
export function isBonus(kind: TileKind): boolean {
  const s = suitOf(kind);
  return s === 'f' || s === 'q';
}

export function isTerminal(kind: TileKind): boolean {
  if (!isSuited(kind)) return false;
  const r = rankOf(kind);
  return r === 1 || r === 9;
}

/** A 1, a 9 or an honour. */
export function isOutside(kind: TileKind): boolean {
  return isTerminal(kind) || isHonour(kind);
}

export function tileChips(kind: TileKind): number {
  return isSuited(kind) ? rankOf(kind) : HONOUR_CHIPS;
}

export function kindName(kind: TileKind): string {
  return KIND_NAMES[kind] ?? `${rankOf(kind)} ${SUIT_NAMES[suitOf(kind)]}`;
}

/** Sort key: suit order p s m w d f q, then rank. */
const SUIT_ORDER = 'psmwdfq';
export function compareKinds(a: TileKind, b: TileKind): number {
  const d = SUIT_ORDER.indexOf(suitOf(a)) - SUIT_ORDER.indexOf(suitOf(b));
  return d !== 0 ? d : rankOf(a) - rankOf(b);
}

/** The wind (1-4) a flower or season belongs to: plum and spring are East's. */
export function bonusWind(kind: TileKind): number {
  return rankOf(kind);
}
