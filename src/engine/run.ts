import { DRAGONS, DRAGON_IDS, DRAGON_SLOTS } from '@/content/dragons';
import { FORTUNE_SLOTS } from '@/content/fortunes';
import { type Twist, hostFor } from '@/content/hosts';
import { PACK_IDS, type PackId } from '@/content/packs';
import { STORM_TARGET_MULT, LANTERNS, TARGETS } from '@/content/targets';
import { GIFT, MONEY, SHOP } from '@/content/rules';
import { tileSetDef } from '@/content/tilesets';
import { autoRefill } from './ai';
import { applyFortune, fortuneProblem } from './fortunes';
import { Rng, deriveSeed, hashSeed } from './rng';
import {
  BASE_ROUND_RULES,
  type RoundEvent,
  type RoundRules,
  type RoundState,
  roundReduce,
  startRound,
} from './round';
import type { FortuneArgs, GiftState, Payout, RunAction, RunEvent, RunState } from './runTypes';
import { openPack, rerollPrice, rollDragons, rollShop, sellPrice } from './shop';
import { type Tile, buildTiles, countKinds } from './tiles';
import type { Reduced } from './round';
import type { ScoreStep } from './scoring';

export interface NewRunOptions {
  readonly seed: number | string;
  readonly tileSet?: string;
  readonly lantern?: number;
  /** Override the base targets (the simulator tries ladders). */
  readonly targets?: readonly number[];
  readonly packPool?: readonly PackId[];
  readonly guided?: boolean;
  readonly twistOverrides?: Readonly<Record<string, Twist>>;
  readonly stormMult?: number;
}

export function newRun(opts: NewRunOptions): RunState {
  const seed = typeof opts.seed === 'number' ? opts.seed >>> 0 : hashSeed(opts.seed);
  const tiles = buildTiles(opts.tileSet ?? 'boneBamboo');
  return {
    version: 1,
    seed,
    rng: deriveSeed(seed, 'run'),
    tileSet: opts.tileSet ?? 'boneBamboo',
    lantern: opts.lantern ?? 1,
    targets: opts.targets ?? TARGETS,
    packPool: opts.packPool ?? PACK_IDS,
    tiles,
    nextTileId: tiles.length + 1,
    money: MONEY.start,
    dragons: [],
    fortunes: [],
    levels: {},
    roundIndex: 0,
    phase: 'host',
    hostId: null,
    storm: false,
    target: targetFor(opts.lantern ?? 1, 0, false, opts.targets ?? TARGETS),
    round: null,
    payout: null,
    gift: null,
    shop: null,
    scores: [],
    stats: { bestRound: 0, roundsWon: 0, bigSet: 0 },
    hostIds: [],
    hostsBeaten: [],
    recorded: false,
    ...(opts.twistOverrides ? { twistOverrides: opts.twistOverrides } : {}),
    ...(opts.stormMult ? { stormMult: opts.stormMult } : {}),
    guided: opts.guided ?? false,
    tipsSeen: [],
  };
}

// ---- derived numbers ---------------------------------------------------------------------------
export function targetFor(
  lantern: number,
  roundIndex: number,
  storm: boolean,
  targets: readonly number[] = TARGETS,
  stormMult: number = STORM_TARGET_MULT,
): number {
  const l = LANTERNS[Math.max(0, Math.min(LANTERNS.length - 1, lantern - 1))];
  const base = (targets[roundIndex] ?? 0) * (l?.targetMult ?? 1) * (storm ? stormMult : 1);
  return Math.round(base / 50) * 50;
}

/** The round's numbers: the base rules, the tile set, the lantern and your dragons. */
export function roundRulesFor(run: Pick<RunState, 'dragons' | 'tileSet' | 'lantern'>): RoundRules {
  const set = tileSetDef(run.tileSet);
  const lantern = LANTERNS[run.lantern - 1];
  let hand = set.hand ?? BASE_ROUND_RULES.handSize;
  let discards = set.discards ?? BASE_ROUND_RULES.discards;
  if (lantern?.discards !== undefined) discards = Math.min(discards, lantern.discards);
  let plays = BASE_ROUND_RULES.plays;
  let peek = BASE_ROUND_RULES.peek;
  for (const id of run.dragons) {
    for (const e of DRAGONS[id]?.effects ?? []) {
      if (e.type !== 'mod') continue;
      hand += e.hand ?? 0;
      discards += e.discards ?? 0;
      plays += e.plays ?? 0;
      peek += e.peek ?? 0;
    }
  }
  return { ...BASE_ROUND_RULES, handSize: hand, discards, plays, peek };
}

