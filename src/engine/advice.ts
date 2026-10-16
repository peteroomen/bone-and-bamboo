import { PATTERN_BY_ID, PATTERNS, type PatternId } from '@/content/patterns';
import type { SetKind } from '@/content/sets';
import type { TileKind } from '@/content/tiles';
import { type Die, faceOdds, neighbours, opposite } from './dice';
import {
  type PSet,
  type Slot,
  type Variant,
  VARIANTS_BY_PATTERN,
  matchSets,
  slotFits,
  slotTiles,
} from './patterns';
import {
  type CupDie,
  type RoundAction,
  type RoundState,
  actionProblem,
  dieOf,
  hasCharm,
  offered,
  takeCheck,
} from './round';
import { type RackSet, countRack } from './sets';
import { type ScoreContext, scoreHand, toPSets } from './scoring';
import { compareKinds, isBonus, isSuited, rankOf, suitOf } from './tiles';

/**
 * Advice uses only what is on the table: the faces of your dice (which you can always look at)
 * and what they show now. Every chance here is exact for one roll.
 */

/** A die's chances: kind -> probability; null is "nothing useful" (a blank face). */
export type Dist = Map<TileKind | null, number>;

/** What a die will show after the next roll (or now, if it is kept). */
export function rollDist(die: Die): Dist {
  const odds = faceOdds(die);
  const m: Dist = new Map();
  let bonus = 0;
  die.faces.forEach((f, i) => {
    const p = odds[i] ?? 0;
    if (f.kind && isBonus(f.kind)) bonus += p;
    else m.set(f.kind, (m.get(f.kind) ?? 0) + p);
  });
  // a flower or season rolls again: share its chance out
  if (bonus > 0 && bonus < 1) for (const [k, p] of m) m.set(k, p / (1 - bonus));
  return m;
}

function fixedDist(kind: TileKind | null): Dist {
  return new Map([[kind, 1]]);
}

/**
 * The chance that the dice, between them, show every tile in `kinds` (on different dice).
 * Exact: a walk over the dice keeping how many of each needed kind have shown.
 */
export function chanceOf(dists: readonly Dist[], kinds: readonly TileKind[]): number {
  const keys: TileKind[] = [];
  const caps: number[] = [];
  for (const k of kinds) {
    const i = keys.indexOf(k);
    if (i < 0) {
      keys.push(k);
      caps.push(1);
    } else caps[i] = (caps[i] as number) + 1;
  }
  // states in mixed radix: digit i counts the kind keys[i] seen so far (capped)
  const mul: number[] = [];
  let size = 1;
  for (const c of caps) {
    mul.push(size);
    size *= c + 1;
  }
  let cur = new Float64Array(size);
  let nxt = new Float64Array(size);
  cur[0] = 1;
  const q = new Float64Array(keys.length);
  for (const dist of dists) {
    let qsum = 0;
    for (let i = 0; i < keys.length; i++) {
      q[i] = dist.get(keys[i] as TileKind) ?? 0;
      qsum += q[i] as number;
    }
    if (qsum === 0) continue;
    nxt.fill(0);
    for (let st = 0; st < size; st++) {
      const p = cur[st] as number;
      if (p === 0) continue;
      nxt[st] = (nxt[st] as number) + p * (1 - qsum);
      for (let i = 0; i < keys.length; i++) {
        const qi = q[i] as number;
        if (qi === 0) continue;
        const m = mul[i] as number;
        const cap = caps[i] as number;
        const digit = Math.floor(st / m) % (cap + 1);
        const to = digit < cap ? st + m : st;
        nxt[to] = (nxt[to] as number) + p * qi;
      }
    }
    const t = cur;
    cur = nxt;
    nxt = t;
  }
  return cur[size - 1] as number;
}

export interface Candidate {
  readonly kind: SetKind;
  readonly base: TileKind;
  readonly tiles: readonly TileKind[];
  /** Chance a full roll of the cup shows it. */
  readonly p: number;
}

