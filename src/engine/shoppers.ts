import { CURIO_SLOTS } from '@/content/curios';
import type { FortuneId } from '@/content/fortunes';
import { FORTUNE_SLOTS } from '@/content/fortunes';
import type { SuitedSuit } from '@/content/tiles';
import { type Policy, playOut } from './ai';
import { type Rng, deriveSeed } from './rng';
import { dealRound, runReduce } from './run';
import type { FortuneArgs, RunState } from './runTypes';
import { type Tile, isOutside, isSuited, rankOf, suitOf } from './tiles';

/**
 * The simulator's shoppers (tools/sim-py/runsim.py). `smart` tries every item it can afford on its
 * current build, on the same seeded rounds with and without it, and buys the best gain per mon
 * until nothing helps. `casual` buys random affordable items.
 */
export interface ShopperOptions {
  /** How many tiles a Fire may destroy at most. */
  readonly fire: number;
  /** Rounds per evaluation. */
  readonly evalSeeds: number;
}

export const DEFAULT_SHOPPER: ShopperOptions = { fire: 6, evalSeeds: 12 };

const SUIT_CURIOS = ['bambooGrove', 'coinPurse', 'scroll', 'twoSuits'];

/** The mean score of the bot over seeded rounds with this build. */
export function estimate(run: RunState, seeds: readonly number[], policy: Policy): number {
  let total = 0;
  for (const seed of seeds) {
    const round = dealRound(run, deriveSeed(seed, 'estimate'));
    total += playOut(round, policy).result?.score.total ?? 0;
  }
  return total / seeds.length;
}

function prefSuit(run: RunState): SuitedSuit {
  for (const [c, s] of [
    ['bambooGrove', 's'],
    ['coinPurse', 'p'],
    ['scroll', 'm'],
  ] as const)
    if (run.curios.includes(c)) return s;
  const n = new Map<string, number>();
  for (const t of run.tiles)
    if (isSuited(t.kind)) n.set(suitOf(t.kind), (n.get(suitOf(t.kind)) ?? 0) + 1);
  let best: SuitedSuit = 's';
  let bn = -1;
  for (const s of ['m', 'p', 's'] as const) {
    if ((n.get(s) ?? 0) > bn) {
      bn = n.get(s) ?? 0;
      best = s;
    }
  }
  return best;
}

/** Deterministic choices for a fortune, given the build (null if it would do nothing). */
export function fortuneArgsFor(
  run: RunState,
  f: FortuneId,
  opts: ShopperOptions,
): FortuneArgs | null {
  const pref = prefSuit(run);
  const byKind = (kind: string): Tile | undefined =>
    run.tiles.find((t) => t.kind === kind && !t.enh);
  const suited = run.tiles.filter((t) => isSuited(t.kind));
  const hasSuitCurio = SUIT_CURIOS.some((c) => run.curios.includes(c));
  switch (f) {
    case 'rubbing': {
      for (const n of [5, 4, 6, 3, 7, 2, 8]) {
        const kind = `${pref}${n}`;
        if (run.tiles.filter((t) => t.kind === kind).length === 3) {
          const t = run.tiles.find((x) => x.kind === kind);
          return t ? { tileIds: [t.id] } : null;
        }
      }
      return null;
    }
    case 'fire': {
      let out: Tile[];
      if (run.curios.includes('allSimples')) out = run.tiles.filter((t) => isOutside(t.kind));
      else if (hasSuitCurio)
        out = suited
          .filter((t) => suitOf(t.kind) !== pref)
          .sort((a, b) => Math.abs(rankOf(b.kind) - 5) - Math.abs(rankOf(a.kind) - 5));
      else out = suited.filter((t) => rankOf(t.kind) === 1 || rankOf(t.kind) === 9);
      const ids = out.slice(0, opts.fire).map((t) => t.id);
      return ids.length ? { tileIds: ids } : null;
    }
    case 'brush': {
      if (!hasSuitCurio) return null;
      const ids = suited
        .filter((t) => suitOf(t.kind) !== pref && rankOf(t.kind) >= 3 && rankOf(t.kind) <= 7)
        .slice(0, 3)
        .map((t) => t.id);
      return ids.length ? { tileIds: ids, suit: pref } : null;
    }
    case 'jade':
    case 'bone': {
      const ids = [byKind(`${pref}5`), byKind(`${pref}4`)]
        .filter((t): t is Tile => !!t)
        .map((t) => t.id);
      return ids.length ? { tileIds: ids } : null;
    }
    case 'gold':
      return null;
  }
}

