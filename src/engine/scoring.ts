import { CHARMS } from '@/content/charms';
import { ENHANCEMENTS } from '@/content/enhancements';
import { CHICKEN, PATTERN_BY_ID, type PatternId, VALUE_SETS } from '@/content/patterns';
import { RULES } from '@/content/rules';
import { SETS } from '@/content/sets';
import { suitOf, isOutside, isSuited, isTerminal, isWind, isDragon, tileChips } from './tiles';
import { type PSet, patternsOf } from './patterns';
import type { RackSet } from './sets';
import type { TileKind } from '@/content/tiles';

/** One step of the score count, in the order the UI counts it up. */
export interface ScoreStep {
  readonly source: 'set' | 'hand' | 'pattern' | 'value' | 'enh' | 'bonus' | 'charm';
  /** What it is: a set index, a pattern id, a charm id, a kind. */
  readonly ref: string;
  readonly label: string;
  readonly chips?: number;
  readonly mult?: number;
  readonly xmult?: number;
  readonly money?: number;
}

export interface HandScore {
  readonly steps: readonly ScoreStep[];
  readonly patterns: readonly PatternId[];
  readonly chips: number;
  readonly mult: number;
  readonly xmult: number;
  readonly total: number;
  readonly money: number;
}

export interface ScoreContext {
  /** The round's wind, 1-4. */
  readonly wind: number;
  readonly charms: readonly string[];
  /** Pattern levels (0 = unlevelled). */
  readonly levels: Partial<Record<PatternId, number>>;
}

