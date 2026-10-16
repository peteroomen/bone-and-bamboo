import { CHARMS, type CharmEffect } from '@/content/charms';
import type { Twist } from '@/content/hosts';
import type { PatternId } from '@/content/patterns';
import { RULES } from '@/content/rules';
import type { SetKind } from '@/content/sets';
import type { TileKind } from '@/content/tiles';
import { type Die, type Face, neighbours, opposite, rollFace, withFace } from './dice';
import { Rng, type RngState } from './rng';
import { type HandScore, scoreHand } from './scoring';
import { type RackSet, type RackTile, baseKind, classify, isComplete, rackProblem } from './sets';
import { isBonus, suitOf } from './tiles';

/** One die in the cup, as it lies on the table. */
export interface CupDie {
  readonly dieId: number;
  /** The face showing, or null before its first roll. */
  readonly face: number | null;
  /** The Mirror: the face this die copies (a face it doesn't have). */
  readonly copy?: Face;
  readonly held: boolean;
  /** Its face went onto your rack (or the shelf): it rolls again next time. */
  readonly spent: boolean;
  /** Frost: held for the last roll, so it can't be held for the next. */
  readonly frozen?: boolean;
}

export interface HandRecord {
  readonly total: number;
  readonly patterns: readonly PatternId[];
}

export interface RoundUses {
  /** Per roll. */
  readonly thumb: boolean;
  /** Per hand. */
  readonly mirror: boolean;
  readonly shell: boolean;
  readonly fan: boolean;
}

export interface RoundState {
  readonly index: number;
  readonly wind: number;
  readonly host: boolean;
  readonly twist: Twist | null;
  readonly target: number;
  readonly rng: RngState;
  /** Your dice for this round (a West blank or a cracked face shows here). */
  readonly dice: readonly Die[];
  readonly cup: readonly CupDie[];
  readonly charms: readonly string[];
  readonly levels: Partial<Record<PatternId, number>>;
  readonly rollsLeft: number;
  readonly returnsLeft: number;
  readonly rollsUsed: number;
  readonly rack: readonly RackSet[];
  /** Flowers and seasons for the hand being built. */
  readonly shelf: readonly TileKind[];
  readonly score: number;
  readonly hands: readonly HandRecord[];
  readonly uses: RoundUses;
  /** Porcelain faces that cracked: they stay blank after the round. */
  readonly cracked: readonly { readonly dieId: number; readonly face: number }[];
  /** Money earned in the round (gold faces). */
  readonly money: number;
  readonly over: boolean;
}

export type RoundAction =
  | { readonly type: 'roll' }
  | { readonly type: 'hold'; readonly dieId: number }
  | { readonly type: 'take'; readonly dieIds: readonly number[] }
  | { readonly type: 'return'; readonly index: number }
  | { readonly type: 'tip'; readonly dieId: number; readonly face: number }
  | { readonly type: 'flip'; readonly dieId: number }
  | { readonly type: 'fan'; readonly dieId: number }
  | { readonly type: 'mirror'; readonly dieId: number; readonly fromDieId: number }
  | { readonly type: 'end' };

export interface Landing {
  readonly dieId: number;
  readonly face: number;
  /** Flowers and seasons it landed on first (each set aside, then the die rolled again). */
  readonly bonus: readonly TileKind[];
  /** It stopped on a flower or season after the last reroll: nothing to use this roll. */
  readonly spent: boolean;
}

export type RoundEvent =
  | { readonly type: 'roll'; readonly landings: readonly Landing[]; readonly rollsLeft: number }
  | {
      readonly type: 'move';
      readonly how: 'tip' | 'flip' | 'fan' | 'mirror';
      readonly landing: Landing;
    }
  | { readonly type: 'hold'; readonly dieId: number; readonly held: boolean }
  | { readonly type: 'take'; readonly set: RackSet; readonly upgrade: number | null }
  | { readonly type: 'freeRoll'; readonly amount: number; readonly why: 'kong' | 'bonus' | 'hand' }
  | {
      readonly type: 'mahjong';
      readonly rack: readonly RackSet[];
      readonly shelf: readonly TileKind[];
      readonly score: HandScore;
      readonly roundScore: number;
    }
  | { readonly type: 'crack'; readonly dieId: number; readonly face: number }
  | { readonly type: 'blank'; readonly dieId: number; readonly face: number }
  | { readonly type: 'return'; readonly set: RackSet }
  | { readonly type: 'end'; readonly won: boolean; readonly score: number };