export function dragonIncome(dragons: readonly string[]): number {
  let n = 0;
  for (const id of dragons)
    for (const e of DRAGONS[id]?.effects ?? []) if (e.type === 'income') n += e.money;
  return n;
}

export function interestFor(run: Pick<RunState, 'money' | 'lantern'>): number {
  const l = LANTERNS[run.lantern - 1];
  if (l && !l.interest) return 0;
  return Math.min(Math.floor(run.money / MONEY.interestPer), MONEY.interestCap);
}

export function roundSetup(
  run: RunState,
  rngState: number,
  target = run.target,
  twist: Twist | null = null,
) {
  return {
    tiles: run.tiles,
    rules: roundRulesFor(run),
    dragons: run.dragons,
    levels: run.levels,
    target,
    twist,
    rng: rngState,
  };
}

/** A new round for this run's current set, dragons and levels (also used by the simulator). */
export function dealRound(
  run: RunState,
  rngState = deriveSeed(run.seed, `round${run.roundIndex}`),
  target = run.target,
  twist: Twist | null = null,
): RoundState {
  return startRound(roundSetup(run, rngState, target, twist));
}

/** The points of the best single set in a score count: its chips × its mult. */
function biggestSet(steps: readonly ScoreStep[]): number {
  let best = 0;
  for (const st of steps) {
    if (st.type !== 'set') continue;
    const chips = st.setChips + st.levelChips + st.tileChips + st.enhChips;
    const mult = st.setMult + st.levelMult + st.enhMult + st.twistMult;
    best = Math.max(best, Math.floor(chips * mult * st.enhX));
  }
  return best;
}

// ---- the reducer -------------------------------------------------------------------------------
type R = Reduced<RunState, RunEvent>;

function illegal(s: RunState, reason: string): R {
  return { state: s, events: [{ type: 'illegal', reason }] };
}

function wrap(events: RoundEvent[]): RunEvent[] {
  return events.map((event) => ({ type: 'round', event }));
}

export function runReduce(s: RunState, a: RunAction): R {
  switch (a.type) {
    case 'chooseHost':
      return chooseHost(s, a.storm);
    case 'round':
      return roundAction(s, a.action);
    case 'auto': {
      if (s.phase !== 'round' || !s.round) return illegal(s, 'No round to refill.');
      const r = autoRefill(s.round, a.policy);
      return afterRound(s, r.state, r.events);
    }
    case 'continue':
      return proceed(s);
    case 'gift':
      return takeGift(s, a.pick, a.replace);
    case 'buy':
      return buy(s, a.what, a.index);
    case 'pack':
      return choosePack(s, a.pick);
    case 'reroll':
      return reroll(s);
    case 'burn':
      return burn(s, a.kind);
    case 'sell':
      return sell(s, a.index);
    case 'fortune':
      return useFortune(s, a.index, a.args);
    case 'leave':
      return leave(s);
    case 'record':
      return { state: { ...s, recorded: true }, events: [] };
    case 'tip':
      return s.tipsSeen.includes(a.id)
        ? { state: s, events: [] }
        : { state: { ...s, tipsSeen: [...s.tipsSeen, a.id] }, events: [] };
  }
}

