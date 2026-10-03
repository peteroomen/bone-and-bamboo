import { CHASE, PATTERNS, type PatternId } from '@/content/handChase';
import { Rng } from './rng';
import { findSets } from './sets';
import { type Tile, isSuited, rankOf, tileChips } from './tiles';
import type { PlayedSet } from './scoring';

export const CHASE_KINDS = [
  ...['p', 's', 'm'].flatMap((s) => Array.from({ length: 9 }, (_, i) => `${s}${i + 1}`)),
  'w1',
  'w2',
  'w3',
  'w4',
];
export type ChaseLevels = Partial<Record<PatternId, number>>;
export interface HandScore {
  readonly sets: readonly PlayedSet[];
  readonly ids: readonly number[];
  readonly patterns: readonly PatternId[];
  readonly complete: boolean;
  readonly chips: number;
  readonly mult: number;
  readonly total: number;
  readonly name: string;
}

function scored(
  sets: readonly PlayedSet[],
  complete: boolean,
  seven: boolean,
  levels: ChaseLevels,
): HandScore {
  const tiles = sets.flatMap((s) => s.tiles);
  const patterns: PatternId[] = [];
  let chips: number;
  let mult: number;
  if (!complete) {
    const k = sets[0]?.kind;
    chips = k && k in CHASE.fallback ? CHASE.fallback[k as keyof typeof CHASE.fallback] : 0;
    mult = 1;
  } else {
    chips = CHASE.completeChips + tiles.reduce((n, t) => n + tileChips(t.kind), 0);
    mult = CHASE.completeMult;
    patterns.push('complete');
    if (seven) patterns.push('sevenPairs');
    const melds = sets.filter((s) => s.kind !== 'pair');
    if (!seven && melds.every((s) => s.kind === 'pong' || s.kind === 'kong'))
      patterns.push('allPongs');
    const suits = new Set(tiles.filter((t) => isSuited(t.kind)).map((t) => t.kind[0]));
    const winds = tiles.some((t) => !isSuited(t.kind));
    if (suits.size === 1) patterns.push(winds ? 'halfFlush' : 'fullFlush');
    if (tiles.every((t) => isSuited(t.kind) && rankOf(t.kind) > 1 && rankOf(t.kind) < 9))
      patterns.push('allSimples');
    const starts = new Set(melds.filter((s) => s.kind === 'chow').map((s) => s.tiles[0]?.kind));
    if (['p', 's', 'm'].some((s) => [1, 4, 7].every((r) => starts.has(`${s}${r}`))))
      patterns.push('pureStraight');
    if (
      Array.from({ length: 7 }, (_, i) => i + 1).some((r) =>
        ['p', 's', 'm'].every((s) => starts.has(`${s}${r}`)),
      )
    )
      patterns.push('mixedStraight');
    const windPongs = melds.filter(
      (s) => s.kind !== 'chow' && s.tiles[0]?.kind.startsWith('w'),
    ).length;
    if (windPongs) patterns.push('windPong');
    for (const id of patterns) {
      const p = PATTERNS.find((p) => p.id === id)!;
      mult +=
        p.mult * (id === 'windPong' ? windPongs : 1) +
        (levels[id] ?? 0) * (id === 'complete' ? CHASE.upgradeMult : CHASE.specialistUpgradeMult);
    }
  }
  return {
    sets,
    ids: tiles.map((t) => t.id),
    patterns,
    complete,
    chips,
    mult,
    total: chips * mult,
    name: complete
      ? patterns
          .filter((p) => p !== 'complete')
          .map((id) => PATTERNS.find((p) => p.id === id)!.name)
          .join(' + ') || 'Complete hand'
      : `${sets[0]?.kind ?? 'No'} · small hand`,
  };
}

/** Enumerate legal decompositions, including subsets of a larger rack. No tile can occur twice. */
export function handOptions(
  tiles: readonly Tile[],
  levels: ChaseLevels = {},
  exact = false,
): HandScore[] {
  if (new Set(tiles.map((t) => t.id)).size !== tiles.length) return [];
  const result: HandScore[] = [];
  const add = (sets: PlayedSet[], seven = false) => {
    const score = scored(sets, true, seven, levels);
    if (!exact || score.ids.length === tiles.length) result.push(score);
  };
  const walk = (rest: readonly Tile[], sets: PlayedSet[], minKey: string) => {
    if (sets.length === 5) {
      add(sets);
      return;
    }
    if (rest.length < (5 - sets.length) * 3) return;
    for (const c of findSets(rest)) {
      if (c.kind !== 'chow' && c.kind !== 'pong' && c.kind !== 'kong') continue;
      const key = `${c.kind}:${c.tiles[0]!.kind}`;
      if (key < minKey) continue;
      const used = new Set(c.tiles.map((t) => t.id));
      walk(
        rest.filter((t) => !used.has(t.id)),
        [...sets, c],
        key,
      );
    }
  };
  if (tiles.length >= 14) {
    const pairs = findSets(tiles).filter((c) => c.kind === 'pair');
    for (const pair of pairs) {
      const used = new Set(pair.tiles.map((t) => t.id));
      walk(
        tiles.filter((t) => !used.has(t.id)),
        [pair],
        '',
      );
    }
    const pickPairs = (start: number, chosen: PlayedSet[]) => {
      if (chosen.length === 7) {
        add(chosen, true);
        return;
      }
      for (let i = start; i <= pairs.length - (7 - chosen.length); i++)
        pickPairs(i + 1, [...chosen, pairs[i]!]);
    };
    pickPairs(0, []);
  }
  for (const c of findSets(tiles)) {
    if (c.kind === 'winds') continue; // Four different winds are not a meld in this prototype.
    if (!exact || c.tiles.length === tiles.length) result.push(scored([c], false, false, levels));
  }
  return result.sort((a, b) => b.total - a.total || b.ids.length - a.ids.length);
}

