import { ENHANCEMENTS } from '@/content/enhancements';
import { SET_TYPES, type SetKind } from '@/content/sets';
import type { TileKind } from '@/content/tiles';
import {
  type RoundAction,
  type RoundEvent,
  type RoundState,
  type Reduced,
  freeWallSlots,
  needsRefill,
  roundReduce,
  usableDiscards,
} from './round';
import { type PlayedSet } from './scoring';
import { type Candidate, findSets } from './sets';
import { type Tile, isOutside, isSuited, isWind, rankOf, suitOf, tileChips } from './tiles';
import { armouredIds } from './twists';
import { wallCovers, wallSlots } from './wall';

/**
 * The hint bot: it plays a round the way the Python prototypes did (tools/sim-py/runsim.py,
 * RunRound). `greedy` plays the best set it has; `pongs` holds pairs and digs for pongs. The
 * sparrow's hints, the Auto refill and the simulator all use it. These weights are the bot's
 * judgement, not game rules.
 */
export type Policy = 'greedy' | 'pongs';

export type Move =
  | {
      readonly type: 'play';
      readonly ids: readonly number[];
      readonly kind: SetKind;
      readonly reason: string;
    }
  | { readonly type: 'discard'; readonly ids: readonly number[]; readonly reason: string };

type Counts = ReadonlyMap<TileKind, number>;

function counts(hand: readonly Tile[]): Map<TileKind, number> {
  const m = new Map<TileKind, number>();
  for (const t of hand) m.set(t.kind, (m.get(t.kind) ?? 0) + 1);
  return m;
}

const get = (c: Counts, k: TileKind): number => c.get(k) ?? 0;

// ---- dragon-aware heuristics (the Python set_bonus and tile_bonus) -------------------------------
type SetBonus = (kind: SetKind, tiles: readonly Tile[], table: readonly PlayedSet[]) => number;
type TileBonus = (kind: TileKind) => number;

function suitsOn(table: readonly PlayedSet[]): Set<string> {
  const s = new Set<string>();
  for (const set of table) for (const t of set.tiles) if (isSuited(t.kind)) s.add(suitOf(t.kind));
  return s;
}

const suitBonus =
  (suit: string, w: number): SetBonus =>
  (_k, tiles) =>
    w * tiles.filter((t) => suitOf(t.kind) === suit).length;
const suitTile =
  (suit: string): TileBonus =>
  (k) =>
    suitOf(k) === suit ? 1.5 : 1;
const isBigKind = (k: SetKind) => k === 'pong' || k === 'kong';

const SET_BONUS: Record<string, SetBonus> = {
  abacus: (k) => (k === 'chow' ? 24 : 0),
  bambooGrove: suitBonus('s', 12),
  coinPurse: suitBonus('p', 12),
  scroll: suitBonus('m', 12),
  sparrowNest: (k) => (k === 'pair' ? 72 : 0),
  pongHall: (k) => (isBigKind(k) ? 80 : 0),
  outside: (_k, tiles) => (tiles.some((t) => isOutside(t.kind)) ? 48 : 0),
  mahjong: (k, _t, table) => (k === 'pair' && !table.some((s) => s.kind === 'pair') ? 150 : 0),
  twoSuits: (_k, tiles, table) => {
    const on = suitsOn(table);
    return on.size >= 2 && tiles.some((t) => isSuited(t.kind) && !on.has(suitOf(t.kind))) ? -90 : 0;
  },
  allSimples: (_k, tiles) => (tiles.some((t) => isOutside(t.kind)) ? -250 : 0),
  pureStraight: (k, tiles) =>
    k === 'chow' && [1, 4, 7].includes(Math.min(...tiles.map((t) => rankOf(t.kind)))) ? 40 : 0,
  kongBell: (k) => (k === 'kong' ? 250 : 0),
  windChime: (k, tiles) =>
    k === 'winds' || (isBigKind(k) && isWind((tiles[0] as Tile).kind)) ? 144 : 0,
  threeTreasures: (k) => (k === 'pong' ? 120 : 0),
  stoneLion: (k) => (k === 'pong' ? 108 : k === 'kong' ? 144 : 0),
  twinCranes: (k, tiles, table) => {
    const key = tiles.map((t) => t.kind).join(',');
    return table.some((s) => s.kind === k && s.tiles.map((t) => t.kind).join(',') === key)
      ? 100
      : 0;
  },
};

const TILE_BONUS: Record<string, TileBonus> = {
  bambooGrove: suitTile('s'),
  coinPurse: suitTile('p'),
  scroll: suitTile('m'),
  outside: (k) => (isOutside(k) ? 1.4 : 1),
  allSimples: (k) => (isOutside(k) ? 0.1 : 1),
  windChime: (k) => (isWind(k) ? 2 : 1),
};

