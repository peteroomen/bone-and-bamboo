import { PATTERN_BY_ID, PATTERNS, type PatternId } from '@/content/patterns';
import type { SetKind } from '@/content/sets';
import { DRAGONS, SUITED, WINDS, type TileKind } from '@/content/tiles';
import { classify } from './sets';
import { isHonour, isOutside, isSuited, isTerminal, rankOf, suitOf } from './tiles';

/**
 * A set as the pattern rules see it: its kind and its tiles. Patterns are written as
 * *variants*: lists of five slots (or seven, for Seven Pairs), one per set of a hand. A hand
 * fits a pattern when its sets can be matched one to one with the slots of some variant. The
 * planner uses the same slots to show what a target hand still needs.
 */
export interface PSet {
  readonly kind: SetKind;
  readonly tiles: readonly TileKind[];
}

export type SlotKind = 'pair' | 'chow' | 'pong' | 'set';

export interface Slot {
  readonly kind: SlotKind;
  /** The exact set: for a chow its lowest tile, otherwise the repeated tile. */
  readonly base?: TileKind;
  /** Every tile of the set must pass. */
  readonly every?: (k: TileKind) => boolean;
  /** Some tile of the set must pass. */
  readonly some?: (k: TileKind) => boolean;
}

export interface Variant {
  readonly pattern: PatternId;
  readonly slots: readonly Slot[];
  /** A check on the whole finished hand, beyond the slots. */
  readonly whole?: (sets: readonly PSet[]) => boolean;
  /** Pairs must all differ (Seven Pairs). */
  readonly distinctPairs?: boolean;
}

export function setBase(s: PSet): TileKind {
  if (s.kind !== 'chow') return s.tiles[0] as TileKind;
  let best = s.tiles[0] as TileKind;
  for (const t of s.tiles) if (rankOf(t) < rankOf(best)) best = t;
  return best;
}

export function slotFits(slot: Slot, s: PSet): boolean {
  switch (slot.kind) {
    case 'pair':
      if (s.kind !== 'pair') return false;
      break;
    case 'chow':
      if (s.kind !== 'chow') return false;
      break;
    case 'pong':
      if (s.kind !== 'pong' && s.kind !== 'kong') return false;
      break;
    case 'set':
      if (s.kind === 'pair') return false;
      break;
  }
  if (slot.base && setBase(s) !== slot.base) return false;
  if (slot.every && !s.tiles.every(slot.every)) return false;
  if (slot.some && !s.tiles.some(slot.some)) return false;
  return true;
}

const S = (kind: SlotKind, extra: Omit<Slot, 'kind'> = {}): Slot => ({ kind, ...extra });
const four = (slot: Slot): Slot[] => [slot, slot, slot, slot];
const isSimple = (k: TileKind) => isSuited(k) && !isTerminal(k);

function hasHonour(sets: readonly PSet[]): boolean {
  return sets.some((s) => s.tiles.some(isHonour));
}
function hasSuited(sets: readonly PSet[]): boolean {
  return sets.some((s) => s.tiles.some(isSuited));
}