export function selectedHand(tiles: readonly Tile[], levels: ChaseLevels = {}): HandScore | null {
  return handOptions(tiles, levels, true)[0] ?? null;
}

export interface ChaseState {
  readonly version: 1;
  readonly seed: number;
  readonly wind: number;
  readonly rack: readonly Tile[];
  readonly pile: readonly Tile[];
  readonly spent: readonly Tile[];
  readonly discarded: readonly Tile[];
  readonly levels: ChaseLevels;
  readonly points: number;
  readonly plays: number;
  readonly exchanges: number;
  readonly phase: 'play' | 'upgrade' | 'won' | 'lost';
  readonly history: readonly HandScore[];
}
export type ChaseAction =
  | { type: 'play' | 'exchange'; ids: readonly number[] }
  | { type: 'bank' }
  | { type: 'upgrade'; pattern: PatternId };

function dealWind(seed: number, wind: number, levels: ChaseLevels): ChaseState {
  const rng = new Rng(seed + wind * 104729);
  const tiles = CHASE_KINDS.flatMap((kind, i) =>
    Array.from({ length: 4 }, (_, j) => ({ id: i * 4 + j + 1, kind })),
  );
  const shuffled = rng.shuffle(tiles);
  return {
    version: 1,
    seed,
    wind,
    rack: shuffled.slice(0, CHASE.rack),
    pile: shuffled.slice(CHASE.rack),
    spent: [],
    discarded: [],
    levels,
    points: 0,
    plays: CHASE.plays,
    exchanges: CHASE.exchanges,
    phase: 'play',
    history: [],
  };
}
export function newChase(seed: number): ChaseState {
  return dealWind(seed >>> 0, 0, {});
}
export function chaseTarget(s: ChaseState): number {
  return CHASE.targets[s.wind]!;
}

/** Independent scoring submissions; unplayed tiles stay in the rack. */
export function chaseReduce(s: ChaseState, a: ChaseAction): { state: ChaseState; error?: string } {
  const bad = (error: string) => ({ state: s, error });
  if (a.type === 'upgrade') {
    if (s.phase !== 'upgrade' || !PATTERNS.some((p) => p.id === a.pattern))
      return bad('Choose an upgrade after clearing a wind.');
    return {
      state: dealWind(s.seed, s.wind + 1, {
        ...s.levels,
        [a.pattern]: (s.levels[a.pattern] ?? 0) + 1,
      }),
    };
  }
  if (s.phase !== 'play') return bad('This wind is finished.');
  if (a.type === 'bank') {
    if (s.points < chaseTarget(s)) return bad('Reach the target before banking.');
    return { state: { ...s, phase: s.wind === 3 ? 'won' : 'upgrade' } };
  }
  const ids = new Set(a.ids);
  const tiles = s.rack.filter((t) => ids.has(t.id));
  if (!ids.size || ids.size !== a.ids.length || tiles.length !== ids.size)
    return bad('Select tiles from your rack, once each.');
  let next: ChaseState;
  if (a.type === 'exchange') {
    if (s.exchanges <= 0) return bad('No exchanges left.');
    if (ids.size > CHASE.exchangeSize) return bad(`Exchange up to ${CHASE.exchangeSize} tiles.`);
    if (!s.pile.length) return bad('The pile is empty.');
    next = { ...s, discarded: [...s.discarded, ...tiles], exchanges: s.exchanges - 1 };
  } else {
    if (s.plays <= 0) return bad('No scoring plays left.');
    const score = selectedHand(tiles, s.levels);
    if (!score) return bad('Choose one pair/meld, four melds + a pair, or seven distinct pairs.');
    next = {
      ...s,
      spent: [...s.spent, ...tiles],
      history: [...s.history, score],
      points: s.points + score.total,
      plays: s.plays - 1,
    };
  }
  const held = s.rack.filter((t) => !ids.has(t.id));
  const draw = Math.min(CHASE.rack - held.length, next.pile.length);
  next = { ...next, rack: [...held, ...next.pile.slice(0, draw)], pile: next.pile.slice(draw) };
  if (
    next.plays === 0 ||
    ((!next.pile.length || next.exchanges === 0) &&
      handOptions(next.rack, next.levels).length === 0)
  ) {
    next = {
      ...next,
      phase: next.points >= chaseTarget(next) ? (next.wind === 3 ? 'won' : 'upgrade') : 'lost',
    };
  }
  return { state: next };
}