export interface RoundResult {
  readonly state: RoundState;
  readonly events: RoundEvent[];
}

export interface RoundSetup {
  readonly index: number;
  readonly wind: number;
  readonly host: boolean;
  readonly twist: Twist | null;
  readonly target: number;
  readonly seed: RngState;
  readonly dice: readonly Die[];
  readonly charms: readonly string[];
  readonly levels: Partial<Record<PatternId, number>>;
}

export function charmEffects(charms: readonly string[]): CharmEffect[] {
  return charms.flatMap((id) => {
    const c = CHARMS[id];
    return c ? [c.effect] : [];
  });
}

export function hasCharm(charms: readonly string[], type: CharmEffect['type']): boolean {
  return charmEffects(charms).some((e) => e.type === type);
}

function sumEffect(
  charms: readonly string[],
  type: 'rolls' | 'returns' | 'cup' | 'rollOnBonus',
): number {
  let n = 0;
  for (const e of charmEffects(charms)) if (e.type === type) n += e.amount;
  return n;
}

export function cupSize(charms: readonly string[]): number {
  return RULES.cup + sumEffect(charms, 'cup');
}

export function createRound(setup: RoundSetup): RoundState {
  const dice = setup.dice.slice(0, cupSize(setup.charms));
  return {
    index: setup.index,
    wind: setup.wind,
    host: setup.host,
    twist: setup.twist,
    target: setup.target,
    rng: setup.seed,
    dice,
    cup: dice.map((d) => ({ dieId: d.id, face: null, held: false, spent: false })),
    charms: setup.charms,
    levels: setup.levels,
    rollsLeft: Math.max(
      1,
      RULES.rolls + sumEffect(setup.charms, 'rolls') + (setup.twist?.rolls ?? 0),
    ),
    returnsLeft: RULES.returns + sumEffect(setup.charms, 'returns'),
    rollsUsed: 0,
    rack: [],
    shelf: [],
    score: 0,
    hands: [],
    uses: { thumb: false, mirror: false, shell: false, fan: false },
    cracked: [],
    money: 0,
    over: false,
  };
}

export function dieOf(s: RoundState, dieId: number): Die | undefined {
  return s.dice.find((d) => d.id === dieId);
}

/** The face a cup die shows (its own face, or the one it copies), or null. */
export function shownFace(s: RoundState, c: CupDie): Face | null {
  if (c.copy) return c.copy;
  if (c.face === null) return null;
  return dieOf(s, c.dieId)?.faces[c.face] ?? null;
}

/** The tile kind a cup die offers right now, or null (unrolled, spent, blank). */
export function offered(s: RoundState, c: CupDie): TileKind | null {
  if (c.spent) return null;
  return shownFace(s, c)?.kind ?? null;
}

/** What a set of dice would take, or why not. */
export function takeCheck(
  s: RoundState,
  dieIds: readonly number[],
): { kind: SetKind; kinds: TileKind[]; upgrade: number | null } | { problem: string } {
  if (s.over) return { problem: 'The round is over.' };
  if (dieIds.length === 0) return { problem: 'Pick some dice.' };
  if (new Set(dieIds).size !== dieIds.length) return { problem: 'Pick each die once.' };
  const kinds: TileKind[] = [];
  for (const id of dieIds) {
    const c = s.cup.find((x) => x.dieId === id);
    const k = c ? offered(s, c) : null;
    if (!k) return { problem: 'Those dice show nothing you can take.' };
    kinds.push(k);
  }
  if (kinds.length === 1) {
    const i = s.rack.findIndex((r) => r.kind === 'pong' && r.tiles[0]?.kind === kinds[0]);
    if (i >= 0) return { kind: 'kong', kinds, upgrade: i };
    return { problem: 'One die only takes a tile to make a pong a kong.' };
  }
  const kind = classify(kinds);
  if (!kind) return { problem: 'That is not a set.' };
  const problem = rackProblem(s.rack, kind, baseKind(kinds));
  if (problem) return { problem };
  return { kind, kinds, upgrade: null };
}

