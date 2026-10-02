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
  /** coil: stack indexes that cannot be taken from until a chow is played. */
  readonly locked: readonly number[];
  /** swaps: swaps the player may still make themselves. */
  readonly swapsLeft: number;
  /** swaps: sets played (a play or an upgrade). */
  readonly played: number;
  /** embers: the burning tiles, by id. */
  readonly burning: readonly number[];
  /** embers: turns each burning tile has sat on a stack top. */
  readonly clock: Readonly<Record<number, number>>;
  /** The tile ids that were stack tops at the deal (the masked twist's unhidden tiles; the shell's armoured ones). */
  readonly tops: readonly number[];
  /** shell: armour is still on. */
  readonly armour: boolean;
}

export function twistRules(rules: RoundRules, twist: Twist | null): RoundRules {
  if (!twist) return rules;
  switch (twist.id) {
    case 'masked':
      return { ...rules, peek: 0 };
    case 'moonTide':
      return { ...rules, handSize: rules.handSize + twist.hand };
    case 'shell':
      return { ...rules, stacks: twist.stacks };
    default:
      return rules;
  }
}

/** Set up a twist for a freshly dealt wall. */
export function initTwist(twist: Twist, stacks: Stacks, rng: Rng): TwistState {
  const tops = stacks.filter((s) => s.length > 0).map((s) => (s[s.length - 1] as Tile).id);
  let locked: number[] = [];
  let burning: number[] = [];
  if (twist.id === 'coil') {
    const idx = rng.shuffle(stacks.map((_, i) => i));
    locked = idx.slice(0, twist.lockedStacks);
  }
  if (twist.id === 'embers') {
    const all = stacks.flat().map((t) => t.id);
    burning = rng.shuffle(all).slice(0, twist.burning);
  }
  return {
    twist,
    locked,
    swapsLeft: twist.id === 'swaps' ? twist.playerSwaps : 0,
    played: 0,
    burning,
    clock: {},
    tops,
    armour: twist.id === 'shell',
  };
}

export function takeProblem(s: RoundState, stack: number): string | null {
  const t = s.twist;
  if (t && t.locked.includes(stack)) return 'That stack is locked until you play a chow.';
  return null;
}

/** Why these tiles can't be discarded under the twist, or null. */
export function discardProblem(s: RoundState, ids: readonly number[]): string | null {
  const t = s.twist;
  if (t && t.armour && ids.some((id) => t.tops.includes(id)))
    return 'Armoured tiles stay in your hand until you play a set.';
  return null;
}

/** The hand tiles the shell's armour holds, while it holds. */
export function armouredIds(s: RoundState): readonly number[] {
  return s.twist?.armour ? s.twist.tops : [];
}

/** After a set is played (or a pong upgraded): chows unlock stacks, any set breaks the armour. */
export function afterSetPlayed(t: TwistState, kind: string): TwistState {
  let next: TwistState = { ...t, played: t.played + 1 };
  if (t.twist.id === 'coil' && kind === 'chow') next = { ...next, locked: [] };
  if (t.twist.id === 'shell') next = { ...next, armour: false };
  return next;
}

/** Discards: the moon tide sends them back to the bottom of a random stack. */
export function afterDiscard(
  s: RoundState,
  tiles: readonly Tile[],
  rng: Rng,
  events: RoundEvent[],
): { stacks: Stacks; discarded: readonly Tile[] } {
  if (s.twist?.twist.id !== 'moonTide')
    return { stacks: s.stacks, discarded: [...s.discarded, ...tiles] };
  const stacks = s.stacks.map((st) => st.slice());
  for (const tile of tiles) {
    const i = rng.int(stacks.length);
    (stacks[i] as Tile[]).unshift(tile);
    events.push({ type: 'tide', tile, stack: i });
  }
  return { stacks, discarded: s.discarded };
}

/** End of a turn: embers burn away and a swap may fall due. Returns the new stacks and twist. */
export function endTurn(
  twist: TwistState,
  stacks: Stacks,
  rng: Rng,
  events: RoundEvent[],
  playedNow: boolean,
): { stacks: Stacks; twist: TwistState } {
  let st = stacks;
  let t = twist;
  const w = t.twist;
  if (w.id === 'embers') {
    const clock: Record<number, number> = { ...t.clock };
    const burning = new Set(t.burning);
    st = st.map((stack, i) => {
      const top = stack[stack.length - 1];
      if (!top || !burning.has(top.id)) return stack;
      clock[top.id] = (clock[top.id] ?? 0) + 1;
      if ((clock[top.id] ?? 0) >= w.turns) {
        events.push({ type: 'burn', tile: top, stack: i });
        burning.delete(top.id);
        return stack.slice(0, -1);
      }
      return stack;
    });
    t = { ...t, clock, burning: [...burning] };
  }
  if (t.twist.id === 'swaps' && playedNow && t.played > 0 && t.played % t.twist.every === 0) {
    const full = st.map((x, i) => (x.length > 0 ? i : -1)).filter((i) => i >= 0);
    if (full.length >= 2) {
      const [a, b] = rng.shuffle(full) as [number, number];
      st = swapTops(st, a, b);
      events.push({ type: 'swap', a, b, auto: true });
    }
  }
  return { stacks: st, twist: t };
}

export function swapTops(stacks: Stacks, a: number, b: number): Stacks {
  const out = stacks.map((s) => s.slice());
  const sa = out[a] as Tile[];
  const sb = out[b] as Tile[];
  const ta = sa.pop() as Tile;
  const tb = sb.pop() as Tile;
  sa.push(tb);
  sb.push(ta);
  return out;
}

export function swapProblem(s: RoundState, a: number, b: number): string | null {
  const t = s.twist;
  if (!t || t.twist.id !== 'swaps') return 'This wind does not allow swaps.';
  if (t.swapsLeft <= 0) return 'You have used your swap.';
  if (a === b) return 'Pick two different stacks.';
  if (!s.stacks[a]?.length || !s.stacks[b]?.length) return 'Pick two stacks with tiles.';
  return null;
}

/** The scoring changes a twist makes, from what is on the table. */
export function twistModifiers(s: RoundState): ScoreModifiers | undefined {
  const t = s.twist;
  if (!t) return undefined;
  const w = t.twist;
  switch (w.id) {
    case 'masked': {
      const tileMult: Record<number, number> = {};
      // +mult per set that holds a tile taken while hidden: carried by the first such tile
      for (const set of s.table) {
        const blind = set.tiles.find((tile) => !t.tops.includes(tile.id));
        if (blind) tileMult[blind.id] = w.mult;
      }
      return { tileMult };
    }
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
