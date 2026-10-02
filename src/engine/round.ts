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
import { classify, orderSet, playProblem } from './sets';
import { type Tile, countKinds } from './tiles';
import { type Stacks, deal, wallCount } from './wall';

/** The numbers a round is played with, after curios, tile set and lantern. */
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
  readonly curios: readonly string[];
  readonly levels: Levels;
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
  | { readonly type: 'discard'; readonly ids: readonly number[] };

export type RoundEvent =
  | { readonly type: 'take'; readonly tile: Tile; readonly stack: number }
  | { readonly type: 'play'; readonly kind: PlayedSet['kind']; readonly tiles: readonly Tile[] }
  | { readonly type: 'discard'; readonly tiles: readonly Tile[] }
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
  readonly curios: readonly string[];
  readonly levels: Levels;
  /** The RNG state to shuffle and play the round from. */
  readonly rng: number;
}

/** Deal a new round: the whole set shuffled into stacks. */
export function startRound(setup: RoundSetup): RoundState {
  const rng = new Rng(setup.rng);
  const stacks = deal(setup.tiles, setup.rules.stacks, rng);
  return {
    rules: setup.rules,
    stacks,
    hand: [],
    table: [],
    discarded: [],
    playsLeft: setup.rules.plays,
    discardsLeft: setup.rules.discards,
    curios: setup.curios,
    levels: setup.levels,
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
  return { curios: s.curios, levels: s.levels };
}

/** What the table scores now, and with the selected tiles played as one more set. */
export function preview(
  s: RoundState,
  selectedIds: readonly number[] = [],
): { now: ScoreResult; withSelected: ScoreResult | null } {
  const ctx = scoreContext(s);
  const now = scoreTable(s.table, ctx);
  const picked = selectedIds
    .map((id) => s.hand.find((t) => t.id === id))
    .filter((t): t is Tile => t !== undefined);
  const kind = picked.length === selectedIds.length && picked.length > 0 ? classify(picked) : null;
  if (!kind) return { now, withSelected: null };
  return {
    now,
    withSelected: scoreTable([...s.table, { kind, tiles: orderSet(picked) }], ctx),
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

export function roundReduce(s: RoundState, a: RoundAction): Reduced<RoundState, RoundEvent> {
  if (s.phase === 'done') return illegal(s, 'The round is over.');
  const events: RoundEvent[] = [];
  switch (a.type) {
    case 'take': {
      if (s.hand.length >= s.rules.handSize) return illegal(s, 'Your hand is full.');
      const stack = s.stacks[a.stack];
      if (!stack || stack.length === 0) return illegal(s, 'That stack is empty.');
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
        {
          ...s,
          hand: s.hand.filter((t) => !ids.has(t.id)),
          table: [...s.table, { kind, tiles }],
          playsLeft: s.playsLeft - 1,
          turns: s.turns + 1,
        },
        events,
      );
      return { state: next, events };
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
      events.push({ type: 'discard', tiles });
      const next = finishIfOver(
        {
          ...s,
          hand: s.hand.filter((t) => !ids.has(t.id)),
          discarded: [...s.discarded, ...tiles],
          discardsLeft: s.discardsLeft - 1,
          turns: s.turns + 1,
        },
        events,
      );
      return { state: next, events };
    }
  }
}
