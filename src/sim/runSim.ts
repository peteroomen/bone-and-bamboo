import type { PatternId } from '@/content/patterns';
import { advise } from '@/engine/advice';
import { Rng, hashSeed } from '@/engine/rng';
import { type RunAction, type RunState, newRun, runReducer } from '@/engine/run';
import { type Shopper, shopStep } from './shopper';

export interface RunSummary {
  readonly seed: number;
  readonly won: boolean;
  /** Rounds won. */
  readonly reached: number;
  readonly scores: readonly number[];
  readonly hands: readonly number[];
  readonly patterns: readonly PatternId[];
  readonly money: number;
  readonly charms: readonly string[];
  readonly dice: readonly string[];
  readonly steps: number;
}

export interface SimOptions {
  readonly shopper: Shopper;
  readonly kit?: string;
  readonly targets?: readonly number[];
  /** Bank as soon as the target is beaten (default true). */
  readonly bank?: boolean;
}

/** Play a whole run with the guide's advice in rounds and a shopper between them. */
export function playRun(seed: number, opts: SimOptions): RunSummary {
  let run: RunState = newRun({
    seed,
    ...(opts.kit ? { kit: opts.kit } : {}),
    ...(opts.targets ? { targets: opts.targets } : {}),
  });
  const rng = new Rng(hashSeed(`shopper:${seed}`));
  let steps = 0;
  while (run.phase !== 'over' && run.phase !== 'won' && steps < 20000) {
    let a: RunAction;
    if (run.phase === 'round' && run.current) {
      a = { type: 'round', action: advise(run.current, { bank: opts.bank ?? true }).action };
    } else if (run.phase === 'cashout') {
      a = { type: 'collect' };
    } else {
      a = shopStep(run, opts.shopper, rng);
    }
    run = runReducer(run, a).state;
    steps++;
  }
  return {
    seed,
    won: run.phase === 'won',
    reached: run.history.filter((h) => h.score >= h.target).length,
    scores: run.history.map((h) => h.score),
    hands: run.history.map((h) => h.hands),
    patterns: run.history.flatMap((h) => h.patterns),
    money: run.money,
    charms: run.charms,
    dice: run.dice.map((d) => d.name),
    steps,
  };
}