function chooseHost(s: RunState, storm: boolean): R {
  if (s.phase !== 'host') return illegal(s, 'Not choosing a host.');
  const host = hostFor(s.roundIndex, storm);
  const target = targetFor(
    s.lantern,
    s.roundIndex,
    storm,
    s.targets,
    host.targetMult ?? s.stormMult,
  );
  // The lesson's first round is a plain one: no twist to explain yet.
  const plain = s.guided && s.roundIndex === 0;
  const round = dealRound(
    s,
    undefined,
    target,
    plain ? null : (s.twistOverrides?.[host.id] ?? host.twist),
  );
  return {
    state: {
      ...s,
      phase: 'round',
      storm,
      hostId: host.id,
      hostIds: [...s.hostIds, host.id],
      target,
      round,
    },
    events: [{ type: 'phase', phase: 'round' }],
  };
}

function roundAction(s: RunState, action: Parameters<typeof roundReduce>[1]): R {
  if (s.phase !== 'round' || !s.round) return illegal(s, 'No round is being played.');
  const r = roundReduce(s.round, action);
  return afterRound(s, r.state, r.events);
}

/** Fold a round's new state into the run, and settle the round if it just ended. */
function afterRound(s: RunState, round: RoundState, events: RoundEvent[]): R {
  const out: RunEvent[] = wrap(events);
  if (round.phase !== 'done' || !round.result) return { state: { ...s, round }, events: out };
  const result = round.result;
  const score = result.score.total;
  const cracked = new Set(result.cracked);
  const tiles = s.tiles.filter((t) => !cracked.has(t.id));
  const won = score >= s.target;
  const scores = [...s.scores, score];
  const stats = {
    ...s.stats,
    bestRound: Math.max(s.stats.bestRound, score),
    roundsWon: s.stats.roundsWon + (won ? 1 : 0),
    bigSet: Math.max(s.stats.bigSet, biggestSet(result.score.steps)),
  };
  const hostsBeaten = won && s.hostId ? [...s.hostsBeaten, s.hostId] : s.hostsBeaten;
  const base = { ...s, round, tiles, scores, stats, hostsBeaten };
  if (!won) {
    out.push({ type: 'phase', phase: 'over' });
    return { state: { ...base, phase: 'over' }, events: out };
  }
  if (s.roundIndex >= s.targets.length - 1) {
    out.push({ type: 'phase', phase: 'won' });
    return { state: { ...base, phase: 'won' }, events: out };
  }
  const reward = MONEY.rewards[s.roundIndex] ?? 0;
  const discards = result.unusedDiscards * MONEY.perUnusedDiscard;
  const interest = interestFor(s);
  const income = dragonIncome(s.dragons);
  const total = reward + discards + interest + income + result.gold;
  const payout: Payout = { reward, discards, interest, income, gold: result.gold, total };
  out.push({ type: 'phase', phase: 'payout' }, { type: 'money', delta: total });
  return { state: { ...base, phase: 'payout', payout, money: s.money + total }, events: out };
}

/** payout -> gift (or straight to the shop when there is nothing to give). */
function proceed(s: RunState): R {
  if (s.phase !== 'payout') return illegal(s, 'Nothing to continue.');
  const pool = DRAGON_IDS.filter((id) => DRAGONS[id]?.rarity === 'rare' && !s.dragons.includes(id));
  if (pool.length === 0) return enterShop({ ...s, payout: null });
  const rng = new Rng(s.rng);
  const n = s.storm ? GIFT.stormOffers : GIFT.calmOffers;
  const offers = rng.shuffle(pool).slice(0, n);
  const bonus = s.storm ? GIFT.stormMoney : 0;
  const gift: GiftState = { offers, bonus };
  return {
    state: { ...s, rng: rng.state, phase: 'gift', gift, payout: null, money: s.money + bonus },
    events: [
      { type: 'phase', phase: 'gift' },
      ...(bonus ? [{ type: 'money' as const, delta: bonus }] : []),
    ],
  };
}

function enterShop(s: RunState): R {
  const rng = new Rng(s.rng);
  const shop = rollShop(s, rng);
  return {
    state: { ...s, rng: rng.state, phase: 'shop', gift: null, shop },
    events: [{ type: 'phase', phase: 'shop' }],
  };
}