type Draft = {
  -readonly [K in keyof RoundState]: RoundState[K];
};

function draftOf(s: RoundState): { d: Draft; rng: Rng; events: RoundEvent[] } {
  return { d: { ...s, cup: s.cup.slice(), dice: s.dice.slice() }, rng: new Rng(s.rng), events: [] };
}

function done(d: Draft, rng: Rng, events: RoundEvent[]): RoundResult {
  d.rng = rng.state;
  return { state: d, events };
}

function setCup(d: Draft, i: number, patch: Partial<CupDie>): void {
  const c = d.cup[i];
  if (c) d.cup = d.cup.map((x, j) => (j === i ? { ...c, ...patch } : x));
}

/**
 * A die has come to rest on `face`. A flower or season goes to the shelf and the die rolls again,
 * at most RULES.bonusRerolls times; it then stays spent on the last one.
 */
function settle(d: Draft, rng: Rng, i: number, face: number, events: RoundEvent[]): Landing {
  const c = d.cup[i] as CupDie;
  const die = dieOf(d, c.dieId) as Die;
  const bonus: TileKind[] = [];
  let f = face;
  let spent = false;
  for (;;) {
    const kind = die.faces[f]?.kind;
    if (!kind || !isBonus(kind)) break;
    bonus.push(kind);
    d.shelf = [...d.shelf, kind];
    const extra = sumEffect(d.charms, 'rollOnBonus');
    if (extra > 0) {
      d.rollsLeft += extra;
      events.push({ type: 'freeRoll', amount: extra, why: 'bonus' });
    }
    if (bonus.length > RULES.bonusRerolls) {
      spent = true;
      break;
    }
    f = rollFace(die, rng);
  }
  const { copy: _copy, ...rest } = c;
  d.cup = d.cup.map((x, j) => (j === i ? { ...rest, face: f, spent } : x));
  return { dieId: c.dieId, face: f, bonus, spent };
}

function cupIndex(s: RoundState, dieId: number): number {
  return s.cup.findIndex((c) => c.dieId === dieId);
}

/** Why an action is not allowed now, or null. */
export function actionProblem(s: RoundState, a: RoundAction): string | null {
  if (s.over) return 'The round is over.';
  switch (a.type) {
    case 'roll':
      if (s.rollsLeft <= 0) return 'No rolls left.';
      if (s.cup.every((c) => c.held && !c.spent)) return 'Every die is held.';
      return null;
    case 'hold': {
      const c = s.cup.find((x) => x.dieId === a.dieId);
      if (!c || c.face === null || c.spent) return 'Only a die showing a face can be held.';
      if (c.held) return null;
      if (c.frozen) return 'Frost: that die was held last roll.';
      const limit = s.twist?.holdLimit;
      if (limit !== undefined && s.cup.filter((x) => x.held).length >= limit)
        return `Gusts: you can hold only ${limit} dice.`;
      return null;
    }
    case 'take': {
      const r = takeCheck(s, a.dieIds);
      return 'problem' in r ? r.problem : null;
    }
    case 'return':
      if (s.returnsLeft <= 0) return 'No returns left.';
      return s.rack[a.index] ? null : 'Nothing there.';
    case 'tip':
    case 'flip':
    case 'fan':
    case 'mirror': {
      const need = { tip: 'thumb', flip: 'shell', fan: 'fan', mirror: 'mirror' } as const;
      if (!hasCharm(s.charms, need[a.type])) return 'You need the charm for that.';
      if (s.uses[need[a.type]]) return a.type === 'tip' ? 'Once per roll.' : 'Once per hand.';
      const c = s.cup.find((x) => x.dieId === a.dieId);
      if (!c || c.face === null || c.spent) return 'Pick a die showing a face.';
      const die = dieOf(s, a.dieId);
      if (!die) return 'No such die.';
      if (a.type === 'tip') {
        if (c.copy) return 'A mirrored die can’t be tipped.';
        return neighbours(die.shape, c.face).includes(a.face)
          ? null
          : 'Tip it onto a neighbouring face.';
      }
      if (a.type === 'flip' && c.copy) return 'A mirrored die can’t be turned over.';
      if (a.type === 'mirror') {
        if (a.fromDieId === a.dieId) return 'Pick another die to copy.';
        const from = s.cup.find((x) => x.dieId === a.fromDieId);
        if (!from || !offered(s, from)) return 'Copy a die that shows a tile.';
      }
      return null;
    }
    case 'end':
      return null;
  }
}

