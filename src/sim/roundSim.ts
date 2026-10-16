import { RULES } from '@/content/rules';
import { STARTING_KITS } from '@/content/dice';
import type { PatternId } from '@/content/patterns';
import { advise } from '@/engine/advice';
import { type Die, fixedDie } from '@/engine/dice';
import { deriveSeed, hashSeed } from '@/engine/rng';
import { type RoundState, createRound, roundReducer } from '@/engine/round';

export interface RoundRun {
  readonly score: number;
  readonly hands: number;
  readonly rollsUsed: number;
  readonly patterns: PatternId[];
  readonly handScores: number[];
  readonly firstHandRolls: number;
  readonly steps: number;
}

export function kitDice(kit: string): Die[] {
  const defs = STARTING_KITS[kit];
  if (!defs) throw new Error(`unknown kit ${kit}`);
  return defs.map((d, i) => fixedDie(i + 1, d));
}

/** Play one round with the guide's advice until the rolls run out (no banking). */
export function playRound(
  dice: readonly Die[],
  seed: number,
  opts: {
    charms?: string[];
    target?: PatternId;
    rolls?: number;
    bank?: boolean;
    goal?: number;
  } = {},
): RoundRun {
  let s: RoundState = createRound({
    index: 0,
    wind: 1,
    host: false,
    twist: opts.rolls
      ? { id: 'sim', name: 'sim', text: '', rolls: opts.rolls - RULES.rolls }
      : null,
    target: opts.goal ?? 1e12,
    seed: deriveSeed(hashSeed('round'), seed),
    dice,
    charms: opts.charms ?? [],
    levels: {},
  });
  const patterns: PatternId[] = [];
  const handScores: number[] = [];
  let firstHandRolls = 0;
  let steps = 0;
  while (!s.over && steps < 2000) {
    const adv = advise(s, {
      ...(opts.target ? { target: opts.target } : {}),
      bank: opts.bank ?? false,
    });
    const r = roundReducer(s, adv.action);
    for (const e of r.events) {
      if (e.type === 'mahjong') {
        patterns.push(...e.score.patterns);
        handScores.push(e.score.total);
        if (handScores.length === 1) firstHandRolls = r.state.rollsUsed;
      }
    }
    s = r.state;
    steps++;
  }
  return {
    score: s.score,
    hands: s.hands.length,
    rollsUsed: s.rollsUsed,
    patterns,
    handScores,
    firstHandRolls,
    steps,
  };
}
