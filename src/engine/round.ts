import { ROUND } from '@/content/rules';
import type { TileKind } from '@/content/tiles';
import { ENHANCEMENTS } from '@/content/enhancements';
import { Rng } from './rng';
import {
  type PlayedSet,
  type ScoreContext,
  type ScoreResult,
  scoreTable,
  type Levels,
} from './scoring';
import type { Twist } from '@/content/hosts';
import { brokenDragons } from './goals';
import { classify, orderSet, playProblem } from './sets';
import { type Tile, countKinds } from './tiles';
import {
  type TwistState,
  afterDiscard,
  afterSetPlayed,
  discardProblem,
  endTurn,
  initTwist,
  swapProblem,
  swapTops,
  takeProblem,
  twistModifiers,
  twistRules,
} from './twists';
import { type Stacks, deal, wallCount } from './wall';

/** The numbers a round is played with, after dragons, tile set and lantern. */
export interface RoundRules {
  readonly handSize: number;
  readonly plays: number;
  readonly discards: number;
  readonly peek: number;
  readonly stacks: number;
  readonly maxDiscard: number;
}

export const BASE_ROUND_RULES: RoundRules = {
  handSize: ROUND.hand,
  plays: ROUND.plays,
  discards: ROUND.discards,
  peek: ROUND.peek,
  stacks: ROUND.stacks,
  maxDiscard: ROUND.maxDiscard,
};

export interface RoundResult {
  readonly score: ScoreResult;
  /** Money from gold tiles that were played. */
  readonly gold: number;
  /** Porcelain tiles that cracked: destroyed from the set. */
  readonly cracked: readonly number[];
  readonly unusedDiscards: number;
}

export interface RoundState {
  readonly rules: RoundRules;
  readonly stacks: Stacks;
  readonly hand: readonly Tile[];
  readonly table: readonly PlayedSet[];
  readonly discarded: readonly Tile[];
  readonly playsLeft: number;
  readonly discardsLeft: number;
  readonly dragons: readonly string[];
  readonly levels: Levels;
  /** The score to beat this round: banking early needs the table to reach it. */
  readonly target: number;
  /** The host's twist, as it stands this round. */
  readonly twist: TwistState | null;
  /** Copies of each tile kind in the whole set (the bot's reading of what can still come). */
  readonly copies: Readonly<Record<TileKind, number>>;
  readonly rng: number;
  readonly phase: 'play' | 'done';
  readonly turns: number;
  readonly result?: RoundResult;
}

export type RoundAction =
  | { readonly type: 'take'; readonly stack: number }
  | { readonly type: 'play'; readonly ids: readonly number[] }
  | { readonly type: 'discard'; readonly ids: readonly number[] }
  /** Upgrade the pong at table index `setIndex` to a kong with its fourth tile from the hand. */
  | { readonly type: 'upgrade'; readonly setIndex: number; readonly tileId: number }
  /** Bank the table now: allowed once it beats the target. */
  | { readonly type: 'finish' }
  /** The monkey's gift: swap two stack tops yourself. */
  | { readonly type: 'swap'; readonly a: number; readonly b: number };

export type RoundEvent =
  | { readonly type: 'take'; readonly tile: Tile; readonly stack: number }
  | { readonly type: 'play'; readonly kind: PlayedSet['kind']; readonly tiles: readonly Tile[] }
  | { readonly type: 'discard'; readonly tiles: readonly Tile[] }
  | {
      readonly type: 'upgrade';
      readonly setIndex: number;
      readonly tile: Tile;
      readonly tiles: readonly Tile[];
    }
  | { readonly type: 'finish' }
  | { readonly type: 'swap'; readonly a: number; readonly b: number; readonly auto: boolean }
  | { readonly type: 'burn'; readonly tile: Tile; readonly stack: number }
  | { readonly type: 'tide'; readonly tile: Tile; readonly stack: number }
  | { readonly type: 'score'; readonly result: ScoreResult }
  | { readonly type: 'crack'; readonly tile: Tile }
  | { readonly type: 'end'; readonly result: RoundResult }
  | { readonly type: 'illegal'; readonly reason: string };