/** Nine Gates: 1112345678999 plus one more, as every way to split it into four sets and a pair. */
function nineGatesVariants(): Variant[] {
  const out: Variant[] = [];
  const seen = new Set<string>();
  for (const suit of SUITED) {
    for (let extra = 1; extra <= 9; extra++) {
      const counts = [0, 3, 1, 1, 1, 1, 1, 1, 1, 3];
      counts[extra] = (counts[extra] ?? 0) + 1;
      for (const split of splits(counts)) {
        const key = `${suit}|${split
          .map((s) => s.join(','))
          .sort()
          .join(' ')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          pattern: 'nineGates',
          slots: split.map((ranks) => {
            const kinds = ranks.map((r) => `${suit}${r}`);
            const kind = classify(kinds) as SetKind;
            return S(kind === 'kong' ? 'pong' : (kind as SlotKind), { base: kinds[0] as TileKind });
          }),
          whole: (sets) => sets.every((x) => x.kind !== 'kong'),
        });
      }
    }
  }
  return out;
}

/** Every split of rank counts (index 1-9) into four sets (pong or chow) and one pair. */
function splits(counts: number[]): number[][][] {
  const out: number[][][] = [];
  const c = counts.slice();
  const cur: number[][] = [];
  const rec = (pairUsed: boolean) => {
    let r = 1;
    while (r <= 9 && (c[r] ?? 0) === 0) r++;
    if (r > 9) {
      if (pairUsed && cur.length === 5) out.push(cur.map((x) => x.slice()));
      return;
    }
    const n = c[r] ?? 0;
    if (n >= 3) {
      c[r] = n - 3;
      cur.push([r, r, r]);
      rec(pairUsed);
      cur.pop();
      c[r] = n;
    }
    if (r <= 7 && (c[r + 1] ?? 0) > 0 && (c[r + 2] ?? 0) > 0) {
      c[r] = n - 1;
      c[r + 1] = (c[r + 1] ?? 0) - 1;
      c[r + 2] = (c[r + 2] ?? 0) - 1;
      cur.push([r, r + 1, r + 2]);
      rec(pairUsed);
      cur.pop();
      c[r] = n;
      c[r + 1] = (c[r + 1] ?? 0) + 1;
      c[r + 2] = (c[r + 2] ?? 0) + 1;
    }
    if (!pairUsed && n >= 2) {
      c[r] = n - 2;
      cur.push([r, r]);
      rec(true);
      cur.pop();
      c[r] = n;
    }
  };
  rec(false);
  return out;
}

function buildVariants(): Variant[] {
  const v: Variant[] = [];
  const add = (pattern: PatternId, slots: Slot[], extra: Partial<Variant> = {}) =>
    v.push({ pattern, slots, ...extra });
  const anySet = S('set');
  const anyPair = S('pair');

  add('chicken', [...four(anySet), anyPair]);
  add('allChows', [...four(S('chow')), anyPair]);
  add('allPongs', [...four(S('pong')), anyPair]);
  add('allSimples', [...four(S('set', { every: isSimple })), S('pair', { every: isSimple })]);
  add('outside', [...four(S('set', { some: isOutside })), S('pair', { some: isOutside })]);
  for (const suit of SUITED) {
    const inSuit = (k: TileKind) => suitOf(k) === suit;
    const half = (k: TileKind) => inSuit(k) || isHonour(k);
    add('fullFlush', [...four(S('set', { every: inSuit })), S('pair', { every: inSuit })]);
    add('halfFlush', [...four(S('set', { every: half })), S('pair', { every: half })], {
      whole: (sets) => hasHonour(sets) && hasSuited(sets),
    });
    add('pureStraight', [
      S('chow', { base: `${suit}1` }),
      S('chow', { base: `${suit}4` }),
      S('chow', { base: `${suit}7` }),
      anySet,
      anyPair,
    ]);
  }
  for (let r = 1; r <= 7; r++) {
    add('mixedChow', [...SUITED.map((s) => S('chow', { base: `${s}${r}` })), anySet, anyPair]);
  }
  for (let r = 1; r <= 9; r++) {
    add('triplePong', [...SUITED.map((s) => S('pong', { base: `${s}${r}` })), anySet, anyPair]);
  }
  add(
    'sevenPairs',
    Array.from({ length: 7 }, () => anyPair),
    { distinctPairs: true },
  );
  for (const pair of DRAGONS) {
    const others = DRAGONS.filter((d) => d !== pair);
    add('littleDragons', [
      ...others.map((d) => S('pong', { base: d })),
      anySet,
      anySet,
      S('pair', { base: pair }),
    ]);
  }
  add('bigDragons', [...DRAGONS.map((d) => S('pong', { base: d })), anySet, anyPair]);
  for (const pair of WINDS) {
    const others = WINDS.filter((w) => w !== pair);
    add('littleWinds', [
      ...others.map((w) => S('pong', { base: w })),
      anySet,
      S('pair', { base: pair }),
    ]);
  }
  add('bigWinds', [...WINDS.map((w) => S('pong', { base: w })), anyPair]);
  add('allHonours', [...four(S('pong', { every: isHonour })), S('pair', { every: isHonour })]);
  add('allTerminals', [
    ...four(S('pong', { every: isTerminal })),
    S('pair', { every: isTerminal }),
  ]);
  v.push(...nineGatesVariants());
  return v;
}

export const VARIANTS: readonly Variant[] = buildVariants();

export const VARIANTS_BY_PATTERN: Record<PatternId, readonly Variant[]> = Object.fromEntries(
  PATTERNS.map((p) => [p.id, VARIANTS.filter((v) => v.pattern === p.id)]),
) as Record<PatternId, Variant[]>;

/**
 * Match sets to slots one to one. Returns, for each set, the slot it took, or null when some set
 * finds no slot. Sets that are only partly there (a rack mid-hand) leave the other slots open.
 */
export function matchSets(slots: readonly Slot[], sets: readonly PSet[]): number[] | null {
  if (sets.length > slots.length) return null;
  const used = new Array<boolean>(slots.length).fill(false);
  const out = new Array<number>(sets.length).fill(-1);
  const rec = (i: number): boolean => {
    if (i === sets.length) return true;
    const s = sets[i] as PSet;
    const tried = new Set<Slot>();
    for (let j = 0; j < slots.length; j++) {
      const slot = slots[j] as Slot;
      if (used[j] || tried.has(slot) || !slotFits(slot, s)) continue;
      tried.add(slot);
      used[j] = true;
      out[i] = j;
      if (rec(i + 1)) return true;
      used[j] = false;
    }
    return false;
  };
  return rec(0) ? out : null;
}

function distinctPairsOk(sets: readonly PSet[]): boolean {
  const pairs = sets.filter((s) => s.kind === 'pair').map((s) => s.tiles[0]);
  return new Set(pairs).size === pairs.length;
}

/** Does this finished hand fit the variant? */
export function fitsVariant(v: Variant, sets: readonly PSet[]): boolean {
  if (sets.length !== v.slots.length) return false;
  if (v.distinctPairs && !distinctPairsOk(sets)) return false;
  if (v.whole && !v.whole(sets)) return false;
  return matchSets(v.slots, sets) !== null;
}

/** Every pattern a finished hand fits, after exclusions (the Chicken hand always fits). */
export function patternsOf(sets: readonly PSet[]): PatternId[] {
  const hit = new Set<PatternId>();
  for (const v of VARIANTS) if (!hit.has(v.pattern) && fitsVariant(v, sets)) hit.add(v.pattern);
  for (const id of [...hit]) for (const ex of PATTERN_BY_ID[id].excludes ?? []) hit.delete(ex);
  return PATTERNS.map((p) => p.id).filter((id) => hit.has(id));
}

/** Kinds of a chow from its base, or of a pong/pair/kong. */
export function slotTiles(kind: SetKind, base: TileKind): TileKind[] {
  if (kind === 'chow') {
    const s = suitOf(base);
    const r = rankOf(base);
    return [base, `${s}${r + 1}`, `${s}${r + 2}`];
  }
  const n = kind === 'pair' ? 2 : kind === 'kong' ? 4 : 3;
  return Array.from({ length: n }, () => base);
}
