/** Reproducible experiments on MVP 909dab5. No production rules are changed. */
import assert from 'node:assert/strict';
import { CURIOS } from '@/content/curios';
import { autoRefill, chooseMove, moveAction, playOut, type Policy } from '@/engine/ai';
import { newRun, dealRound, roundSetup } from '@/engine/run';
import { roundReduce, scoreContext, startRound, type RoundState } from '@/engine/round';
import { scoreTable } from '@/engine/scoring';
import { findSets } from '@/engine/sets';
import type { RunState } from '@/engine/runTypes';
import { estimate } from '@/engine/shoppers';

const n = Number(process.argv[2] ?? 1000);
assert(Number.isInteger(n) && n > 0);
const base = newRun({ seed: 1 });
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pc = (x: number) => Math.round(x * 1000) / 10;
const seedFor = (i: number) => 900_000 + i;

interface Scenario {
  name: string;
  run: RunState;
  rules?: Partial<RoundState['rules']>;
}
function initial(s: Scenario, seed: number) {
  const setup = roundSetup(s.run, seed);
  return startRound({ ...setup, rules: { ...setup.rules, ...s.rules } });
}
function batch(s: Scenario, policy: Policy) {
  const rows = Array.from({ length: n }, (_, i) => playOut(initial(s, seedFor(i)), policy));
  assert(
    rows.every((r) => r.phase === 'done' && r.result),
    'Every modelled round must finish',
  );
  const scores = rows.map((r) => r.result!.score.total);
  const id = s.run.curios[0];
  return {
    name: s.name,
    policy,
    median: median(scores),
    mean: Math.round(mean(scores)),
    activationPct:
      id && CURIOS[id]?.effects.some((e) => !['mod', 'income'].includes(e.type))
        ? pc(
            rows.filter((r) =>
              r.result!.score.steps.some((st) => st.type === 'curio' && st.id === id),
            ).length / n,
          )
        : null,
    meanPongs: mean(rows.map((r) => r.table.filter((x) => x.kind === 'pong').length)),
    kongRoundPct: pc(rows.filter((r) => r.table.some((x) => x.kind === 'kong')).length / n),
    meanDiscards: mean(rows.map((r) => r.rules.discards - r.discardsLeft)),
    scores,
  };
}

const scenarios: Scenario[] = [
  { name: 'base', run: base },
  ...Object.keys(CURIOS).map((id) => ({ name: id, run: { ...base, curios: [id] } })),
  { name: 'chowLevel1', run: { ...base, levels: { chow: 1 } } },
  { name: 'pongLevel1', run: { ...base, levels: { pong: 1 } } },
  { name: 'pairLevel1', run: { ...base, levels: { pair: 1 } } },
  { name: 'noPeek', run: base, rules: { peek: 0 } },
  { name: 'noDiscards', run: base, rules: { discards: 0 } },
  { name: 'sixPlays', run: base, rules: { plays: 6 } },
  { name: 'oneFourth', run: { ...base, tiles: [...base.tiles, { id: 82, kind: 'm5' }] } },
  {
    name: 'kongBellOneFourth',
    run: { ...base, curios: ['kongBell'], tiles: [...base.tiles, { id: 82, kind: 'm5' }] },
  },
  {
    name: 'kongBellThreeFourths',
    run: {
      ...base,
      curios: ['kongBell'],
      tiles: [...base.tiles, ...[4, 5, 6].map((x, i) => ({ id: 82 + i, kind: `m${x}` }))],
    },
  },
  {
    name: 'allSimplesTrimmed',
    run: {
      ...base,
      curios: ['allSimples'],
      tiles: base.tiles.filter((t) => !/[19]$/.test(t.kind)),
    },
  },
];
assert.equal(
  initial(
    scenarios.find((s) => s.name === 'sixPlays')!,
    1,
  ).playsLeft,
  6,
);
assert.equal(
  initial(
    scenarios.find((s) => s.name === 'noDiscards')!,
    1,
  ).discardsLeft,
  0,
);
const baseline: Record<string, number[]> = {};
const output = [];
for (const policy of ['greedy', 'pongs'] as const) {
  for (const s of scenarios) {
    const { scores, ...summary } = batch(s, policy);
    if (s.name === 'base') baseline[policy] = scores;
    const bs = baseline[policy]!;
    output.push({
      ...summary,
      medianPairedGainPct: pc(median(scores.map((x, i) => x / bs[i]! - 1))),
      improvedPct: pc(scores.filter((x, i) => x > bs[i]!).length / n),
    });
  }
}