export interface Reduced<S, E> {
  readonly state: S;
  readonly events: E[];
}

export interface RoundSetup {
  readonly tiles: readonly Tile[];
  readonly rules: RoundRules;
  readonly dragons: readonly string[];
  readonly levels: Levels;
  readonly target: number;
  readonly twist?: Twist | null;
  /** The RNG state to shuffle and play the round from. */
  readonly rng: number;
}

/** Deal a new round: the whole set shuffled into stacks. */
export function startRound(setup: RoundSetup): RoundState {
  const rng = new Rng(setup.rng);
  const rules = twistRules(setup.rules, setup.twist ?? null);
  const stacks = deal(setup.tiles, rules.stacks, rng);
  const twist = setup.twist ? initTwist(setup.twist, stacks, rng) : null;
  return {
    rules,
    twist,
    stacks,
    hand: [],
    table: [],
    discarded: [],
    playsLeft: rules.plays,
    discardsLeft: rules.discards,
    dragons: setup.dragons,
    levels: setup.levels,
    target: setup.target,
    copies: Object.fromEntries(countKinds(setup.tiles)),
    rng: rng.state,
    phase: 'play',
    turns: 0,
  };
}

/** The hand must be refilled from the wall before the next play or discard. */
export function needsRefill(s: RoundState): boolean {
  return s.hand.length < s.rules.handSize && wallCount(s.stacks) > 0;
}

export function scoreContext(s: RoundState): ScoreContext {
  const modifiers = twistModifiers(s);
  return { dragons: s.dragons, levels: s.levels, ...(modifiers ? { modifiers } : {}) };
}

/** What the table scores now, and with the selected tiles played as one more set. */
export function preview(
  s: RoundState,
  selectedIds: readonly number[] = [],
): { now: ScoreResult; withSelected: ScoreResult | null; warnings: string[] } {
  const ctx = scoreContext(s);
  const now = scoreTable(s.table, ctx);
  const picked = selectedIds
    .map((id) => s.hand.find((t) => t.id === id))
    .filter((t): t is Tile => t !== undefined);
  const kind = picked.length === selectedIds.length && picked.length > 0 ? classify(picked) : null;
  if (!kind) return { now, withSelected: null, warnings: [] };
  const table = [...s.table, { kind, tiles: orderSet(picked) }];
  return {
    now,
    withSelected: scoreTable(table, ctx),
    warnings: brokenDragons(s.table, table, s.dragons),
  };
}

function illegal(s: RoundState, reason: string): Reduced<RoundState, RoundEvent> {
  return { state: s, events: [{ type: 'illegal', reason }] };
}

/** The round is over when the plays run out, or hand and wall are both empty. */
function finishIfOver(s: RoundState, events: RoundEvent[]): RoundState {
  if (s.phase === 'done') return s;
  const stuck = s.hand.length === 0 && wallCount(s.stacks) === 0;
  if (s.playsLeft > 0 && !stuck) return s;
  return settle(s, events);
}

/** A turn has ended: the twist's own moves (chows unlock, embers burn, swaps fall due). */
function withTurnEnd(s: RoundState, events: RoundEvent[], kind: string | null): RoundState {
  if (!s.twist) return s;
  const rng = new Rng(s.rng);
  const twist = kind ? afterSetPlayed(s.twist, kind) : s.twist;
  const r = endTurn(twist, s.stacks, rng, events, kind !== null);
  return { ...s, twist: r.twist, stacks: r.stacks, rng: rng.state };
}

