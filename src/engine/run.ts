import { CHARMS, CHARM_IDS, CHARM_SLOTS, RARITY_WEIGHT, charmPrice } from '@/content/charms';
import {
  DIE_TEMPLATES,
  GIFT_TEMPLATES,
  OFFERED_TEMPLATES,
  STARTING_KIT,
  STARTING_KITS,
} from '@/content/dice';
import { hostOf } from '@/content/hosts';
import { PATTERNS, type PatternId } from '@/content/patterns';
import { RULES } from '@/content/rules';
import { TOOLS, TOOL_IDS, TOOL_POCKET } from '@/content/tools';
import { type Die, fixedDie, makeDie, withFace } from './dice';
import { Rng, type RngState, deriveSeed, hashSeed } from './rng';
import {
  type RoundAction,
  type RoundEvent,
  type RoundState,
  charmEffects,
  createRound,
  cupSize,
  roundReducer,
} from './round';
import { type ToolArg, applyTool, toolProblem } from './tools';

export type Phase = 'round' | 'cashout' | 'gift' | 'shop' | 'over' | 'won';

export interface ShopOffer<T> {
  readonly item: T;
  readonly price: number;
  readonly sold: boolean;
}

export interface ShopState {
  readonly charms: readonly ShopOffer<string>[];
  readonly dice: readonly ShopOffer<Die>[];
  readonly tools: readonly ShopOffer<string>[];
  readonly pages: readonly ShopOffer<PatternId>[];
  readonly rerolls: number;
}

export interface CashLine {
  readonly label: string;
  readonly amount: number;
}

export interface RoundRecord {
  readonly index: number;
  readonly target: number;
  readonly score: number;
  readonly hands: number;
  readonly best: number;
  readonly patterns: readonly PatternId[];
}

export interface RunState {
  readonly seed: RngState;
  readonly rng: RngState;
  /** The score to beat in each round. */
  readonly targets: readonly number[];
  readonly round: number;
  readonly phase: Phase;
  readonly money: number;
  readonly dice: readonly Die[];
  readonly nextId: number;
  readonly charms: readonly string[];
  readonly tools: readonly string[];
  readonly levels: Partial<Record<PatternId, number>>;
  readonly current: RoundState | null;
  readonly cashout: readonly CashLine[] | null;
  readonly gift: readonly Die[] | null;
  readonly shop: ShopState | null;
  readonly history: readonly RoundRecord[];
  /** Ids of the charms and dice templates you have seen, for the collection. */
  readonly seen: readonly string[];
}

export type RunAction =
  | { readonly type: 'round'; readonly action: RoundAction }
  | { readonly type: 'collect' }
  | { readonly type: 'pickGift'; readonly index: number; readonly replace?: number }
  | { readonly type: 'skipGift' }
  | { readonly type: 'buyCharm'; readonly index: number; readonly replace?: string }
  | { readonly type: 'buyDie'; readonly index: number; readonly replace?: number }
  | { readonly type: 'buyTool'; readonly index: number }
  | { readonly type: 'buyPage'; readonly index: number }
  | { readonly type: 'reroll' }
  | { readonly type: 'sellCharm'; readonly id: string }
  | { readonly type: 'sellDie'; readonly dieId: number }
  | {
      readonly type: 'useTool';
      readonly slot: number;
      readonly dieId: number;
      readonly face: number;
      readonly arg?: ToolArg;
    }
  | { readonly type: 'moveDie'; readonly dieId: number; readonly to: number }
  | { readonly type: 'next' };

export type RunEvent =
  | { readonly type: 'round'; readonly event: RoundEvent }
  | { readonly type: 'money'; readonly delta: number; readonly why: string }
  | { readonly type: 'phase'; readonly phase: Phase }
  | {
      readonly type: 'tool';
      readonly toolId: string;
      readonly dieId: number;
      readonly face: number;
    }
  | {
      readonly type: 'bought';
      readonly what: 'charm' | 'die' | 'tool' | 'page';
      readonly id: string;
    }
  | { readonly type: 'level'; readonly pattern: PatternId; readonly level: number };

export interface RunResult {
  readonly state: RunState;
  readonly events: RunEvent[];
}

export function roundsOf(run: RunState): number {
  return run.targets.length;
}

export function windOf(round: number): number {
  return Math.floor(round / 2) + 1;
}
export function isHostRound(round: number): boolean {
  return round % 2 === 1;
}

export interface RunOptions {
  readonly seed: number | string;
  readonly kit?: string;
  readonly targets?: readonly number[];
}

export function targetOf(run: RunState, round: number): number {
  return run.targets[round] ?? run.targets[run.targets.length - 1] ?? 0;
}

