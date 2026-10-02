import type { EnhancementId } from '@/content/enhancements';
import type { Twist } from '@/content/hosts';
import { Rng } from './rng';
import { type TwistState, initTwist, twistRules } from './twists';
import { BASE_ROUND_RULES, type RoundRules, type RoundState } from './round';
import type { Tile } from './tiles';
import { countKinds } from './tiles';

let nextId = 1000;

/** Tiles from a string like "p1 p2 p3 jade:s5": a kind, optionally with an enhancement before it. */
export function tiles(spec: string): Tile[] {
  return spec
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const [a, b] = tok.split(':');
      const kind = (b ?? a) as string;
      const enh = b ? (a as EnhancementId) : undefined;
      return { id: nextId++, kind, ...(enh ? { enh } : {}) };
    });
}

export interface RoundSpec {
  readonly hand?: string;
  /** Each stack bottom to top, as a spec string. */
  readonly stacks?: readonly string[];
  readonly rules?: Partial<RoundRules>;
  readonly dragons?: readonly string[];
  readonly copies?: Record<string, number>;
  readonly rng?: number;
  readonly target?: number;
  /** A host's twist; `twistState` overrides parts of the state it starts with. */
  readonly twist?: Twist;
  readonly twistState?: Partial<TwistState>;
  /**
   * A brick wall, slot by slot from the top row (`_` for a taken place); sets draw 'wall' with
   * `wallRows` and `wallWidth` from the rules (default 2 rows, width 3: slots 0-1 rest on 2-4).
   */
  readonly wall?: string;
}

/** A round in a known state, for tests. */
export function roundWith(spec: RoundSpec = {}): RoundState {
  const wallRules = spec.wall ? { draw: 'wall' as const, wallRows: 2, wallWidth: 3 } : {};
  const rules = twistRules(
    { ...BASE_ROUND_RULES, ...wallRules, ...spec.rules },
    spec.twist ?? null,
  );
  const stacks = (spec.stacks ?? []).map((s) => tiles(s));
  const hand = tiles(spec.hand ?? '');
  const wall = spec.wall
    ? spec.wall
        .trim()
        .split(/\s+/)
        .map((k) => (k === '_' ? null : (tiles(k)[0] as Tile)))
    : null;
  const all = [...hand, ...stacks.flat(), ...(wall ?? []).filter((t): t is Tile => t !== null)];
  const twist = spec.twist
    ? { ...initTwist(spec.twist, stacks, new Rng(spec.rng ?? 1)), ...spec.twistState }
    : null;
  return {
    rules,
    stacks,
    wall,
    hand,
    table: [],
    discarded: [],
    playsLeft: rules.plays,
    discardsLeft: rules.discards,
    dragons: spec.dragons ?? [],
    levels: {},
    target: spec.target ?? 0,
    twist,
    copies: spec.copies ?? Object.fromEntries(countKinds(all)),
    rng: spec.rng ?? 1,
    phase: 'play',
    turns: 0,
  };
}