/** Score the table and close the round (once). */
function settle(s: RoundState, events: RoundEvent[]): RoundState {
  const ctx = scoreContext(s);
  const score = scoreTable(s.table, ctx);
  const rng = new Rng(s.rng);
  const cracked: number[] = [];
  let gold = 0;
  for (const set of s.table) {
    for (const t of set.tiles) {
      if (!t.enh) continue;
      const en = ENHANCEMENTS[t.enh];
      gold += en.money;
      if (en.crack > 0 && rng.next() < en.crack) cracked.push(t.id);
    }
  }
  const result: RoundResult = { score, gold, cracked, unusedDiscards: s.discardsLeft };
  events.push({ type: 'score', result: score });
  for (const id of cracked) {
    const tile = s.table.flatMap((x) => x.tiles).find((t) => t.id === id);
    if (tile) events.push({ type: 'crack', tile });
  }
  events.push({ type: 'end', result });
  return { ...s, rng: rng.state, phase: 'done', result };
}

/** Why a tabled pong can't be upgraded with this hand tile, or null. */
export function upgradeProblem(s: RoundState, setIndex: number, tileId: number): string | null {
  const set = s.table[setIndex];
  if (!set) return 'No such set.';
  if (set.kind !== 'pong') return 'Only a pong can be upgraded to a kong.';
  const tile = s.hand.find((t) => t.id === tileId);
  if (!tile) return 'That tile is not in your hand.';
  if (tile.kind !== (set.tiles[0] as Tile).kind) return "That is not the pong's fourth tile.";
  if (s.playsLeft <= 0) return 'No plays left.';
  return null;
}

/** The tabled pongs your hand can upgrade now: [table index, hand tile id]. */
export function upgrades(s: RoundState): { setIndex: number; tileId: number }[] {
  const out: { setIndex: number; tileId: number }[] = [];
  s.table.forEach((set, setIndex) => {
    if (set.kind !== 'pong') return;
    const tile = s.hand.find((t) => t.kind === (set.tiles[0] as Tile).kind);
    if (tile) out.push({ setIndex, tileId: tile.id });
  });
  return out;
}

/** What upgrading would score, and the multipliers it would break. */
export function previewUpgrade(
  s: RoundState,
  setIndex: number,
  tileId: number,
): { now: ScoreResult; after: ScoreResult; warnings: string[] } | null {
  if (upgradeProblem(s, setIndex, tileId) !== null) return null;
  const set = s.table[setIndex] as PlayedSet;
  const tile = s.hand.find((t) => t.id === tileId) as Tile;
  const table = s.table.map((x, i) =>
    i === setIndex ? { kind: 'kong' as const, tiles: orderSet([...set.tiles, tile]) } : x,
  );
  const ctx = scoreContext(s);
  return {
    now: scoreTable(s.table, ctx),
    after: scoreTable(table, ctx),
    warnings: brokenDragons(s.table, table, s.dragons),
  };
}

/** Why you can't bank the table yet, or null. */
export function finishProblem(s: RoundState): string | null {
  if (s.phase === 'done') return 'The round is over.';
  if (s.table.length === 0) return 'Play a set first.';
  const total = scoreTable(s.table, scoreContext(s)).total;
  if (total < s.target) return 'The table has not beaten the target yet.';
  return null;
}

