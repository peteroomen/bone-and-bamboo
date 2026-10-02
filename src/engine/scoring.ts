import { DRAGONS, type DragonEffect, type TableCondition } from '@/content/dragons';
import { ENHANCEMENTS } from '@/content/enhancements';
import { SET_TYPES, type SetKind } from '@/content/sets';
import { type Tile, isOutside, isSuited, isWind, rankOf, suitOf, tileChips } from './tiles';

/** A set on the table. */
export interface PlayedSet {
  readonly kind: SetKind;
  readonly tiles: readonly Tile[];
}

export type Levels = Partial<Record<SetKind, number>>;

/** Everything scoring needs to know besides the table. */
export interface ScoreContext {
  readonly dragons: readonly string[];
  readonly levels: Levels;
  /** Extra rules from a host's twist, as data the engine understands. */
  readonly modifiers?: ScoreModifiers;
}

/** Twist effects on scoring. Filled in by src/engine/twists.ts. */
export interface ScoreModifiers {
  /** Chips multiplier per set kind (the set's own chips, level chips and tile chips). */
  readonly chipsX?: Partial<Record<SetKind, number>>;
  /** Extra mult per set kind. */
  readonly setMult?: Partial<Record<SetKind, number>>;
  /** Extra mult per tile id on the table. */
  readonly tileMult?: Readonly<Record<number, number>>;
  /** Points taken off the final score. */
  readonly penalty?: number;
  /** A final ×mult. */
  readonly xmult?: number;
}

export interface SetStep {
  readonly type: 'set';
  readonly index: number;
  readonly kind: SetKind;
  readonly setChips: number;
  readonly levelChips: number;
  readonly tileChips: number;
  readonly enhChips: number;
  readonly setMult: number;
  readonly levelMult: number;
  readonly enhMult: number;
  readonly twistMult: number;
  /** Porcelain and other enhancement multipliers on this set. */
  readonly enhX: number;
  /** Running totals after this step. */
  readonly chips: number;
  readonly mult: number;
  readonly x: number;
}

export interface DragonStep {
  readonly type: 'dragon';
  readonly id: string;
  readonly addChips: number;
  readonly addMult: number;
  readonly x: number;
  readonly chips: number;
  readonly mult: number;
  readonly xTotal: number;
}

export interface TwistStep {
  readonly type: 'twist';
  readonly addMult: number;
  readonly x: number;
  readonly penalty: number;
  readonly chips: number;
  readonly mult: number;
  readonly xTotal: number;
}

export type ScoreStep = SetStep | DragonStep | TwistStep;

export interface ScoreResult {
  readonly steps: readonly ScoreStep[];
  readonly chips: number;
  readonly mult: number;
  readonly x: number;
  readonly total: number;
}

/** The number a dragon's condition is asked about. */
function suitsOn(table: readonly PlayedSet[]): number {
  const s = new Set<string>();
  for (const set of table) for (const t of set.tiles) if (isSuited(t.kind)) s.add(suitOf(t.kind));
  return s.size;
}

function isBig(k: SetKind): boolean {
  return k === 'pong' || k === 'kong';
}

function straightDone(table: readonly PlayedSet[]): boolean {
  for (const suit of ['p', 's', 'm']) {
    const starts = new Set<number>();
    for (const s of table) {
      if (s.kind !== 'chow') continue;
      const first = s.tiles.reduce((a, b) => (rankOf(a.kind) <= rankOf(b.kind) ? a : b));
      if (suitOf(first.kind) === suit) starts.add(rankOf(first.kind));
    }
    if (starts.has(1) && starts.has(4) && starts.has(7)) return true;
  }
  return false;
}