/** Every way to spend on one shop item: the resulting runs (a pack gives one per offer). */
function purchases(
  run: RunState,
  what: 'curio' | 'almanac' | 'fortune' | 'pack',
  index: number,
  opts: ShopperOptions,
): { price: number; label: string; state: RunState }[] {
  const shop = run.shop;
  if (!shop) return [];
  const price = (
    what === 'curio'
      ? shop.curios[index]
      : what === 'almanac'
        ? shop.almanac[index]
        : what === 'fortune'
          ? shop.fortunes[index]
          : shop.pack
  )?.price;
  if (price === undefined) return [];
  const bought = runReduce(run, { type: 'buy', what, index });
  if (bought.state === run) return [];
  const s = bought.state;
  const label = (
    what === 'curio'
      ? `curio:${shop.curios[index]?.item}`
      : what === 'almanac'
        ? `almanac:${shop.almanac[index]?.item}`
        : what === 'fortune'
          ? `fortune:${shop.fortunes[index]?.item}`
          : `pack:${shop.pack.item}`
  ) as string;
  if (what === 'fortune') {
    const id = shop.fortunes[index]?.item as FortuneId;
    const args = fortuneArgsFor(run, id, opts);
    if (!args) return [];
    const used = runReduce(s, { type: 'fortune', index: s.fortunes.length - 1, args });
    return used.state === s ? [] : [{ price, label, state: used.state }];
  }
  if (what === 'pack') {
    const offers = s.shop?.open?.offers ?? [];
    return offers.map((_, i) => ({
      price,
      label: `${label}#${i}`,
      state: runReduce(s, { type: 'pack', pick: i }).state,
    }));
  }
  return [{ price, label, state: s }];
}

function canBuy(run: RunState, what: 'curio' | 'almanac' | 'fortune' | 'pack'): boolean {
  if (what === 'curio' && run.curios.length >= CURIO_SLOTS) return false;
  if (what === 'fortune' && run.fortunes.length >= FORTUNE_SLOTS) return false;
  return true;
}

const ITEMS = (
  run: RunState,
): { what: 'curio' | 'almanac' | 'fortune' | 'pack'; index: number }[] => {
  const shop = run.shop;
  if (!shop) return [];
  return [
    ...shop.curios.map((_, index) => ({ what: 'curio' as const, index })),
    ...shop.almanac.map((_, index) => ({ what: 'almanac' as const, index })),
    ...shop.fortunes.map((_, index) => ({ what: 'fortune' as const, index })),
    { what: 'pack' as const, index: 0 },
  ];
};

function isSold(
  run: RunState,
  what: 'curio' | 'almanac' | 'fortune' | 'pack',
  index: number,
): boolean {
  const shop = run.shop;
  if (!shop) return true;
  const o =
    what === 'curio'
      ? shop.curios[index]
      : what === 'almanac'
        ? shop.almanac[index]
        : what === 'fortune'
          ? shop.fortunes[index]
          : shop.pack;
  return !o || o.sold;
}

export interface ShopResult {
  readonly run: RunState;
  readonly policy: Policy;
  readonly bought: readonly string[];
}

/** The calmed spirit's gift: the smart shopper takes the best of the offers; a row that is full declines. */
export function giftSmart(run: RunState, seeds: readonly number[], policy: Policy): RunState {
  const gift = run.gift;
  if (!gift) return run;
  if (run.curios.length >= CURIO_SLOTS) return runReduce(run, { type: 'gift', pick: null }).state;
  let bestI = 0;
  let bestE = -Infinity;
  gift.offers.forEach((_, i) => {
    const st = runReduce(run, { type: 'gift', pick: i }).state;
    const e = estimate(st, seeds, policy);
    if (e > bestE) {
      bestE = e;
      bestI = i;
    }
  });
  return runReduce(run, { type: 'gift', pick: bestI }).state;
}

export function giftCasual(run: RunState, rng: Rng): RunState {
  const gift = run.gift;
  if (!gift) return run;
  if (run.curios.length >= CURIO_SLOTS) return runReduce(run, { type: 'gift', pick: null }).state;
  return runReduce(run, { type: 'gift', pick: rng.int(gift.offers.length) }).state;
}

export function shopSmart(
  start: RunState,
  seeds: readonly number[],
  policy: Policy,
  opts: ShopperOptions = DEFAULT_SHOPPER,
): ShopResult {
  let run = start;
  let base = estimate(run, seeds, policy);
  const bought: string[] = [];
  for (;;) {
    let best: { gain: number; label: string; state: RunState; e: number } | null = null;
    for (const { what, index } of ITEMS(run)) {
      if (isSold(run, what, index) || !canBuy(run, what)) continue;
      for (const p of purchases(run, what, index, opts)) {
        if (p.price > run.money) continue;
        const e = estimate(p.state, seeds, policy);
        const gain = (e - base) / p.price;
        if (e > base * 1.03 && (!best || gain > best.gain))
          best = { gain, label: p.label, state: p.state, e };
      }
    }
    if (!best) break;
    run = best.state;
    base = best.e;
    bought.push(best.label);
  }
  const g = estimate(run, seeds, 'greedy');
  const p = estimate(run, seeds, 'pongs');
  return { run, policy: p > g ? 'pongs' : 'greedy', bought };
}

export function shopCasual(
  start: RunState,
  rng: Rng,
  opts: ShopperOptions = DEFAULT_SHOPPER,
): ShopResult {
  let run = start;
  const bought: string[] = [];
  const order = rng.shuffle(ITEMS(run));
  let packBought = false;
  for (const { what, index } of order) {
    if (what === 'pack' && packBought) continue;
    if (isSold(run, what, index) || !canBuy(run, what)) continue;
    const options = purchases(run, what, index, opts);
    const first = options[0];
    if (!first || first.price > run.money) continue;
    if (rng.next() < 0.7) {
      const pick = rng.pick(options);
      run = pick.state;
      bought.push(pick.label);
      if (what === 'pack') packBought = true;
    }
  }
  return { run, policy: 'greedy', bought };
}