/** Every set the cup can make at all, with its chance on a full roll. */
export function candidates(s: RoundState): Candidate[] {
  const dists = s.cup.map((c) => rollDist(dieOf(s, c.dieId) as Die));
  const holders = new Map<TileKind, number>();
  for (const d of dists) for (const k of d.keys()) if (k) holders.set(k, (holders.get(k) ?? 0) + 1);
  const out: Candidate[] = [];
  const push = (kind: SetKind, base: TileKind) => {
    const tiles = slotTiles(kind, base);
    const p = chanceOf(dists, tiles);
    if (p > 0) out.push({ kind, base, tiles, p });
  };
  const kinds = [...holders.keys()].sort(compareKinds);
  for (const k of kinds) {
    const n = holders.get(k) ?? 0;
    if (n >= 2) push('pair', k);
    if (n >= 3) push('pong', k);
    if (n >= 4) push('kong', k);
    if (isSuited(k) && rankOf(k) <= 7) {
      const a = `${suitOf(k)}${rankOf(k) + 1}`;
      const b = `${suitOf(k)}${rankOf(k) + 2}`;
      if (holders.has(a) && holders.has(b)) push('chow', k);
    }
  }
  return out;
}

export interface Plan {
  readonly pattern: PatternId;
  readonly variant: Variant;
  /** The sets still to take, best first. */
  readonly missing: readonly Candidate[];
  /** A rough count of rolls to finish: the sum of 1/p over the missing sets. */
  readonly estRolls: number;
  /** What the finished hand would score, with every pattern it fits. */
  readonly score: number;
  readonly patterns: readonly PatternId[];
}

function scoreCtx(s: RoundState): ScoreContext {
  return { wind: s.wind, charms: s.charms, levels: s.levels };
}

function ghostRack(missing: readonly Candidate[]): RackSet[] {
  return missing.map((m) => ({
    kind: m.kind,
    tiles: m.tiles.map((kind) => ({ kind, dieId: -1, face: -1 })),
  }));
}

function planVariant(
  s: RoundState,
  v: Variant,
  rackSets: readonly PSet[],
  cands: readonly Candidate[],
): Plan | null {
  if (v.slots.length < rackSets.length) return null;
  const match = matchSets(v.slots, rackSets);
  if (!match) return null;
  if (v.distinctPairs) {
    const ks = rackSets.map((r) => r.tiles[0]);
    if (new Set(ks).size !== ks.length) return null;
  }
  const taken = new Set(match);
  const open: Slot[] = v.slots.filter((_, j) => !taken.has(j));
  const usedPairs = new Set(rackSets.filter((r) => r.kind === 'pair').map((r) => r.tiles[0]));
  const missing: Candidate[] = [];
  for (const slot of open) {
    let best: Candidate | null = null;
    for (const c of cands) {
      if (c.kind === 'kong') continue;
      if (v.distinctPairs && usedPairs.has(c.base)) continue;
      if (!slotFits(slot, { kind: c.kind, tiles: c.tiles })) continue;
      if (!best || c.p > best.p) best = c;
    }
    if (!best) return null;
    if (v.distinctPairs) usedPairs.add(best.base);
    missing.push(best);
  }
  const full = [...rackSets, ...missing.map((m) => ({ kind: m.kind, tiles: m.tiles }))];
  if (v.whole && !v.whole(full)) return null;
  const rack = [...s.rack, ...ghostRack(missing)];
  const sc = scoreHand(rack, s.shelf, scoreCtx(s));
  const estRolls = missing.reduce((a, m) => a + 1 / Math.max(m.p, 1e-3), 0);
  return {
    pattern: v.pattern,
    variant: v,
    missing: missing.slice().sort((a, b) => b.p - a.p),
    estRolls,
    score: sc.total,
    patterns: sc.patterns,
  };
}

/** For each pattern, the cheapest way to reach it from here (or null if the dice can't). */
export function plansFor(s: RoundState, cands = candidates(s)): Map<PatternId, Plan | null> {
  const rackSets = toPSets(s.rack);
  const out = new Map<PatternId, Plan | null>();
  for (const p of PATTERNS) {
    let best: Plan | null = null;
    for (const v of VARIANTS_BY_PATTERN[p.id]) {
      const plan = planVariant(s, v, rackSets, cands);
      if (plan && (!best || plan.estRolls < best.estRolls)) best = plan;
    }
    out.set(p.id, best);
  }
  return out;
}