function startRound(run: RunState): RoundState {
  const wind = windOf(run.round);
  const host = isHostRound(run.round);
  return createRound({
    index: run.round,
    wind,
    host,
    twist: host ? hostOf(wind).twist : null,
    target: targetOf(run, run.round),
    seed: deriveSeed(run.seed, `round${run.round}`),
    dice: run.dice,
    charms: run.charms,
    levels: run.levels,
  });
}

export function newRun(opts: RunOptions): RunState {
  const seed = hashSeed(opts.seed);
  const kit = STARTING_KITS[opts.kit ?? STARTING_KIT] ?? STARTING_KITS[STARTING_KIT] ?? [];
  const dice = kit.map((d, i) => fixedDie(i + 1, d));
  const base: RunState = {
    seed,
    rng: deriveSeed(seed, 'run'),
    targets: opts.targets ?? RULES.targets,
    round: 0,
    phase: 'round',
    money: RULES.money.start,
    dice,
    nextId: dice.length + 1,
    charms: [],
    tools: [],
    levels: {},
    current: null,
    cashout: null,
    gift: null,
    shop: null,
    history: [],
    seen: [],
  };
  return { ...base, current: startRound(base) };
}

type Draft = { -readonly [K in keyof RunState]: RunState[K] };

/** Why the action can't be done now, or null. */
export function runProblem(run: RunState, a: RunAction): string | null {
  switch (a.type) {
    case 'round':
      return run.phase === 'round' && run.current ? null : 'No round is being played.';
    case 'collect':
      return run.phase === 'cashout' ? null : 'Nothing to collect.';
    case 'pickGift': {
      if (run.phase !== 'gift' || !run.gift?.[a.index]) return 'No gift there.';
      return dieRoomProblem(run, a.replace);
    }
    case 'skipGift':
      return run.phase === 'gift' ? null : 'No gift to skip.';
    case 'buyCharm': {
      const o = run.shop?.charms[a.index];
      if (run.phase !== 'shop' || !o || o.sold) return 'Not for sale.';
      if (run.money < o.price) return 'Not enough money.';
      if (run.charms.length >= CHARM_SLOTS) {
        if (!a.replace || !run.charms.includes(a.replace)) return 'Your charm slots are full.';
      }
      return null;
    }
    case 'buyDie': {
      const o = run.shop?.dice[a.index];
      if (run.phase !== 'shop' || !o || o.sold) return 'Not for sale.';
      if (run.money < o.price) return 'Not enough money.';
      return dieRoomProblem(run, a.replace);
    }
    case 'buyTool': {
      const o = run.shop?.tools[a.index];
      if (run.phase !== 'shop' || !o || o.sold) return 'Not for sale.';
      if (run.money < o.price) return 'Not enough money.';
      return run.tools.length >= TOOL_POCKET ? 'Your pocket is full.' : null;
    }
    case 'buyPage': {
      const o = run.shop?.pages[a.index];
      if (run.phase !== 'shop' || !o || o.sold) return 'Not for sale.';
      return run.money < o.price ? 'Not enough money.' : null;
    }
    case 'reroll':
      if (run.phase !== 'shop' || !run.shop) return 'Not in the teahouse.';
      return run.money < rerollPrice(run) ? 'Not enough money.' : null;
    case 'sellCharm':
      if (run.phase !== 'shop' && run.phase !== 'gift') return 'Sell in the teahouse.';
      if (!run.charms.includes(a.id)) return 'You don’t have that.';
      if (CHARMS[a.id]?.effect.type === 'cup' && run.dice.length > RULES.cup)
        return 'Sell a die first: the Second Cup is holding it.';
      return null;
    case 'sellDie':
      if (run.phase !== 'shop' && run.phase !== 'gift') return 'Sell in the teahouse.';
      if (!run.dice.some((d) => d.id === a.dieId)) return 'You don’t have that die.';
      return run.dice.length <= RULES.minDice ? `Keep at least ${RULES.minDice} dice.` : null;
    case 'useTool': {
      if (run.phase !== 'shop' && run.phase !== 'gift') return 'Use tools between rounds.';
      const id = run.tools[a.slot];
      if (!id) return 'No tool there.';
      return toolProblem(id, run.dice, a.dieId, a.face, a.arg);
    }
    case 'moveDie':
      if (run.phase === 'round' || run.phase === 'over' || run.phase === 'won')
        return 'Arrange your cup between rounds.';
      return run.dice.some((d) => d.id === a.dieId) ? null : 'No such die.';
    case 'next':
      return run.phase === 'shop' ? null : 'Not in the teahouse.';
  }
}