export function toPSets(rack: readonly RackSet[]): PSet[] {
  return rack.map((s) => ({ kind: s.kind, tiles: s.tiles.map((t) => t.kind) }));
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Score a finished hand: its sets, the flowers and seasons on the shelf, and your charms. */
export function scoreHand(
  rack: readonly RackSet[],
  shelf: readonly TileKind[],
  ctx: ScoreContext,
): HandScore {
  const steps: ScoreStep[] = [];
  const sets = toPSets(rack);
  const tiles = rack.flatMap((s) => s.tiles);

  // 1. each set: its own chips and mult, plus its tiles' chips
  rack.forEach((s, i) => {
    const def = SETS[s.kind];
    const chips = def.chips + s.tiles.reduce((a, t) => a + tileChips(t.kind), 0);
    steps.push({ source: 'set', ref: String(i), label: def.name, chips, mult: def.mult });
  });

  // 2. the hand itself (the Chicken hand, levelled)
  const lv = ctx.levels.chicken ?? 0;
  steps.push({
    source: 'hand',
    ref: 'chicken',
    label: 'Mahjong!',
    chips: CHICKEN.chips + lv * CHICKEN.levelChips,
    mult: CHICKEN.mult + lv * CHICKEN.levelMult,
  });

  // 3. enhanced faces
  for (const t of tiles) {
    if (!t.enh) continue;
    const e = ENHANCEMENTS[t.enh];
    steps.push({
      source: 'enh',
      ref: t.enh,
      label: e.name,
      ...(e.chips ? { chips: e.chips } : {}),
      ...(e.mult ? { mult: e.mult } : {}),
      ...(e.xmult !== 1 ? { xmult: e.xmult } : {}),
      ...(e.money ? { money: e.money } : {}),
    });
  }

  // 4. flowers and seasons
  const double = ctx.charms.some((c) => CHARMS[c]?.effect.type === 'bonusDouble') ? 2 : 1;
  for (const k of shelf) {
    const own = Number(k.slice(1)) === ctx.wind ? RULES.bonus.ownWind : 1;
    if (suitOf(k) === 'f')
      steps.push({
        source: 'bonus',
        ref: k,
        label: 'Flower',
        chips: RULES.bonus.flowerChips * own * double,
      });
    else
      steps.push({
        source: 'bonus',
        ref: k,
        label: 'Season',
        mult: RULES.bonus.seasonMult * own * double,
      });
  }
  for (const suit of ['f', 'q'] as const) {
    const have = new Set(shelf.filter((k) => suitOf(k) === suit));
    if (have.size === 4)
      steps.push({
        source: 'bonus',
        ref: suit,
        label: suit === 'f' ? 'Four flowers' : 'Four seasons',
        xmult: RULES.bonus.fullSetX,
      });
  }

  // 5. patterns
  const patterns = patternsOf(sets).filter((p) => p !== 'chicken');
  for (const id of patterns) {
    const def = PATTERN_BY_ID[id];
    const x = round2(def.xmult + (ctx.levels[id] ?? 0) * def.step);
    steps.push({ source: 'pattern', ref: id, label: def.name, xmult: x });
  }

  // 6. value sets: the round's wind and the dragons, as pongs or kongs
  const dragonsCounted = !patterns.includes('bigDragons') && !patterns.includes('littleDragons');
  sets.forEach((s, i) => {
    if (s.kind !== 'pong' && s.kind !== 'kong') return;
    const k = s.tiles[0] as TileKind;
    if (isWind(k) && Number(k.slice(1)) === ctx.wind)
      steps.push({
        source: 'value',
        ref: String(i),
        label: 'Round wind',
        xmult: VALUE_SETS.roundWind,
      });
    if (isDragon(k) && dragonsCounted)
      steps.push({ source: 'value', ref: String(i), label: 'Dragon', xmult: VALUE_SETS.dragon });
  });

  // 7. charms, left to right
  for (const id of ctx.charms) {
    const c = CHARMS[id];
    if (!c) continue;
    const e = c.effect;
    const step = (x: Partial<ScoreStep>) =>
      steps.push({ source: 'charm', ref: id, label: c.name, ...x });
    switch (e.type) {
      case 'chips':
        step({ chips: e.amount });
        break;
      case 'mult':
        step({ mult: e.amount });
        break;
      case 'multPerSet': {
        const n = sets.filter((s) => s.kind === e.set).length;
        if (n) step({ mult: e.amount * n });
        break;
      }
      case 'chipsPerSuitTile': {
        const n = tiles.filter((t) => suitOf(t.kind) === e.suit).length;
        if (n) step({ chips: e.amount * n });
        break;
      }
      case 'multPerOutsideSet': {
        const n = sets.filter((s) => s.tiles.some(isOutside)).length;
        if (n) step({ mult: e.amount * n });
        break;
      }
      case 'multPerWindSet': {
        const n = sets.filter(
          (s) => (s.kind === 'pong' || s.kind === 'kong') && isWind(s.tiles[0] as string),
        ).length;
        if (n) step({ mult: e.amount * n });
        break;
      }
      case 'multPerPongTile': {
        const n = sets
          .filter((s) => s.kind === 'pong' || s.kind === 'kong')
          .reduce((a, s) => a + s.tiles.length, 0);
        if (n) step({ mult: e.amount * n });
        break;
      }
      case 'xmultIfPongs': {
        const n = sets.filter((s) => s.kind === 'pong' || s.kind === 'kong').length;
        if (n >= e.count) step({ xmult: e.amount });
        break;
      }
      case 'xmultIfSimples':
        if (tiles.every((t) => isSuited(t.kind) && !isTerminal(t.kind))) step({ xmult: e.amount });
        break;
      case 'xmultPerKong': {
        const n = sets.filter((s) => s.kind === 'kong').length;
        if (n) step({ xmult: round2(e.amount ** n) });
        break;
      }
      case 'xmultPerTwin': {
        const keys = sets
          .filter((s) => s.kind !== 'pair')
          .map((s) => `${s.kind}:${s.tiles.slice().sort().join(',')}`);
        const counts = new Map<string, number>();
        for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
        let twins = 0;
        for (const n of counts.values()) twins += Math.floor(n / 2);
        if (twins) step({ xmult: round2(e.amount ** twins) });
        break;
      }
      default:
        break;
    }
  }

  let chips = 0;
  let mult = 0;
  let xmult = 1;
  let money = 0;
  for (const s of steps) {
    chips += s.chips ?? 0;
    mult += s.mult ?? 0;
    xmult *= s.xmult ?? 1;
    money += s.money ?? 0;
  }
  const total = Math.floor(chips * mult * xmult + 1e-9);
  return { steps, patterns, chips, mult, xmult: round2(xmult), total, money };
}
