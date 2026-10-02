import type { EnhancementId } from '@/content/enhancements';
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
  readonly curios?: readonly string[];
  readonly copies?: Record<string, number>;
  readonly rng?: number;
}

/** A round in a known state, for tests. */
export function roundWith(spec: RoundSpec = {}): RoundState {
  const rules = { ...BASE_ROUND_RULES, ...spec.rules };
  const stacks = (spec.stacks ?? []).map((s) => tiles(s));
  const hand = tiles(spec.hand ?? '');
  const all = [...hand, ...stacks.flat()];
  return {
    rules,
    stacks,
    hand,
    table: [],
    discarded: [],
    playsLeft: rules.plays,
    discardsLeft: rules.discards,
    curios: spec.curios ?? [],
    levels: {},
    copies: spec.copies ?? Object.fromEntries(countKinds(all)),
    rng: spec.rng ?? 1,
    phase: 'play',
    turns: 0,
  };
}