// ---- values ------------------------------------------------------------------------------------
export function setValue(s: RoundState, kind: SetKind, tiles: readonly Tile[]): number {
  const t = SET_TYPES[kind];
  const lv = s.levels[kind] ?? 0;
  const chips = t.chips + t.levelChips * lv;
  const mult = t.mult + t.levelMult * lv;
  let v = chips + tiles.reduce((n, x) => n + tileChips(x.kind), 0) + 12 * mult;
  for (const x of tiles) {
    if (!x.enh) continue;
    const en = ENHANCEMENTS[x.enh];
    v += 12 * en.mult + en.chips + (en.xmult > 1 ? 60 : 0);
  }
  for (const id of s.dragons) {
    const sb = SET_BONUS[id];
    if (sb) v += sb(kind, tiles, s.table);
  }
  return v;
}

function tileValue(s: RoundState, kind: TileKind, c: Counts, policy: Policy): number {
  const hunter = policy === 'pongs';
  const n = get(c, kind);
  let v: number;
  if (n === 3 && (s.copies[kind] ?? 0) >= 4) v = 10;
  else if (n === 2) v = 11;
  else {
    v = 0;
    if (isSuited(kind)) {
      const su = suitOf(kind);
      const r = rankOf(kind);
      const has = (x: number) => get(c, `${su}${x}`) > 0;
      if ((has(r - 2) && has(r - 1)) || (has(r - 1) && has(r + 1)) || (has(r + 1) && has(r + 2)))
        v = hunter ? 3 : 8;
    }
    if (
      !v &&
      kind.startsWith('w') &&
      [1, 2, 3, 4].filter((x) => get(c, `w${x}`) > 0).length >= 2 &&
      !n
    )
      v = 6;
    if (!v && n === 1) v = hunter ? 6 : 4;
    if (!v && !hunter && isSuited(kind)) {
      const su = suitOf(kind);
      const r = rankOf(kind);
      if (get(c, `${su}${r - 1}`) || get(c, `${su}${r + 1}`)) v = 3;
      else if (get(c, `${su}${r - 2}`) || get(c, `${su}${r + 2}`)) v = 2;
    }
  }
  for (const id of s.dragons) {
    const tb = TILE_BONUS[id];
    if (tb) v *= tb(kind);
  }
  return v;
}

function keepValue(s: RoundState, t: Tile, policy: Policy): number {
  const c = counts(s.hand);
  c.set(t.kind, get(c, t.kind) - 1);
  return tileValue(s, t.kind, c, policy);
}

// ---- the brick wall ----------------------------------------------------------------------------
/** How much the tiles a take would free count, against the tile itself. */
const UNCOVER_WEIGHT = 0.4;

/**
 * Which free wall tile the bot takes, or null: the tile's worth to the hand, plus a share of the
 * tiles taking it would free (the wall's faces all show, so this is fair to the player).
 */
export function chooseSlot(s: RoundState, policy: Policy = 'greedy'): number | null {
  const wall = s.wall;
  if (!wall) return null;
  const covers = wallCovers(wallSlots(s.rules.wallRows, s.rules.wallWidth));
  const c = counts(s.hand);
  let best = -Infinity;
  let bi: number | null = null;
  for (const i of freeWallSlots(s)) {
    const t = wall[i] as Tile;
    let sc = tileValue(s, t.kind, c, policy);
    covers.forEach((on, j) => {
      const below = wall[j];
      if (!below || !on.includes(i)) return;
      // freed if i is the last tile resting on it
      if (on.every((k) => k === i || !wall[k]))
        sc += UNCOVER_WEIGHT * tileValue(s, below.kind, c, policy);
    });
    if (sc > best) {
      best = sc;
      bi = i;
    }
  }
  return bi;
}

