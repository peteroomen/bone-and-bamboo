import { SET_TYPES } from '@/content/sets';
import { type Policy, chooseMove, chooseSlot } from './ai';
import { brokenDragons } from './goals';
import {
  type RoundState,
  finishProblem,
  needsRefill,
  scoreContext,
  upgradeProblem,
  upgrades,
  usableDiscards,
} from './round';
import { type PlayedSet, scoreTable } from './scoring';
import { classify, orderSet, playProblem } from './sets';
import { type Tile, kindName } from './tiles';

/**
 * Ask the dragon: one legal action with a reason, from what you can see. It never reads the hidden
 * pile. Final-play advice compares the real scores of the whole table.
 */
export type Advice =
  | { readonly type: 'draw'; readonly slot: number; readonly reason: string }
  | {
      readonly type: 'play';
      readonly ids: readonly number[];
      readonly kind: PlayedSet['kind'];
      readonly reason: string;
    }
  | { readonly type: 'discard'; readonly ids: readonly number[]; readonly reason: string }
  | {
      readonly type: 'upgrade';
      readonly setIndex: number;
      readonly tileId: number;
      readonly reason: string;
    }
  | { readonly type: 'finish'; readonly reason: string };

export interface Play {
  readonly kind: PlayedSet['kind'];
  readonly tiles: Tile[];
}

/** Every legal play from the hand: every subset that makes a set, whichever physical tiles. */
export function legalPlays(hand: readonly Tile[], discardsLeft: number): Play[] {
  const out: Play[] = [];
  const n = hand.length;
  const pick: Tile[] = [];
  const go = (from: number) => {
    if (pick.length >= 1) {
      const kind = classify(pick);
      if (
        kind &&
        playProblem(
          hand,
          pick.map((t) => t.id),
          discardsLeft,
        ) === null
      )
        out.push({ kind, tiles: pick.slice() });
    }
    if (pick.length === 4) return;
    for (let i = from; i < n; i++) {
      pick.push(hand[i] as Tile);
      go(i + 1);
      pick.pop();
    }
  };
  go(0);
  return out;
}

function tableAfter(s: RoundState, p: Play): PlayedSet[] {
  return [...s.table, { kind: p.kind, tiles: orderSet(p.tiles) }];
}

function describeTake(s: RoundState, slot: number): string {
  const tile = s.wall?.[slot];
  if (!tile) return 'The best tile on show.';
  const have = s.hand.filter((t) => t.kind === tile.kind).length;
  const name = kindName(tile.kind);
  if (have >= 3) return `Take the ${name}: a fourth to make a kong.`;
  if (have === 2) return `Take the ${name}: it makes a pong.`;
  if (have === 1) return `Take the ${name}: it makes a pair.`;
  return `Take the ${name}: it fits a run, your dragons, or frees a good tile.`;
}

export function advise(s: RoundState, policy: Policy = 'greedy'): Advice | null {
  if (s.phase !== 'play') return null;
  if (needsRefill(s)) {
    const slot = chooseSlot(s, policy);
    return slot === null ? null : { type: 'draw', slot, reason: describeTake(s, slot) };
  }
  const ctx = scoreContext(s);
  const now = scoreTable(s.table, ctx).total;
  const plays = legalPlays(s.hand, usableDiscards(s));
  const ups = upgrades(s).filter((u) => upgradeProblem(s, u.setIndex, u.tileId) === null);
  const scored = plays.map((p) => ({ p, total: scoreTable(tableAfter(s, p), ctx).total }));
  const upScored = ups.map((u) => {
    const set = s.table[u.setIndex] as PlayedSet;
    const tile = s.hand.find((t) => t.id === u.tileId) as Tile;
    const table = s.table.map((x, i) =>
      i === u.setIndex ? { kind: 'kong' as const, tiles: orderSet([...set.tiles, tile]) } : x,
    );
    return { u, total: scoreTable(table, ctx).total };
  });
  const bestPlay = scored.reduce<{ p: Play; total: number } | null>(
    (a, b) => (!a || b.total > a.total ? b : a),
    null,
  );
  const bestUp = upScored.reduce<{ u: (typeof ups)[number]; total: number } | null>(
    (a, b) => (!a || b.total > a.total ? b : a),
    null,
  );
  const canBank = finishProblem(s) === null;

  // The last play: the actual best table, or bank if nothing improves it.
  if (s.playsLeft === 1) {
    const best = Math.max(bestPlay?.total ?? -1, bestUp?.total ?? -1);
    if (canBank && best <= now)
      return {
        type: 'finish',
        reason: 'Your table already beats the target and no last play improves it: bank it.',
      };
    if (bestUp && bestUp.total >= (bestPlay?.total ?? -1) && bestUp.total >= 0)
      return {
        type: 'upgrade',
        setIndex: bestUp.u.setIndex,
        tileId: bestUp.u.tileId,
        reason: `Upgrade the pong to a kong: the table scores ${bestUp.total.toLocaleString('en-GB')}.`,
      };
    if (bestPlay)
      return {
        type: 'play',
        ids: bestPlay.p.tiles.map((t) => t.id),
        kind: bestPlay.p.kind,
        reason: `Your last play: the table scores ${bestPlay.total.toLocaleString('en-GB')}.`,
      };
  }

  // An upgrade that gains at least as much as the best new set is worth a play.
  if (bestUp && bestUp.total > now && bestUp.total >= (bestPlay?.total ?? -1))
    return {
      type: 'upgrade',
      setIndex: bestUp.u.setIndex,
      tileId: bestUp.u.tileId,
      reason: "You hold the pong's fourth tile: upgrade it to a kong.",
    };

  const move = chooseMove(s, policy);
  if (!move)
    return canBank ? { type: 'finish', reason: 'Nothing left to play: bank the table.' } : null;
  if (move.type === 'discard') return { type: 'discard', ids: move.ids, reason: move.reason };

  // Prefer a play that keeps your multipliers when the bot's choice would break one.
  const chosen = plays.find(
    (p) => p.tiles.length === move.ids.length && p.tiles.every((t) => move.ids.includes(t.id)),
  );
  if (chosen && brokenDragons(s.table, tableAfter(s, chosen), s.dragons).length > 0) {
    const safe = scored
      .filter(
        (x) =>
          x.p.kind !== 'single' &&
          brokenDragons(s.table, tableAfter(s, x.p), s.dragons).length === 0,
      )
      .sort((a, b) => b.total - a.total)[0];
    if (safe)
      return {
        type: 'play',
        ids: safe.p.tiles.map((t) => t.id),
        kind: safe.p.kind,
        reason: `A ${SET_TYPES[safe.p.kind].name.toLowerCase()} that keeps your multipliers.`,
      };
  }
  return { type: 'play', ids: move.ids, kind: move.kind, reason: move.reason };
}