export function roundReduce(s: RoundState, a: RoundAction): Reduced<RoundState, RoundEvent> {
  if (s.phase === 'done') return illegal(s, 'The round is over.');
  const events: RoundEvent[] = [];
  switch (a.type) {
    case 'take': {
      if (s.hand.length >= s.rules.handSize) return illegal(s, 'Your hand is full.');
      const stack = s.stacks[a.stack];
      if (!stack || stack.length === 0) return illegal(s, 'That stack is empty.');
      const locked = takeProblem(s, a.stack);
      if (locked) return illegal(s, locked);
      const tile = stack[stack.length - 1] as Tile;
      const stacks = s.stacks.map((st, i) => (i === a.stack ? st.slice(0, -1) : st));
      events.push({ type: 'take', tile, stack: a.stack });
      const next = finishIfOver({ ...s, stacks, hand: [...s.hand, tile] }, events);
      return { state: next, events };
    }
    case 'play': {
      if (needsRefill(s)) return illegal(s, 'Refill your hand first.');
      const problem = playProblem(s.hand, a.ids, s.discardsLeft);
      if (problem) return illegal(s, problem);
      const ids = new Set(a.ids);
      const picked = s.hand.filter((t) => ids.has(t.id));
      const kind = classify(picked);
      if (!kind) return illegal(s, 'That is not a set.');
      const tiles = orderSet(picked);
      events.push({ type: 'play', kind, tiles });
      const next = finishIfOver(
        withTurnEnd(
          {
            ...s,
            hand: s.hand.filter((t) => !ids.has(t.id)),
            table: [...s.table, { kind, tiles }],
            playsLeft: s.playsLeft - 1,
            turns: s.turns + 1,
          },
          events,
          kind,
        ),
        events,
      );
      return { state: next, events };
    }
    case 'upgrade': {
      if (needsRefill(s)) return illegal(s, 'Refill your hand first.');
      const problem = upgradeProblem(s, a.setIndex, a.tileId);
      if (problem) return illegal(s, problem);
      const set = s.table[a.setIndex] as PlayedSet;
      const tile = s.hand.find((t) => t.id === a.tileId) as Tile;
      const tiles = orderSet([...set.tiles, tile]);
      events.push({ type: 'upgrade', setIndex: a.setIndex, tile, tiles });
      const next = finishIfOver(
        withTurnEnd(
          {
            ...s,
            hand: s.hand.filter((t) => t.id !== a.tileId),
            table: s.table.map((x, i) => (i === a.setIndex ? { kind: 'kong' as const, tiles } : x)),
            playsLeft: s.playsLeft - 1,
            turns: s.turns + 1,
          },
          events,
          'kong',
        ),
        events,
      );
      return { state: next, events };
    }
    case 'finish': {
      const problem = finishProblem(s);
      if (problem) return illegal(s, problem);
      events.push({ type: 'finish' });
      return { state: settle(s, events), events };
    }
    case 'swap': {
      const problem = swapProblem(s, a.a, a.b);
      if (problem) return illegal(s, problem);
      events.push({ type: 'swap', a: a.a, b: a.b, auto: false });
      const twist = s.twist as TwistState;
      return {
        state: {
          ...s,
          stacks: swapTops(s.stacks, a.a, a.b),
          twist: { ...twist, swapsLeft: twist.swapsLeft - 1 },
        },
        events,
      };
    }
    case 'discard': {
      if (needsRefill(s)) return illegal(s, 'Refill your hand first.');
      if (s.discardsLeft <= 0) return illegal(s, 'No discards left.');
      if (a.ids.length < 1 || a.ids.length > s.rules.maxDiscard)
        return illegal(s, `Discard 1 to ${s.rules.maxDiscard} tiles.`);
      const ids = new Set(a.ids);
      if (ids.size !== a.ids.length) return illegal(s, 'Pick each tile once.');
      const tiles = s.hand.filter((t) => ids.has(t.id));
      if (tiles.length !== ids.size) return illegal(s, 'Those tiles are not in your hand.');
      const blocked = discardProblem(s, a.ids);
      if (blocked) return illegal(s, blocked);
      events.push({ type: 'discard', tiles });
      const rng = new Rng(s.rng);
      const d = afterDiscard(s, tiles, rng, events);
      const next = finishIfOver(
        withTurnEnd(
          {
            ...s,
            hand: s.hand.filter((t) => !ids.has(t.id)),
            stacks: d.stacks,
            discarded: d.discarded,
            discardsLeft: s.discardsLeft - 1,
            turns: s.turns + 1,
            rng: rng.state,
          },
          events,
          null,
        ),
        events,
      );
      return { state: next, events };
    }
  }
}
