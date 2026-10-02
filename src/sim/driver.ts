import { PACK_IDS } from '@/content/packs';
import { type Policy, chooseMove, moveAction } from '@/engine/ai';
import { Rng, deriveSeed } from '@/engine/rng';
import { newRun, runReduce } from '@/engine/run';
import type { RunState } from '@/engine/runTypes';
import { DEFAULT_SHOPPER, giftCasual, giftSmart, shopCasual, shopSmart } from '@/engine/shoppers';

export interface SimRunOptions {
  readonly seed: number;
  readonly shopper: 'smart' | 'casual';
  /** Base targets; omit for a run nobody can lose (the score tables). */
  readonly targets?: readonly number[];
  readonly gift: boolean;
  readonly fire: number;
  readonly lantern?: number;
  readonly tileSet?: string;
  /** Reproduce the Python prototype's shop: no almanac pack. */
  readonly pythonShop?: boolean;
  /** Rounds per shop evaluation. */
  readonly evalSeeds?: number;
}

export interface SimRunResult {
  readonly scores: readonly number[];
  readonly won: boolean;
  readonly lostAt: number | null;
  readonly bought: readonly string[];
  readonly curios: readonly string[];
  readonly policy: Policy;
  readonly tiles: number;
}

/** Plays the current round to its end with the bot. */
export function driveRound(start: RunState, policy: Policy): RunState {
  let run = start;
  for (let guard = 0; guard < 500 && run.phase === 'round' && run.round; guard++) {
    run = runReduce(run, { type: 'auto', policy }).state;
    if (run.phase !== 'round' || !run.round) break;
    const m = chooseMove(run.round, policy);
    if (!m) break;
    const next = runReduce(run, { type: 'round', action: moveAction(m) }).state;
    if (next === run) break;
    run = next;
  }
  return run;
}

/** One whole run, headless: four rounds, three teahouses. */
export function playRunSim(o: SimRunOptions): SimRunResult {
  const seed = 10_000 + o.seed;
  const rng = new Rng(deriveSeed(seed, 'sim'));
  let run = newRun({
    seed,
    ...(o.targets ? { targets: o.targets } : { targets: [0, 0, 0, 0] }),
    ...(o.lantern ? { lantern: o.lantern } : {}),
    ...(o.tileSet ? { tileSet: o.tileSet } : {}),
    ...(o.pythonShop ? { packPool: PACK_IDS.filter((p) => p !== 'almanac') } : {}),
  });
  let policy: Policy = 'greedy';
  const scores: number[] = [];
  const bought: string[] = [];
  let lostAt: number | null = null;
  const shopperOpts = { ...DEFAULT_SHOPPER, fire: o.fire, evalSeeds: o.evalSeeds ?? 12 };
  for (let r = 0; r < 4; r++) {
    run = runReduce(run, { type: 'chooseHost', beast: false }).state;
    run = driveRound(run, policy);
    scores.push(run.scores[run.scores.length - 1] ?? 0);
    if (run.phase === 'over') {
      lostAt = r;
      break;
    }
    if (run.phase === 'won') break;
    run = runReduce(run, { type: 'continue' }).state;
    const seeds = Array.from(
      { length: shopperOpts.evalSeeds },
      (_, i) => (o.seed * 7919 + r * 131 + i) >>> 0,
    );
    if (run.phase === 'gift') {
      if (!o.gift) run = runReduce(run, { type: 'gift', pick: null }).state;
      else if (o.shopper === 'smart') run = giftSmart(run, seeds, policy);
      else run = giftCasual(run, rng);
    }
    if (o.shopper === 'smart') {
      const res = shopSmart(run, seeds, policy, shopperOpts);
      run = res.run;
      policy = res.policy;
      bought.push(...res.bought);
    } else {
      const res = shopCasual(run, rng, shopperOpts);
      run = res.run;
      policy = 'greedy';
      bought.push(...res.bought);
    }
    run = runReduce(run, { type: 'leave' }).state;
  }
  return {
    scores,
    won: lostAt === null,
    lostAt,
    bought,
    curios: run.curios,
    policy,
    tiles: run.tiles.length,
  };
}