/** How good a plan is for the rest of this round: points per roll, discounted if it may not finish. */
export function planValue(plan: Plan, rollsLeft: number): number {
  const fin = Math.min(1, rollsLeft / Math.max(plan.estRolls, 0.5));
  return (plan.score * fin * fin) / Math.max(plan.estRolls, 0.5);
}

export function bestPlan(s: RoundState, target?: PatternId): Plan | null {
  const plans = plansFor(s);
  if (target) {
    const t = plans.get(target);
    if (t) return t;
  }
  let best: Plan | null = null;
  let bestV = -1;
  for (const plan of plans.values()) {
    if (!plan) continue;
    const v = planValue(plan, s.rollsLeft);
    if (v > bestV) {
      bestV = v;
      best = plan;
    }
  }
  return best;
}

export interface TakeOption {
  readonly dieIds: readonly number[];
  readonly kind: SetKind;
  readonly kinds: readonly TileKind[];
  readonly upgrade: number | null;
}

/** Every set you could take from the dice showing now. */
export function takeOptions(s: RoundState): TakeOption[] {
  const live = s.cup.filter((c) => offered(s, c));
  const out: TakeOption[] = [];
  const seen = new Set<string>();
  const tryIds = (ids: number[]) => {
    const r = takeCheck(s, ids);
    if ('problem' in r) return;
    const key = `${r.kind}:${r.kinds.slice().sort().join(',')}:${r.upgrade}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ dieIds: ids, kind: r.kind, kinds: r.kinds, upgrade: r.upgrade });
  };
  const n = live.length;
  for (let a = 0; a < n; a++) {
    tryIds([(live[a] as CupDie).dieId]);
    for (let b = a + 1; b < n; b++) {
      tryIds([(live[a] as CupDie).dieId, (live[b] as CupDie).dieId]);
      for (let c = b + 1; c < n; c++) {
        tryIds([(live[a] as CupDie).dieId, (live[b] as CupDie).dieId, (live[c] as CupDie).dieId]);
        for (let d = c + 1; d < n; d++)
          tryIds([
            (live[a] as CupDie).dieId,
            (live[b] as CupDie).dieId,
            (live[c] as CupDie).dieId,
            (live[d] as CupDie).dieId,
          ]);
      }
    }
  }
  return out;
}

function rackAfter(s: RoundState, t: TakeOption): PSet[] {
  const sets = toPSets(s.rack);
  if (t.upgrade !== null) {
    return sets.map((x, i) =>
      i === t.upgrade ? { kind: 'kong' as SetKind, tiles: [...x.tiles, ...t.kinds] } : x,
    );
  }
  return [...sets, { kind: t.kind, tiles: t.kinds }];
}

/** Does taking this keep the plan's pattern in reach? */
export function takeFits(s: RoundState, plan: Plan, t: TakeOption): boolean {
  const after = rackAfter(s, t);
  const v = plan.variant;
  if (v.distinctPairs) {
    const ks = after.filter((x) => x.kind === 'pair').map((x) => x.tiles[0]);
    if (new Set(ks).size !== ks.length) return false;
  }
  return matchSets(v.slots, after) !== null;
}

const TAKE_ORDER: Record<SetKind, number> = { kong: 0, pong: 1, chow: 2, pair: 3 };

export interface Advice {
  readonly action: RoundAction;
  /** Plain words for the player. */
  readonly reason: string;
  readonly plan: Plan | null;
  /** Dice to hold before the roll (for the hint glow). */
  readonly hold: readonly number[];
}

function kindsLabel(kinds: readonly TileKind[]): string {
  return kinds.join(' ');
}

/** Dists for the next roll, with these dice kept as they are. */
function nextDists(s: RoundState, keep: ReadonlySet<number>): Dist[] {
  return s.cup.map((c) => {
    if (keep.has(c.dieId)) return fixedDist(offered(s, c));
    return rollDist(dieOf(s, c.dieId) as Die);
  });
}

/** Sets that would still fit the plan if taken now. */
function fittingSets(s: RoundState, plan: Plan, cands: readonly Candidate[]): Candidate[] {
  const rack = toPSets(s.rack);
  const v = plan.variant;
  const pairs = new Set(rack.filter((r) => r.kind === 'pair').map((r) => r.tiles[0]));
  return cands.filter((c) => {
    if (c.kind === 'kong') return false;
    if (v.distinctPairs && pairs.has(c.base)) return false;
    return matchSets(v.slots, [...rack, { kind: c.kind, tiles: c.tiles }]) !== null;
  });
}

/**
 * Which dice to hold: the choice that gives the best chance that the next roll shows at least
 * one set the plan can use (the sets are treated as independent, which is close enough to rank).
 */
export function chooseHolds(
  s: RoundState,
  plan: Plan,
  limit: number,
): { keep: number[]; p: number; likeliest: Candidate | null } {
  const fit = fittingSets(s, plan, candidates(s));
  const useful = new Set(fit.flatMap((c) => c.tiles));
  const avail = s.cup.filter((c) => {
    const k = offered(s, c);
    return k && !c.frozen && useful.has(k);
  });
  let best = { keep: [] as number[], p: -1, likeliest: null as Candidate | null };
  const n = Math.min(avail.length, 10);
  for (let mask = 0; mask < 1 << n; mask++) {
    const ids: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) ids.push((avail[i] as CupDie).dieId);
    if (ids.length > Math.min(limit, 4) || ids.length >= s.cup.length) continue;
    const dists = nextDists(s, new Set(ids));
    let miss = 1;
    let top: Candidate | null = null;
    let topP = 0;
    for (const c of fit) {
      const p = chanceOf(dists, c.tiles);
      miss *= 1 - p;
      if (p > topP) {
        topP = p;
        top = c;
      }
    }
    const p = 1 - miss;
    if (p > best.p + 1e-9) best = { keep: ids, p, likeliest: top };
  }
  return best;
}

/**
 * What the guide would do now. With a target pattern it works towards that; otherwise it picks
 * the plan that scores most per roll. It takes any set that fits, uses a charm that makes one,
 * and otherwise holds the dice that make the likeliest next set and rolls the rest.
 */
export function advise(s: RoundState, opts: { target?: PatternId; bank?: boolean } = {}): Advice {
  const end: Advice = { action: { type: 'end' }, reason: '', plan: null, hold: [] };
  if (s.over) return { ...end, reason: 'The round is over.' };
  if (opts.bank !== false && s.score >= s.target && s.rack.length === 0)
    return { ...end, reason: 'You have beaten the target: bank it.' };
  const plan = bestPlan(s, opts.target);
  const takes = takeOptions(s);
  if (plan) {
    const fit = takes
      .filter((t) => takeFits(s, plan, t))
      .sort((a, b) => TAKE_ORDER[a.kind] - TAKE_ORDER[b.kind]);
    const t = fit[0];
    if (t) {
      return {
        action: { type: 'take', dieIds: t.dieIds },
        reason: `Take the ${t.upgrade !== null ? 'kong' : t.kind} (${kindsLabel(t.kinds)}): it fits ${PATTERN_BY_ID[plan.pattern].name}.`,
        plan,
        hold: [],
      };
    }
    const move = charmMove(s, plan);
    if (move) return move;
  } else if (takes.length > 0 && countRack(s.rack).sets + countRack(s.rack).pairs < 5) {
    const t = takes.sort((a, b) => TAKE_ORDER[a.kind] - TAKE_ORDER[b.kind])[0] as TakeOption;
    return {
      action: { type: 'take', dieIds: t.dieIds },
      reason: `Take the ${t.kind}.`,
      plan,
      hold: [],
    };
  }
  if (!plan && s.returnsLeft > 0 && s.rack.length > 0) {
    return {
      action: { type: 'return', index: s.rack.length - 1 },
      reason: 'Your dice can’t finish this rack: send a set back.',
      plan,
      hold: [],
    };
  }
  if (s.rollsLeft <= 0) {
    return { ...end, plan, reason: 'No rolls left: end the round.' };
  }
  // choose holds
  const limit = s.twist?.holdLimit ?? s.cup.length;
  let keep: number[] = [];
  let why = 'Roll.';
  if (plan && plan.missing.length > 0) {
    const h = chooseHolds(s, plan, limit);
    keep = h.keep;
    if (h.likeliest)
      why = `${keep.length ? 'Hold what fits' : 'Hold nothing'} and roll: ${Math.round(h.p * 100)}% to make a set you need, most likely ${kindsLabel(h.likeliest.tiles)}.`;
  }
  const keepSet = new Set(keep);
  for (const c of s.cup) {
    const should = keepSet.has(c.dieId);
    if (c.held !== should && !c.spent && c.face !== null) {
      const a: RoundAction = { type: 'hold', dieId: c.dieId };
      if (!actionProblem(s, a)) return { action: a, reason: why, plan, hold: keep };
    }
  }
  const roll: RoundAction = { type: 'roll' };
  if (actionProblem(s, roll)) {
    // every die is held: let one go
    const c = s.cup.find((x) => x.held);
    if (c) return { action: { type: 'hold', dieId: c.dieId }, reason: why, plan, hold: keep };
    return { ...end, plan, reason: 'Nothing left to do.' };
  }
  return { action: roll, reason: why, plan, hold: keep };
}

/** A Thumb tip, a Shell turn or a Mirror copy that makes a set you can take right now. */
function charmMove(s: RoundState, plan: Plan): Advice | null {
  // `face` is the new face index, or `copy` the kind a mirrored die would show
  const makes = (dieId: number, change: { face?: number; copy?: TileKind }): boolean => {
    const trial: RoundState = {
      ...s,
      cup: s.cup.map((x) =>
        x.dieId !== dieId
          ? x
          : change.copy
            ? { ...x, copy: { kind: change.copy } }
            : { ...x, face: change.face ?? x.face },
      ),
    };
    const c = trial.cup.find((x) => x.dieId === dieId);
    const k = c ? offered(trial, c) : null;
    if (!k || isBonus(k)) return false;
    return takeOptions(trial).some((t) => t.dieIds.includes(dieId) && takeFits(trial, plan, t));
  };
  const ok = (a: RoundAction) => !actionProblem(s, a);
  for (const c of s.cup) {
    if (c.spent || c.face === null) continue;
    const die = dieOf(s, c.dieId) as Die;
    if (hasCharm(s.charms, 'thumb') && !s.uses.thumb && !c.copy) {
      for (const f of neighbours(die.shape, c.face)) {
        const a: RoundAction = { type: 'tip', dieId: c.dieId, face: f };
        if (ok(a) && makes(c.dieId, { face: f }))
          return {
            action: a,
            reason: 'Tip this die with your Thumb: it makes a set.',
            plan,
            hold: [],
          };
      }
    }
    if (hasCharm(s.charms, 'shell') && !s.uses.shell && !c.copy) {
      const a: RoundAction = { type: 'flip', dieId: c.dieId };
      if (ok(a) && makes(c.dieId, { face: opposite(die.shape, c.face) }))
        return {
          action: a,
          reason: 'Turn this die over with the Oracle Shell: it makes a set.',
          plan,
          hold: [],
        };
    }
    if (hasCharm(s.charms, 'mirror') && !s.uses.mirror) {
      for (const from of s.cup) {
        if (from.dieId === c.dieId) continue;
        const k = offered(s, from);
        if (!k) continue;
        const a: RoundAction = { type: 'mirror', dieId: c.dieId, fromDieId: from.dieId };
        if (ok(a) && makes(c.dieId, { copy: k }))
          return {
            action: a,
            reason: 'Use the Mirror: copying that face makes a set.',
            plan,
            hold: [],
          };
      }
    }
  }
  return null;
}