export function roundReducer(s: RoundState, a: RoundAction): RoundResult {
  const problem = actionProblem(s, a);
  if (problem) throw new Error(problem);
  const { d, rng, events } = draftOf(s);
  switch (a.type) {
    case 'roll': {
      const landings: Landing[] = [];
      const bead = hasCharm(d.charms, 'bead');
      const tied = hasCharm(d.charms, 'redString');
      const wasHeld = d.cup.map((c) => c.held && !c.spent);
      for (let i = 0; i < d.cup.length; i++) {
        const c = d.cup[i] as CupDie;
        if (c.held && !c.spent) continue;
        const die = dieOf(d, c.dieId) as Die;
        let face: number;
        if (i === 0 && bead && c.face !== null && !c.copy) {
          face = (c.face + 1) % die.faces.length;
        } else if (i === 1 && tied) {
          const first = d.cup[0] ? shownFace(d, d.cup[0]) : null;
          const suit = first?.kind ? suitOf(first.kind) : null;
          face = rollFace(die, rng, suit ? (f) => !!f.kind && suitOf(f.kind) === suit : undefined);
        } else {
          face = rollFace(die, rng);
        }
        landings.push(settle(d, rng, i, face, events));
      }
      if (d.twist?.frost) {
        d.cup = d.cup.map((c, i) => ({ ...c, held: false, frozen: !!wasHeld[i] }));
      }
      d.rollsLeft -= 1;
      d.rollsUsed += 1;
      d.uses = { ...d.uses, thumb: false };
      events.unshift({ type: 'roll', landings, rollsLeft: d.rollsLeft });
      return done(d, rng, events);
    }
    case 'hold': {
      const i = cupIndex(d, a.dieId);
      const held = !(d.cup[i] as CupDie).held;
      setCup(d, i, { held });
      events.push({ type: 'hold', dieId: a.dieId, held });
      return done(d, rng, events);
    }
    case 'take': {
      const r = takeCheck(d, a.dieIds) as {
        kind: SetKind;
        kinds: TileKind[];
        upgrade: number | null;
      };
      const tiles: RackTile[] = a.dieIds.map((id) => {
        const c = d.cup[cupIndex(d, id)] as CupDie;
        const f = shownFace(d, c) as Face;
        return {
          kind: f.kind as TileKind,
          ...(f.enh && !c.copy ? { enh: f.enh } : {}),
          dieId: id,
          face: c.face ?? 0,
        };
      });
      for (const id of a.dieIds) setCup(d, cupIndex(d, id), { spent: true, held: false });
      let set: RackSet;
      if (r.upgrade !== null) {
        const old = d.rack[r.upgrade] as RackSet;
        set = { kind: 'kong', tiles: [...old.tiles, ...tiles] };
        d.rack = d.rack.map((x, j) => (j === r.upgrade ? set : x));
      } else {
        set = { kind: r.kind, tiles };
        d.rack = [...d.rack, set];
      }
      events.push({ type: 'take', set, upgrade: r.upgrade });
      if (set.kind === 'kong') {
        d.rollsLeft += RULES.kongRolls;
        events.push({ type: 'freeRoll', amount: RULES.kongRolls, why: 'kong' });
      }
      if (isComplete(d.rack)) finishHand(d, rng, events);
      return done(d, rng, events);
    }
    case 'return': {
      const set = d.rack[a.index] as RackSet;
      d.rack = d.rack.filter((_, j) => j !== a.index);
      d.returnsLeft -= 1;
      events.push({ type: 'return', set });
      return done(d, rng, events);
    }
    case 'tip':
    case 'flip':
    case 'fan':
    case 'mirror': {
      const i = cupIndex(d, a.dieId);
      const c = d.cup[i] as CupDie;
      const die = dieOf(d, c.dieId) as Die;
      if (a.type === 'mirror') {
        const from = d.cup[cupIndex(d, a.fromDieId)] as CupDie;
        const f = shownFace(d, from) as Face;
        setCup(d, i, { copy: { kind: f.kind } });
        d.uses = { ...d.uses, mirror: true };
        events.push({
          type: 'move',
          how: 'mirror',
          landing: { dieId: a.dieId, face: c.face ?? 0, bonus: [], spent: false },
        });
        return done(d, rng, events);
      }
      const face =
        a.type === 'tip'
          ? a.face
          : a.type === 'flip'
            ? opposite(die.shape, c.face as number)
            : rollFace(die, rng);
      const use = a.type === 'tip' ? 'thumb' : a.type === 'flip' ? 'shell' : 'fan';
      d.uses = { ...d.uses, [use]: true };
      const landing = settle(d, rng, i, face, events);
      events.push({ type: 'move', how: a.type, landing });
      return done(d, rng, events);
    }
    case 'end': {
      d.over = true;
      events.push({ type: 'end', won: d.score >= d.target, score: d.score });
      return done(d, rng, events);
    }
  }
}