function takeGift(s: RunState, pick: number | null, replace?: number): R {
  if (s.phase !== 'gift' || !s.gift) return illegal(s, 'No gift to take.');
  let dragons = s.dragons;
  if (pick !== null) {
    const id = s.gift.offers[pick];
    if (id === undefined) return illegal(s, 'No such gift.');
    if (dragons.length >= DRAGON_SLOTS) {
      if (replace === undefined || replace < 0 || replace >= dragons.length)
        return illegal(s, 'Your dragons are full: swap one out or decline.');
      dragons = dragons.map((c, i) => (i === replace ? id : c));
    } else dragons = [...dragons, id];
  }
  return enterShop({ ...s, dragons });
}

// ---- the teahouse ------------------------------------------------------------------------------
function buy(s: RunState, what: 'dragon' | 'almanac' | 'fortune' | 'pack', index: number): R {
  const shop = s.shop;
  if (s.phase !== 'shop' || !shop) return illegal(s, 'The teahouse is closed.');
  if (shop.open) return illegal(s, 'Finish opening the pack first.');
  switch (what) {
    case 'dragon': {
      const o = shop.dragons[index];
      if (!o || o.sold) return illegal(s, 'Sold.');
      if (s.money < o.price) return illegal(s, 'Not enough money.');
      if (s.dragons.length >= DRAGON_SLOTS) return illegal(s, 'Your dragon row is full.');
      const dragons = shop.dragons.map((x, i) => (i === index ? { ...x, sold: true } : x));
      return ok(
        {
          ...s,
          money: s.money - o.price,
          dragons: [...s.dragons, o.item],
          shop: { ...shop, dragons },
        },
        -o.price,
      );
    }
    case 'almanac': {
      const o = shop.almanac[index];
      if (!o || o.sold) return illegal(s, 'Sold.');
      if (s.money < o.price) return illegal(s, 'Not enough money.');
      const almanac = shop.almanac.map((x, i) => (i === index ? { ...x, sold: true } : x));
      const levels = { ...s.levels, [o.item]: (s.levels[o.item] ?? 0) + 1 };
      return ok({ ...s, money: s.money - o.price, levels, shop: { ...shop, almanac } }, -o.price);
    }
    case 'fortune': {
      const o = shop.fortunes[index];
      if (!o || o.sold) return illegal(s, 'Sold.');
      if (s.money < o.price) return illegal(s, 'Not enough money.');
      if (s.fortunes.length >= FORTUNE_SLOTS) return illegal(s, 'Your fortune pocket is full.');
      const fortunes = shop.fortunes.map((x, i) => (i === index ? { ...x, sold: true } : x));
      return ok(
        {
          ...s,
          money: s.money - o.price,
          fortunes: [...s.fortunes, o.item],
          shop: { ...shop, fortunes },
        },
        -o.price,
      );
    }
    case 'pack': {
      const o = shop.pack;
      if (o.sold) return illegal(s, 'Sold.');
      if (s.money < o.price) return illegal(s, 'Not enough money.');
      const rng = new Rng(s.rng);
      const open = openPack(o.item, s, rng);
      return ok(
        {
          ...s,
          rng: rng.state,
          money: s.money - o.price,
          shop: { ...shop, pack: { ...o, sold: true }, open },
        },
        -o.price,
      );
    }
  }
}

function ok(state: RunState, delta = 0): R {
  return { state, events: delta ? [{ type: 'money', delta }] : [] };
}

function choosePack(s: RunState, pick: number | null): R {
  const shop = s.shop;
  if (s.phase !== 'shop' || !shop?.open) return illegal(s, 'No pack is open.');
  let next: RunState = { ...s, shop: { ...shop, open: undefined } };
  if (pick !== null) {
    const offer = shop.open.offers[pick];
    if (!offer) return illegal(s, 'No such offer.');
    if (offer.type === 'page') {
      next = {
        ...next,
        levels: { ...next.levels, [offer.set]: (next.levels[offer.set] ?? 0) + 1 },
      };
    } else {
      let id = s.nextTileId;
      const added = offer.kinds.map((kind) => ({ id: id++, kind }));
      next = { ...next, tiles: [...next.tiles, ...added], nextTileId: id };
    }
  }
  return ok(next);
}

