import type { Twist } from '@/content/hosts';
import type { Rng } from './rng';
import type { RoundEvent, RoundRules, RoundState } from './round';
import type { ScoreModifiers } from './scoring';
import type { Tile } from './tiles';
import type { Stacks } from './wall';

/**
 * A host's twist, run as data: the content says what each twist is (src/content/hosts.ts) and this
 * file is the one place that knows how each changes the round. The round reducer calls these hooks;
 * nothing else in the engine names a host.
 */
export interface TwistState {
  readonly twist: Twist;
  /** coil: a chow has been played, so discarding is allowed. */
  readonly uncoiled: boolean;
  /** swaps: swaps the player may still make themselves. */
  readonly swapsLeft: number;
  /** swaps: sets played (a play or an upgrade). */
  readonly played: number;
  /** embers: the burning tiles, by id. */
  readonly burning: readonly number[];
  /** embers: turns each burning tile has sat in the hand. */
  readonly clock: Readonly<Record<number, number>>;
  /** shell: the tiles of the first hand, armoured while the armour holds. */
  readonly tops: readonly number[];
  /** shell: armour is still on. */
  readonly armour: boolean;
}

export function twistRules(rules: RoundRules, twist: Twist | null): RoundRules {
  if (!twist) return rules;
  switch (twist.id) {
    case 'masked':
    case 'moonTide':
      return { ...rules, handSize: rules.handSize + twist.hand };
    default:
      return rules;
  }
}

/** Set up a twist for a freshly shuffled pile. */
export function initTwist(twist: Twist, stacks: Stacks, rng: Rng): TwistState {
  let burning: number[] = [];
  if (twist.id === 'embers') {
    const all = stacks.flat().map((t) => t.id);
    burning = rng.shuffle(all).slice(0, twist.burning);
  }
  return {
    twist,
    uncoiled: false,
    swapsLeft: twist.id === 'swaps' ? twist.playerSwaps : 0,
    played: 0,
    burning,
    clock: {},
    tops: [],
    armour: twist.id === 'shell',
  };
}

/** After the first hand is drawn: the shell armours it. */
export function afterDeal(t: TwistState, hand: readonly Tile[]): TwistState {
  return t.twist.id === 'shell' ? { ...t, tops: hand.map((x) => x.id) } : t;
}

/** Why these tiles can't be discarded under the twist, or null. */
export function discardProblem(s: RoundState, ids: readonly number[]): string | null {
  const t = s.twist;
  if (!t) return null;
  if (t.twist.id === 'coil' && !t.uncoiled) return 'No discarding until you play a chow.';
  if (t.armour && ids.some((id) => t.tops.includes(id)))
    return 'Armoured tiles stay in your hand until you play a set.';
  return null;
}

/** The hand tiles the shell's armour holds, while it holds. */
export function armouredIds(s: RoundState): readonly number[] {
  return s.twist?.armour ? s.twist.tops : [];
}

/** After a set is played (or a pong upgraded): a chow uncoils, any set breaks the armour. */
export function afterSetPlayed(t: TwistState, kind: string): TwistState {
  let next: TwistState = { ...t, played: t.played + 1 };
  if (t.twist.id === 'coil' && kind === 'chow') next = { ...next, uncoiled: true };
  if (t.twist.id === 'shell') next = { ...next, armour: false };
  return next;
}

/** Put a tile back into the pile at a random depth (never straight back on top). */
export function intoPile(stacks: Stacks, tile: Tile, rng: Rng): Stacks {
  const pile = (stacks[0] ?? []).slice();
  pile.splice(rng.int(Math.max(1, pile.length)), 0, tile);
  return [pile, ...stacks.slice(1)];
}

/** Discards: the moon tide shuffles them back into the pile. */
export function afterDiscard(
  s: RoundState,
  tiles: readonly Tile[],
  rng: Rng,
  events: RoundEvent[],
): { stacks: Stacks; discarded: readonly Tile[] } {
  if (s.twist?.twist.id !== 'moonTide')
    return { stacks: s.stacks, discarded: [...s.discarded, ...tiles] };
  let stacks = s.stacks;
  for (const tile of tiles) {
    stacks = intoPile(stacks, tile, rng);
    events.push({ type: 'tide', tile });
  }
  return { stacks, discarded: s.discarded };
}

/** End of a turn, before the refill: embers burn away and a swap may fall due. */
export function endTurn(
  twist: TwistState,
  hand: readonly Tile[],
  stacks: Stacks,
  rng: Rng,
  events: RoundEvent[],
  playedNow: boolean,
): { hand: readonly Tile[]; stacks: Stacks; twist: TwistState } {
  let h = hand;
  let st = stacks;
  let t = twist;
  const w = t.twist;
  if (w.id === 'embers') {
    const clock: Record<number, number> = { ...t.clock };
    const burning = new Set(t.burning);
    h = h.filter((tile) => {
      if (!burning.has(tile.id)) return true;
      clock[tile.id] = (clock[tile.id] ?? 0) + 1;
      if ((clock[tile.id] ?? 0) < w.turns) return true;
      events.push({ type: 'burn', tile });
      burning.delete(tile.id);
      return false;
    });
    t = { ...t, clock, burning: [...burning] };
  }
  if (w.id === 'swaps' && playedNow && t.played > 0 && t.played % w.every === 0 && h.length > 0) {
    const tile = h[rng.int(h.length)] as Tile;
    h = h.filter((x) => x.id !== tile.id);
    st = intoPile(st, tile, rng);
    events.push({ type: 'swap', tile, auto: true });
  }
  return { hand: h, stacks: st, twist: t };
}

export function swapProblem(s: RoundState, id: number): string | null {
  const t = s.twist;
  if (!t || t.twist.id !== 'swaps') return 'This wind does not allow swaps.';
  if (t.swapsLeft <= 0) return 'You have used your swap.';
  if (!s.hand.some((x) => x.id === id)) return 'That tile is not in your hand.';
  if ((s.stacks[0]?.length ?? 0) === 0) return 'The pile is empty.';
  return null;
}

/** The scoring changes a twist makes, from what is on the table. */
export function twistModifiers(s: RoundState): ScoreModifiers | undefined {
  const t = s.twist;
  if (!t) return undefined;
  const w = t.twist;
  switch (w.id) {
    case 'masked':
      return { setMult: { chow: w.mult, pong: w.mult, kong: w.mult, winds: w.mult } };
    case 'coil':
      return { chipsX: { chow: w.chowChipsX } };
    case 'claws':
      return { chipsX: { pong: w.bigChipsX, kong: w.bigChipsX } };
    case 'embers': {
      const tileMult: Record<number, number> = {};
      for (const set of s.table)
        for (const tile of set.tiles) if (t.burning.includes(tile.id)) tileMult[tile.id] = w.mult;
      return { tileMult };
    }
    case 'report': {
      const used = s.rules.discards - s.discardsLeft;
      return { penalty: used * w.discardCost, ...(used === 0 ? { xmult: w.noDiscardX } : {}) };
    }
    case 'shell':
      return { setMult: { kong: w.kongMult } };
    default:
      return undefined;
  }
}