/** Fill the hand from the wall with the bot's choices, one take at a time. */
export function autoRefill(
  s: RoundState,
  policy: Policy = 'greedy',
): Reduced<RoundState, RoundEvent> {
  let state = s;
  const events: RoundEvent[] = [];
  while (needsRefill(state)) {
    const i = chooseSlot(state, policy);
    if (i === null) break;
    const r = roundReduce(state, { type: 'take', slot: i });
    if (r.state === state) break;
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

// ---- a turn ------------------------------------------------------------------------------------
function keptSets(s: RoundState, all: Candidate[]): Candidate[] {
  return all.filter((c) => setValue(s, c.kind, c.tiles) > -50 || s.playsLeft <= 2);
}

/** A fourth copy may still come: the set has 4 and not all are in sight (hand, table, discards). */
function kongInReach(s: RoundState, kind: TileKind): boolean {
  if ((s.copies[kind] ?? 0) < 4) return false;
  const seen = [...s.hand, ...s.table.flatMap((x) => x.tiles), ...s.discarded].filter(
    (t) => t.kind === kind,
  ).length;
  return seen < (s.copies[kind] ?? 0);
}

function best(s: RoundState, list: Candidate[]): Candidate {
  let top = list[0] as Candidate;
  let tv = setValue(s, top.kind, top.tiles);
  for (const c of list) {
    const v = setValue(s, c.kind, c.tiles);
    if (v > tv) {
      top = c;
      tv = v;
    }
  }
  return top;
}

function playMove(c: Candidate, reason: string): Move {
  return { type: 'play', ids: c.tiles.map((t) => t.id), kind: c.kind, reason };
}

function discardMove(s: RoundState, policy: Policy, reason: string): Move {
  const held = new Set(armouredIds(s));
  const ranked = s.hand
    .filter((t) => !held.has(t.id))
    .map((t) => ({ t, v: keepValue(s, t, policy) }))
    .sort((a, b) => a.v - b.v);
  let junk = ranked.filter((x) => x.v <= 1).slice(0, s.rules.maxDiscard);
  if (junk.length === 0) junk = ranked.slice(0, 2);
  return { type: 'discard', ids: junk.map((x) => x.t.id), reason };
}

/**
 * The bot's move for the current turn (the hand must be full or the wall dry). Always legal: a
 * single is only chosen when no set can be made and there are no discards.
 */
export function chooseMove(s: RoundState, policy: Policy = 'greedy'): Move | null {
  const m = chooseOne(s, policy);
  return m && m.type === 'play' && m.kind !== 'single' ? withMoreSets(s, m, policy) : m;
}

/**
 * A play may hold several sets: add the best other set the bot would play anyway, while the play
 * has room. The table scores at the end, so tabling a set sooner costs nothing, except a pair the
 * pongs policy is holding to grow.
 */
function withMoreSets(s: RoundState, m: Move & { type: 'play' }, policy: Policy): Move {
  let ids = [...m.ids];
  for (let n = 1; n < s.rules.maxSets; n++) {
    const used = new Set(ids);
    const rest = s.hand.filter((t) => !used.has(t.id));
    const more = keptSets({ ...s, hand: rest }, findSets(rest)).filter(
      (c) => !(policy === 'pongs' && c.kind === 'pair') && setValue(s, c.kind, c.tiles) > 0,
    );
    if (more.length === 0) break;
    ids = [...ids, ...best(s, more).tiles.map((t) => t.id)];
  }
  return ids.length === m.ids.length ? m : { ...m, ids, reason: `${m.reason} With another set.` };
}

function chooseOne(s: RoundState, policy: Policy): Move | null {
  if (s.hand.length === 0) return null;
  const all = findSets(s.hand);
  const sets = keptSets(s, all);
  const held = new Set(armouredIds(s));
  const free = s.hand.filter((t) => !held.has(t.id));
  const canDiscard = usableDiscards(s) > 0 && free.length > 0;
  if (policy === 'pongs') {
    const big = sets.filter((c) => ['kong', 'pong', 'winds'].includes(c.kind));
    if (big.length) return playMove(best(s, big), 'A big set: play it.');
    if (canDiscard && s.playsLeft > 1)
      return discardMove(s, policy, 'No big set yet: discard to dig for one.');
    const rest = sets.filter((c) => c.kind !== 'pair');
    const pick = rest.length ? rest : sets;
    if (pick.length) return playMove(best(s, pick), 'Out of discards: play your best set.');
  } else {
    const ranked = sets
      .slice()
      .sort((a, b) => setValue(s, b.kind, b.tiles) - setValue(s, a.kind, a.tiles));
    const strong = ranked.filter((c) => c.kind !== 'pair' || setValue(s, c.kind, c.tiles) >= 80);
    if (strong.length) {
      let choice = strong[0] as Candidate;
      if (
        choice.kind === 'pong' &&
        kongInReach(s, (choice.tiles[0] as Tile).kind) &&
        s.playsLeft > 1
      ) {
        const k = (choice.tiles[0] as Tile).kind;
        const alt = strong.slice(1).filter((c) => !c.tiles.some((t) => t.kind === k));
        if (alt.length) choice = alt[0] as Candidate;
        else if (canDiscard)
          return discardMove(s, policy, 'The fourth copy is in the wall: hold the pong and dig.');
      }
      return playMove(choice, 'Your best set.');
    }
    if (canDiscard && s.playsLeft > 1)
      return discardMove(s, policy, 'Nothing worth playing: discard to dig.');
    if (ranked.length)
      return playMove(ranked[0] as Candidate, 'Out of discards: play your best set.');
  }
  // Nothing the bot likes. Play a set it filtered out, discard, or at last a single.
  if (all.length) return playMove(best(s, all), 'Play the least bad set.');
  if (canDiscard) return discardMove(s, policy, 'No set in your hand: discard to dig.');
  const t = s.hand.reduce((a, b) => (tileChips(b.kind) > tileChips(a.kind) ? b : a));
  return {
    type: 'play',
    ids: [t.id],
    kind: 'single',
    reason: 'No set and no discards: play a single.',
  };
}

export function moveAction(m: Move): RoundAction {
  return { type: m.type, ids: m.ids };
}

/** Plays the rest of a round with the bot (playing, discarding) to the end. */
export function playOut(s: RoundState, policy: Policy = 'greedy'): RoundState {
  let state = s;
  for (let guard = 0; guard < 400 && state.phase === 'play'; guard++) {
    state = autoRefill(state, policy).state;
    if (state.phase !== 'play') break;
    const m = chooseMove(state, policy);
    if (!m) break;
    const r = roundReduce(state, moveAction(m));
    if (r.state === state) break;
    state = r.state;
  }
  return state;
}