function dieRoomProblem(run: RunState, replace?: number): string | null {
  if (run.dice.length < cupSize(run.charms)) return null;
  if (replace === undefined || !run.dice.some((d) => d.id === replace))
    return 'Your cup is full: choose a die to give up.';
  return null;
}

export function rerollPrice(run: RunState): number {
  return RULES.shop.reroll + (run.shop?.rerolls ?? 0);
}

function addDie(d: Draft, die: Die, replace?: number): void {
  const fresh = { ...die, id: d.nextId };
  d.nextId += 1;
  if (replace !== undefined && d.dice.length >= cupSize(d.charms)) {
    d.dice = d.dice.map((x) => (x.id === replace ? fresh : x));
  } else {
    d.dice = [...d.dice, fresh];
  }
}

function pickCharms(rng: Rng, owned: readonly string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const pool = CHARM_IDS.filter((id) => !owned.includes(id) && !out.includes(id));
    if (pool.length === 0) break;
    out.push(rng.weighted(pool, (id) => RARITY_WEIGHT[CHARMS[id]?.rarity ?? 'common']));
  }
  return out;
}

function dicePrice(die: Die, templateId: string): number {
  const t = DIE_TEMPLATES[templateId];
  return (t?.price ?? 5) + die.faces.filter((f) => f.enh).length;
}

function makeShop(d: Draft, rng: Rng, rerolls = 0): ShopState {
  const charms = pickCharms(rng, d.charms, RULES.shop.charms).map((id) => ({
    item: id,
    price: charmPrice(id),
    sold: false,
  }));
  const dice = Array.from({ length: RULES.shop.dice }, () => {
    const t = rng.pick(OFFERED_TEMPLATES);
    const die = makeDie(0, t, rng);
    return { item: die, price: dicePrice(die, t), sold: false };
  });
  const tools = Array.from({ length: RULES.shop.tools }, () => {
    const id = rng.pick(TOOL_IDS);
    return { item: id, price: TOOLS[id]?.price ?? 3, sold: false };
  });
  const pages = Array.from({ length: RULES.shop.pages }, () => {
    const id = rng.weighted(PATTERNS, (p) => (p.id === 'chicken' ? 4 : 1)).id;
    return { item: id, price: RULES.shop.pagePrice, sold: false };
  });
  d.seen = [...new Set([...d.seen, ...charms.map((c) => c.item)])];
  return { charms, dice, tools, pages, rerolls };
}

function makeGift(rng: Rng): Die[] {
  const ids = rng.shuffle(GIFT_TEMPLATES).slice(0, RULES.gift.dice);
  return ids.map((t) => makeDie(0, t, rng));
}

/** What a won round pays. */
export function cashLines(run: RunState, r: RoundState): CashLine[] {
  const m = RULES.money;
  const lines: CashLine[] = [
    { label: r.host ? 'Host round' : 'Round', amount: r.host ? m.host : m.plain },
  ];
  const rolls = Math.min(r.rollsLeft, m.maxRollPay) * m.perRoll;
  if (rolls > 0) lines.push({ label: `Rolls left (${r.rollsLeft})`, amount: rolls });
  if (r.returnsLeft > 0)
    lines.push({ label: `Returns left (${r.returnsLeft})`, amount: r.returnsLeft * m.perReturn });
  if (r.money > 0) lines.push({ label: 'Gold faces', amount: r.money });
  for (const e of charmEffects(run.charms))
    if (e.type === 'money') lines.push({ label: 'Gold Toad', amount: e.amount });
  const interest = Math.min(Math.floor(run.money / m.interestPer), m.maxInterest);
  if (interest > 0) lines.push({ label: 'Interest', amount: interest });
  return lines;
}