/** Sets with the same tiles, for Twin Cranes: pairs of identical sets (not singles). */
export function identicalPairs(table: readonly PlayedSet[]): number {
  const count = new Map<string, number>();
  for (const s of table) {
    if (s.kind === 'single') continue;
    const key = `${s.kind}:${s.tiles
      .map((t) => t.kind)
      .sort()
      .join(',')}`;
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  let n = 0;
  for (const v of count.values()) n += Math.floor(v / 2);
  return n;
}

export function conditionHolds(c: TableCondition, table: readonly PlayedSet[]): boolean {
  switch (c.kind) {
    case 'bigSets':
      return table.filter((s) => isBig(s.kind)).length >= c.min;
    case 'setsAndPair':
      return (
        table.filter((s) => s.kind !== 'pair' && s.kind !== 'single').length >= c.sets &&
        table.some((s) => s.kind === 'pair')
      );
    case 'maxSuits':
      return suitsOn(table) <= c.n;
    case 'noOutside':
      return table.length > 0 && !table.some((s) => s.tiles.some((t) => isOutside(t.kind)));
    case 'pureStraight':
      return straightDone(table);
  }
}

/** A dragon effect's contribution to a table: chips, mult and a ×mult. */
export function effectValue(
  e: DragonEffect,
  table: readonly PlayedSet[],
): { chips: number; mult: number; x: number } {
  let chips = 0;
  let mult = 0;
  let x = 1;
  switch (e.type) {
    case 'flat':
      chips = e.chips ?? 0;
      mult = e.mult ?? 0;
      break;
    case 'perSet': {
      const n = table.filter((s) => e.sets.includes(s.kind)).length;
      chips = (e.chips ?? 0) * n;
      mult = (e.mult ?? 0) * n;
      break;
    }
    case 'perTileSuit':
      chips =
        e.chips *
        table.reduce((n, s) => n + s.tiles.filter((t) => suitOf(t.kind) === e.suit).length, 0);
      break;
    case 'perOutsideSet':
      mult =
        e.mult *
        table.filter((s) => s.kind !== 'single' && s.tiles.some((t) => isOutside(t.kind))).length;
      break;
    case 'perWindSet':
      mult =
        e.mult *
        table.filter(
          (s) => s.kind === 'winds' || (isBig(s.kind) && isWind((s.tiles[0] as Tile).kind)),
        ).length;
      break;
    case 'perSetTile':
      mult = e.mult * table.reduce((n, s) => n + (e.sets.includes(s.kind) ? s.tiles.length : 0), 0);
      break;
    case 'xIf':
      if (conditionHolds(e.when, table)) x = e.x;
      break;
    case 'xPerSet':
      x = e.x ** table.filter((s) => e.sets.includes(s.kind)).length;
      break;
    case 'xPerIdenticalPair':
      x = e.x ** identicalPairs(table);
      break;
    case 'mod':
    case 'income':
      break;
  }
  return { chips, mult, x };
}

/**
 * Score a table: each set adds its chips and mult, then the dragons apply left to right, then
 * score = floor(chips × mult × product of the ×mult effects). Every step is returned so the UI can
 * count it up.
 */
export function scoreTable(table: readonly PlayedSet[], ctx: ScoreContext): ScoreResult {
  const steps: ScoreStep[] = [];
  const mods = ctx.modifiers ?? {};
  let chips = 0;
  let mult = 0;
  let x = 1;
  table.forEach((set, index) => {
    const type = SET_TYPES[set.kind];
    const lv = ctx.levels[set.kind] ?? 0;
    const tc = set.tiles.reduce((n, t) => n + tileChips(t.kind), 0);
    const cx = mods.chipsX?.[set.kind] ?? 1;
    const setChips = type.chips * cx;
    const levelChips = type.levelChips * lv * cx;
    const tileC = tc * cx;
    let enhChips = 0;
    let enhMult = 0;
    let enhX = 1;
    let twistMult = mods.setMult?.[set.kind] ?? 0;
    for (const t of set.tiles) {
      twistMult += mods.tileMult?.[t.id] ?? 0;
      if (!t.enh) continue;
      const en = ENHANCEMENTS[t.enh];
      enhChips += en.chips;
      enhMult += en.mult;
      enhX *= en.xmult;
    }
    chips += setChips + levelChips + tileC + enhChips;
    const sm = type.mult;
    const lm = type.levelMult * lv;
    mult += sm + lm + enhMult + twistMult;
    x *= enhX;
    steps.push({
      type: 'set',
      index,
      kind: set.kind,
      setChips,
      levelChips,
      tileChips: tileC,
      enhChips,
      setMult: sm,
      levelMult: lm,
      enhMult,
      twistMult,
      enhX,
      chips,
      mult,
      x,
    });
  });
  for (const id of ctx.dragons) {
    const dragon = DRAGONS[id];
    if (!dragon) continue;
    let addChips = 0;
    let addMult = 0;
    let cx = 1;
    for (const e of dragon.effects) {
      const v = effectValue(e, table);
      addChips += v.chips;
      addMult += v.mult;
      cx *= v.x;
    }
    if (addChips === 0 && addMult === 0 && cx === 1) continue;
    chips += addChips;
    mult += addMult;
    x *= cx;
    steps.push({ type: 'dragon', id, addChips, addMult, x: cx, chips, mult, xTotal: x });
  }
  const penalty = mods.penalty ?? 0;
  const tx = mods.xmult ?? 1;
  if (tx !== 1 || penalty !== 0) {
    x *= tx;
    steps.push({ type: 'twist', addMult: 0, x: tx, penalty, chips, mult, xTotal: x });
  }
  const total = Math.max(0, Math.floor(chips * mult * x) - penalty);
  return { steps, chips, mult, x, total };
}