/** The rack is a finished hand: score it, then clear the rack for the next one. */
function finishHand(d: Draft, rng: Rng, events: RoundEvent[]): void {
  const score = scoreHand(d.rack, d.shelf, { wind: d.wind, charms: d.charms, levels: d.levels });
  d.score += score.total;
  d.money += score.money;
  d.hands = [...d.hands, { total: score.total, patterns: score.patterns }];
  events.push({ type: 'mahjong', rack: d.rack, shelf: d.shelf, score, roundScore: d.score });
  // porcelain may crack
  for (const t of d.rack.flatMap((s) => s.tiles)) {
    if (t.enh !== 'porcelain') continue;
    if (rng.next() < 0.25) {
      const die = dieOf(d, t.dieId);
      if (!die) continue;
      d.dice = d.dice.map((x) => (x.id === die.id ? withFace(x, t.face, { kind: null }) : x));
      d.cracked = [...d.cracked, { dieId: t.dieId, face: t.face }];
      events.push({ type: 'crack', dieId: t.dieId, face: t.face });
    }
  }
  // West: falling leaves
  for (let n = 0; n < (d.twist?.blankPerHand ?? 0); n++) {
    const options = d.dice.flatMap((die) =>
      die.faces.flatMap((f, i) => (f.kind ? [{ dieId: die.id, face: i }] : [])),
    );
    if (options.length === 0) break;
    const pick = rng.pick(options);
    d.dice = d.dice.map((x) => (x.id === pick.dieId ? withFace(x, pick.face, { kind: null }) : x));
    events.push({ type: 'blank', dieId: pick.dieId, face: pick.face });
  }
  const back = d.twist?.rollsPerHand ?? 0;
  if (back > 0) {
    d.rollsLeft += back;
    events.push({ type: 'freeRoll', amount: back, why: 'hand' });
  }
  d.rack = [];
  d.shelf = [];
  d.uses = { thumb: d.uses.thumb, mirror: false, shell: false, fan: false };
}

/** Is there anything left to do but end? */
export function canAct(s: RoundState): boolean {
  if (s.over) return false;
  if (s.rollsLeft > 0) return true;
  return false;
}
