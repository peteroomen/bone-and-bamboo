import type { DrawMode } from '@/content/rules';
import type { Twist } from '@/content/hosts';
import { PACK_IDS } from '@/content/packs';
import { legalPlays } from '@/engine/advice';
import { type Policy, chooseMove, moveAction } from '@/engine/ai';
import {
  finishProblem,
  needsRefill,
  previewUpgrade,
  scoreContext,
  upgrades,
  usableDiscards,
} from '@/engine/round';
import { scoreTable } from '@/engine/scoring';
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
  readonly draw?: DrawMode;
  /** Reproduce the Python prototype's shop: no almanac pack. */
  readonly pythonShop?: boolean;
  /** Which rounds the bot calls the storm (the great beast's harder twist); calm otherwise. */
  readonly storm?: readonly boolean[];
  readonly twists?: Readonly<Record<string, Twist>>;
  readonly stormMult?: number;
  /** How the bot plays its rounds. */
  readonly play?: PlayOptions;
  /** Rounds per shop evaluation. */
  readonly evalSeeds?: number;
}

export interface SimRunResult {
  readonly scores: readonly number[];
  readonly won: boolean;
  readonly lostAt: number | null;
  readonly bought: readonly string[];
  readonly dragons: readonly string[];
  readonly policy: Policy;
  /** Each round's score and target, for the per-host tables. */
  readonly rounds: readonly { score: number; target: number }[];
  readonly tiles: number;
  /** Money left at the end of the run. */
  readonly money: number;
  /** Rounds that ended early because the table was banked. */
  readonly banked: number;
  /** Kongs on the table at the end of each round, summed. */
  readonly kongs: number;
}

/** How the bot plays the round beyond choosing sets (the experiments in docs/balance). */
export interface PlayOptions {
  /** Bank the table as soon as it beats the target. */
  readonly bank?: boolean;
  /** Upgrade a tabled pong to a kong when its fourth tile is in hand and it gains. */
  readonly upgrade?: boolean;
}

/** Plays the current round to its end with the bot. */
export function driveRound(start: RunState, policy: Policy, opts: PlayOptions = {}): RunState {
  let run = start;
  for (let guard = 0; guard < 500 && run.phase === 'round' && run.round; guard++) {
    if (opts.bank && finishProblem(run.round) === null) {
      return runReduce(run, { type: 'round', action: { type: 'finish' } }).state;
    }
    if (needsRefill(run.round)) run = runReduce(run, { type: 'auto', policy }).state;
    if (run.phase !== 'round' || !run.round) break;
    if (opts.upgrade) {
      const up = bestUpgrade(run.round);
      if (up) {
        run = runReduce(run, { type: 'round', action: { type: 'upgrade', ...up } }).state;
        continue;
      }
    }
    const m = chooseMove(run.round, policy);
    if (!m) break;
    const next = runReduce(run, { type: 'round', action: moveAction(m) }).state;
    if (next === run) break;
    run = next;
  }
  return run;
}

/** An upgrade the bot likes: it gains at least as much as the best new set would. */
function bestUpgrade(
  round: NonNullable<RunState['round']>,
): { setIndex: number; tileId: number } | null {
  const ctx = scoreContext(round);
  const now = scoreTable(round.table, ctx).total;
  let best: { setIndex: number; tileId: number; total: number } | null = null;
  for (const u of upgrades(round)) {
    const pv = previewUpgrade(round, u.setIndex, u.tileId);
    if (pv && pv.after.total > now && (!best || pv.after.total > best.total))
      best = { ...u, total: pv.after.total };
  }
  if (!best) return null;
  let play = 0;
  for (const p of legalPlays(round.hand, usableDiscards(round)))
    play = Math.max(
      play,
      scoreTable([...round.table, { kind: p.kind, tiles: p.tiles }], ctx).total,
    );
  return best.total >= play ? { setIndex: best.setIndex, tileId: best.tileId } : null;
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
    ...(o.draw ? { draw: o.draw } : {}),
    ...(o.twists ? { twistOverrides: o.twists } : {}),
    ...(o.stormMult ? { stormMult: o.stormMult } : {}),
    ...(o.pythonShop ? { packPool: PACK_IDS.filter((p) => p !== 'almanac') } : {}),
  });
  let policy: Policy = 'greedy';
  const scores: number[] = [];
  const bought: string[] = [];
  let lostAt: number | null = null;
  const rounds: { score: number; target: number }[] = [];
  let banked = 0;
  let kongs = 0;
  const shopperOpts = { ...DEFAULT_SHOPPER, fire: o.fire, evalSeeds: o.evalSeeds ?? 12 };
  for (let r = 0; r < 4; r++) {
    run = runReduce(run, { type: 'chooseHost', storm: o.storm?.[r] ?? false }).state;
    run = driveRound(run, policy, o.play ?? {});
    scores.push(run.scores[run.scores.length - 1] ?? 0);
    rounds.push({ score: run.scores[run.scores.length - 1] ?? 0, target: run.target });
    if (
      run.round &&
      run.round.playsLeft > 0 &&
      run.round.hand.length + run.round.stacks.flat().length > 0
    )
      banked++;
    kongs += run.round?.table.filter((t) => t.kind === 'kong').length ?? 0;
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
    dragons: run.dragons,
    policy,
    rounds,
    tiles: run.tiles.length,
    money: run.money,
    banked,
    kongs,
  };
}