// Instrument legal play decisions. Exact last-play comparison uses only the visible hand/table.
// No future wall tiles are inspected to choose a move.
const decisions = [];
for (const id of ['', 'allSimples', 'pureStraight', 'sparrowNest', 'mahjong', 'pongHall']) {
  let worseLast = 0,
    drops = 0,
    roundsWithDrops = 0,
    playCount = 0;
  const losses: number[] = [],
    crossing: number[] = [];
  let example: object | null = null;
  for (let i = 0; i < n; i++) {
    let r = dealRound({ ...base, curios: id ? [id] : [] }, seedFor(i));
    let firstCross = 0,
      dropped = false;
    for (let guard = 0; guard < 200 && r.phase === 'play'; guard++) {
      r = autoRefill(r).state;
      const move = chooseMove(r);
      assert(move, 'bot must return a move');
      const before = scoreTable(r.table, scoreContext(r)).total;
      if (move.type === 'play') {
        playCount++;
        if (r.playsLeft === 1) {
          const chosen = roundReduce(r, moveAction(move)).state.result!.score.total;
          const candidates = findSets(r.hand).map(
            (c) =>
              roundReduce(r, { type: 'play', ids: c.tiles.map((t) => t.id) }).state.result!.score
                .total,
          );
          const best = Math.max(chosen, ...candidates);
          if (best > chosen) {
            worseLast++;
            losses.push(best - chosen);
            if (!example) {
              const better = findSets(r.hand).find(
                (c) =>
                  roundReduce(r, { type: 'play', ids: c.tiles.map((t) => t.id) }).state.result!
                    .score.total === best,
              )!;
              example = {
                seed: seedFor(i),
                chosenKind: move.kind,
                chosenTiles: r.hand.filter((t) => move.ids.includes(t.id)).map((t) => t.kind),
                chosen,
                betterKind: better.kind,
                betterTiles: better.tiles.map((t) => t.kind),
                best,
              };
            }
          }
        }
      }
      const next = roundReduce(r, moveAction(move));
      assert(!next.events.some((e) => e.type === 'illegal'), 'all audit moves must be legal');
      r = next.state;
      const after = scoreTable(r.table, scoreContext(r)).total;
      if (move.type === 'play' && after < before) {
        drops++;
        dropped = true;
      }
      if (!firstCross && after >= 1000) firstCross = r.table.length;
    }
    assert.equal(r.phase, 'done');
    if (dropped) roundsWithDrops++;
    crossing.push(firstCross || 9);
  }
  decisions.push({
    dragon: id || 'base',
    example,
    worseLastPct: pc(worseLast / n),
    medianAvoidableLastLoss: median(losses),
    drops,
    playCount,
    roundsWithDropsPct: pc(roundsWithDrops / n),
    meanPlaysRemainingAtFirst1000: mean(crossing.filter((x) => x <= 8).map((x) => 8 - x)),
    hit1000ByPlay: [4, 5, 6, 7, 8].map((p) => ({
      play: p,
      pct: pc(crossing.filter((x) => x <= p).length / n),
    })),
  });
}

const proposedPongRares = ['greedy', 'pongs'].map((policy) => {
  const original: number[] = [],
    treasures: number[] = [],
    lion: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = playOut(dealRound(base, seedFor(i)), policy as Policy);
    const sc = r.result!.score;
    const pongs = r.table.filter((s) => s.kind === 'pong').length;
    const bigTiles = r.table
      .filter((s) => s.kind === 'pong' || s.kind === 'kong')
      .reduce((v, s) => v + s.tiles.length, 0);
    original.push(sc.total);
    treasures.push(Math.floor(sc.chips * sc.mult * sc.x * 1.5 ** pongs));
    lion.push(Math.floor(sc.chips * (sc.mult + 3 * bigTiles) * sc.x));
  }
  return {
    policy,
    method: 'Rescore unchanged tables; does not predict play adaptation',
    baseMedian: median(original),
    threeTreasuresMedian: median(treasures),
    stoneLionMedian: median(lion),
  };
});

// Concrete oracle checks for findings that simulations alone can obscure.
const evalSeeds = Array.from({ length: 12 }, (_, i) => i);
const incomeBlindness =
  estimate(base, evalSeeds, 'greedy') ===
  estimate({ ...base, curios: ['goldToad'] }, evalSeeds, 'greedy');
assert(incomeBlindness, 'Scoring-only shopper currently ignores income');
const exampleTable = playOut(dealRound(base, seedFor(0))).table;
const forward = scoreTable(exampleTable, { levels: {}, curios: ['redString', 'mahjong'] }).total;
const reverse = scoreTable(exampleTable, { levels: {}, curios: ['mahjong', 'redString'] }).total;
assert.equal(forward, reverse, 'Multiplier product currently makes row order irrelevant');
console.log(
  JSON.stringify(
    {
      source: 'MVP 909dab5',
      n,
      seedStart: seedFor(0),
      limitations: [
        'No host twists',
        'Single-item experiments use an unlevelled starting deck',
        'Deck edits change shuffle mapping',
        'Two heuristic policies; not human win forecasts',
        'Income excluded from one-round score',
      ],
      output,
      decisions,
      proposedPongRares,
      checks: { incomeBlindness, rowOrderIrrelevant: forward === reverse },
    },
    null,
    2,
  ),
);