/** Keep the most promising groups. Enumerates partial meld/pair structures; never sees pile order. */
export function chasePlan(rack: readonly Tile[]): {
  keep: readonly number[];
  melds: number;
  pairs: number;
  partials: number;
  label: string;
} {
  const by = CHASE_KINDS.map((k) => rack.filter((t) => t.kind === k));
  const counts = by.map((a) => a.length);
  let best = {
    value: -1,
    keep: [] as number[],
    melds: 0,
    pairs: 0,
    partials: 0,
    label: 'Four melds + a pair',
  };
  const used: number[] = [];
  // Identical residual states have identical possibilities; retain only the best path value.
  const memo = new Map<string, number>();
  const walk = (start: number, melds: number, pair: number, partials: number) => {
    const value = melds * 6 + pair * 3 + partials * 2;
    if (value > best.value || (value === best.value && used.length > best.keep.length))
      best = { value, keep: [...used], melds, pairs: pair, partials, label: 'Four melds + a pair' };
    let i = start;
    while (i < counts.length && counts[i] === 0) i++;
    if (i === counts.length) return;
    const key = `${i}:${counts.join('')}:${melds}:${pair}:${partials}`;
    if ((memo.get(key) ?? -1) >= value) return;
    memo.set(key, value);
    const take = (indices: number[], m: number, p: number, t: number) => {
      for (const n of indices) {
        counts[n]!--;
        used.push(by[n]![counts[n]!]!.id);
      }
      walk(i, m, p, t);
      used.splice(used.length - indices.length);
      for (const n of indices) counts[n]!++;
    };
    if (melds + partials < 4 && counts[i]! >= 3) take([i, i, i], melds + 1, pair, partials);
    if (melds + partials < 4 && i < 27 && i % 9 <= 6 && counts[i + 1]! > 0 && counts[i + 2]! > 0)
      take([i, i + 1, i + 2], melds + 1, pair, partials);
    if (counts[i]! >= 2 && !pair) take([i, i], melds, 1, partials);
    if (melds + partials < 4) {
      if (counts[i]! >= 2) take([i, i], melds, pair, partials + 1);
      if (i < 27)
        for (const d of [1, 2])
          if ((i % 9) + d < 9 && counts[i + d]! > 0) take([i, i + d], melds, pair, partials + 1);
    }
    counts[i]!--;
    walk(i, melds, pair, partials);
    counts[i]!++;
  };
  walk(0, 0, 0, 0);
  const pairs = by.filter((ts) => ts.length >= 2);
  const singles = by.filter((ts) => ts.length === 1);
  const pairValue = pairs.length * 4 + Math.min(7 - pairs.length, singles.length);
  if (pairValue > best.value)
    return {
      keep: [
        ...pairs.slice(0, 7).flatMap((ts) => ts.slice(0, 2).map((t) => t.id)),
        ...singles.slice(0, Math.max(0, 7 - pairs.length)).map((ts) => ts[0]!.id),
      ],
      melds: 0,
      pairs: pairs.length,
      partials: 0,
      label: 'Seven Pairs',
    };
  return best;
}

/** Kind counts are reconstructed only from known rack/spent/discarded tiles. */
export function improvingTiles(s: ChaseState): { kind: string; copies: number; total: number }[] {
  const known = [...s.rack, ...s.spent, ...s.discarded];
  const out: { kind: string; copies: number; total: number }[] = [];
  for (const kind of CHASE_KINDS) {
    const copies = 4 - known.filter((t) => t.kind === kind).length;
    if (copies <= 0) continue;
    const best = handOptions([...s.rack, { id: 1000, kind }], s.levels).find(
      (o) => o.complete && o.ids.includes(1000) && o.ids.length <= CHASE.rack,
    );
    if (best) out.push({ kind, copies, total: best.total });
  }
  return out;
}

export function chaseAdvice(s: ChaseState): ChaseAction {
  if (s.points >= chaseTarget(s)) return { type: 'bank' };
  const best = handOptions(s.rack, s.levels)[0];
  if (best?.complete || (best && s.points + best.total >= chaseTarget(s)))
    return { type: 'play', ids: best.ids };
  if (s.exchanges > 0 && s.pile.length) {
    const keep = new Set(chasePlan(s.rack).keep);
    const junk = s.rack.filter((t) => !keep.has(t.id));
    return {
      type: 'exchange',
      ids: (junk.length ? junk : s.rack.slice(-1)).slice(0, CHASE.exchangeSize).map((t) => t.id),
    };
  }
  if (best) return { type: 'play', ids: best.ids };
  return { type: 'exchange', ids: [] }; // No legal continuation: UI provides end/retry.
}