function reroll(s: RunState): R {
  const shop = s.shop;
  if (s.phase !== 'shop' || !shop) return illegal(s, 'The teahouse is closed.');
  if (shop.open) return illegal(s, 'Finish opening the pack first.');
  const price = rerollPrice(shop);
  if (s.money < price) return illegal(s, 'Not enough money.');
  const rng = new Rng(s.rng);
  const dragons = rollDragons(s.dragons, rng);
  return ok(
    {
      ...s,
      rng: rng.state,
      money: s.money - price,
      shop: { ...shop, dragons, rerolls: shop.rerolls + 1 },
    },
    -price,
  );
}

function burn(s: RunState, kind: string): R {
  const shop = s.shop;
  if (s.phase !== 'shop' || !shop) return illegal(s, 'The teahouse is closed.');
  if (shop.burned) return illegal(s, 'You already burned a kind this visit.');
  if (s.money < SHOP.burnPrice) return illegal(s, 'Not enough money.');
  if (!countKinds(s.tiles).has(kind)) return illegal(s, 'You have none of that tile.');
  return ok(
    {
      ...s,
      money: s.money - SHOP.burnPrice,
      tiles: s.tiles.filter((t) => t.kind !== kind),
      shop: { ...shop, burned: true },
    },
    -SHOP.burnPrice,
  );
}

function sell(s: RunState, index: number): R {
  if (s.phase !== 'shop' && s.phase !== 'gift') return illegal(s, 'Nothing to sell to.');
  const id = s.dragons[index];
  if (id === undefined) return illegal(s, 'No such dragon.');
  const price = sellPrice(id);
  return ok(
    { ...s, money: s.money + price, dragons: s.dragons.filter((_, i) => i !== index) },
    price,
  );
}

function leave(s: RunState): R {
  if (s.phase !== 'shop' || !s.shop) return illegal(s, 'Not in the teahouse.');
  if (s.shop.open) return illegal(s, 'Finish opening the pack first.');
  return {
    state: {
      ...s,
      phase: 'host',
      roundIndex: s.roundIndex + 1,
      shop: null,
      round: null,
      hostId: null,
      storm: false,
      target: targetFor(s.lantern, s.roundIndex + 1, false, s.targets),
    },
    events: [{ type: 'phase', phase: 'host' }],
  };
}

// ---- fortunes ----------------------------------------------------------------------------------
/** The tiles a fortune may act on: the whole set in the teahouse, your hand in a round. */
export function fortunePool(s: RunState): readonly Tile[] {
  if (s.phase === 'round' && s.round?.phase === 'play') return s.round.hand;
  if (s.phase === 'shop') return s.tiles;
  return [];
}

function useFortune(s: RunState, index: number, args: FortuneArgs): R {
  const id = s.fortunes[index];
  if (id === undefined) return illegal(s, 'No such fortune.');
  const inRound = s.phase === 'round' && s.round?.phase === 'play';
  if (!inRound && !(s.phase === 'shop' && !s.shop?.open)) return illegal(s, 'Not now.');
  const pool = fortunePool(s);
  const problem = fortuneProblem(id, pool, args);
  if (problem) return illegal(s, problem);
  const out = applyFortune(id, s.tiles, s.nextTileId, args);
  let round = s.round;
  if (inRound && round) {
    const byId = new Map(out.tiles.map((t) => [t.id, t]));
    const removed = new Set(out.removed);
    const stacks = round.stacks.map((st) => st.slice());
    const rng = new Rng(round.rng);
    for (const t of out.added) {
      // A copy made in a round goes to the bottom of a random stack.
      const i = rng.int(stacks.length);
      (stacks[i] as (typeof t)[]).unshift(t);
    }
    round = {
      ...round,
      rng: rng.state,
      stacks,
      copies: Object.fromEntries(countKinds(out.tiles)),
      hand: round.hand.filter((t) => !removed.has(t.id)).map((t) => byId.get(t.id) ?? t),
    };
  }
  return {
    state: {
      ...s,
      tiles: out.tiles,
      nextTileId: out.nextTileId,
      fortunes: s.fortunes.filter((_, i) => i !== index),
      round,
    },
    events: [],
  };
}