export function runReducer(run: RunState, a: RunAction): RunResult {
  const problem = runProblem(run, a);
  if (problem) throw new Error(problem);
  const d: Draft = { ...run };
  const rng = new Rng(run.rng);
  const events: RunEvent[] = [];
  const setPhase = (p: Phase) => {
    d.phase = p;
    events.push({ type: 'phase', phase: p });
  };
  const pay = (delta: number, why: string) => {
    if (delta === 0) return;
    d.money += delta;
    events.push({ type: 'money', delta, why });
  };
  switch (a.type) {
    case 'round': {
      const r = roundReducer(run.current as RoundState, a.action);
      d.current = r.state;
      for (const e of r.events) events.push({ type: 'round', event: e });
      if (r.state.over) {
        const rs = r.state;
        // cracked porcelain stays cracked
        for (const c of rs.cracked)
          d.dice = d.dice.map((x) => (x.id === c.dieId ? withFace(x, c.face, { kind: null }) : x));
        d.history = [
          ...d.history,
          {
            index: rs.index,
            target: rs.target,
            score: rs.score,
            hands: rs.hands.length,
            best: Math.max(0, ...rs.hands.map((h) => h.total)),
            patterns: rs.hands.flatMap((h) => h.patterns),
          },
        ];
        if (rs.score < rs.target) setPhase('over');
        else if (rs.index >= roundsOf(d) - 1) setPhase('won');
        else {
          d.cashout = cashLines(d, rs);
          setPhase('cashout');
        }
      }
      break;
    }
    case 'collect': {
      const total = (d.cashout ?? []).reduce((s, l) => s + l.amount, 0);
      pay(total, 'cashout');
      d.cashout = null;
      if (isHostRound(d.round)) {
        d.gift = makeGift(rng);
        setPhase('gift');
      } else {
        d.shop = makeShop(d, rng);
        setPhase('shop');
      }
      break;
    }
    case 'pickGift': {
      addDie(d, (d.gift as Die[])[a.index] as Die, a.replace);
      d.gift = null;
      d.shop = makeShop(d, rng);
      setPhase('shop');
      break;
    }
    case 'skipGift':
      d.gift = null;
      d.shop = makeShop(d, rng);
      setPhase('shop');
      break;
    case 'buyCharm': {
      const shop = d.shop as ShopState;
      const o = shop.charms[a.index] as ShopOffer<string>;
      pay(-o.price, 'charm');
      d.charms =
        d.charms.length >= CHARM_SLOTS && a.replace
          ? d.charms.map((c) => (c === a.replace ? o.item : c))
          : [...d.charms, o.item];
      d.shop = {
        ...shop,
        charms: shop.charms.map((x, i) => (i === a.index ? { ...x, sold: true } : x)),
      };
      events.push({ type: 'bought', what: 'charm', id: o.item });
      break;
    }
    case 'buyDie': {
      const shop = d.shop as ShopState;
      const o = shop.dice[a.index] as ShopOffer<Die>;
      pay(-o.price, 'die');
      addDie(d, o.item, a.replace);
      d.shop = {
        ...shop,
        dice: shop.dice.map((x, i) => (i === a.index ? { ...x, sold: true } : x)),
      };
      events.push({ type: 'bought', what: 'die', id: o.item.name });
      break;
    }
    case 'buyTool': {
      const shop = d.shop as ShopState;
      const o = shop.tools[a.index] as ShopOffer<string>;
      pay(-o.price, 'tool');
      d.tools = [...d.tools, o.item];
      d.shop = {
        ...shop,
        tools: shop.tools.map((x, i) => (i === a.index ? { ...x, sold: true } : x)),
      };
      events.push({ type: 'bought', what: 'tool', id: o.item });
      break;
    }
    case 'buyPage': {
      const shop = d.shop as ShopState;
      const o = shop.pages[a.index] as ShopOffer<PatternId>;
      pay(-o.price, 'page');
      const level = (d.levels[o.item] ?? 0) + 1;
      d.levels = { ...d.levels, [o.item]: level };
      d.shop = {
        ...shop,
        pages: shop.pages.map((x, i) => (i === a.index ? { ...x, sold: true } : x)),
      };
      events.push({ type: 'level', pattern: o.item, level });
      break;
    }
    case 'reroll': {
      pay(-rerollPrice(d), 'reroll');
      const old = d.shop as ShopState;
      const fresh = makeShop(d, rng, old.rerolls + 1);
      // a reroll changes the charms and dice; tools and pages stay
      d.shop = { ...fresh, tools: old.tools, pages: old.pages };
      break;
    }
    case 'sellCharm': {
      pay(Math.floor(charmPrice(a.id) / 2), 'sell');
      d.charms = d.charms.filter((c) => c !== a.id);
      break;
    }
    case 'sellDie':
      pay(RULES.shop.dieSell, 'sell');
      d.dice = d.dice.filter((x) => x.id !== a.dieId);
      break;
    case 'useTool': {
      const id = d.tools[a.slot] as string;
      d.dice = applyTool(id, d.dice, a.dieId, a.face, rng, a.arg);
      d.tools = d.tools.filter((_, i) => i !== a.slot);
      events.push({ type: 'tool', toolId: id, dieId: a.dieId, face: a.face });
      break;
    }
    case 'moveDie': {
      const die = d.dice.find((x) => x.id === a.dieId) as Die;
      const rest = d.dice.filter((x) => x.id !== a.dieId);
      const to = Math.max(0, Math.min(rest.length, a.to));
      d.dice = [...rest.slice(0, to), die, ...rest.slice(to)];
      break;
    }
    case 'next': {
      d.shop = null;
      d.round += 1;
      d.current = startRound(d);
      setPhase('round');
      break;
    }
  }
  d.rng = rng.state;
  return { state: d, events };
}
