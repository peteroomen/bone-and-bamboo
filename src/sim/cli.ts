import { parseArgs } from 'node:util';
import { RULES } from '@/content/rules';
import { playRun, type RunSummary } from './runSim';
import type { Shopper } from './shopper';

const HELP = `pnpm sim [options]

Plays whole runs with the guide's advice in rounds and a shopper between them.

  --runs N        runs per shopper (default 200)
  --seed N        first seed (default 0)
  --shopper S     smart, casual or none; repeat or comma-separate (default smart,casual)
  --kit K         starting kit (src/content/dice.ts)
  --targets a,b   override the round targets
  --no-bank       keep rolling after the target is beaten
  --help`;

const { values } = parseArgs({
  options: {
    runs: { type: 'string', default: '200' },
    seed: { type: 'string', default: '0' },
    shopper: { type: 'string', default: 'smart,casual' },
    kit: { type: 'string' },
    targets: { type: 'string' },
    'no-bank': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

const runs = Number(values.runs);
const seed0 = Number(values.seed);
const targets = values.targets ? values.targets.split(',').map(Number) : RULES.targets;
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const median = (xs: number[]) => {
  const a = xs.slice().sort((x, y) => x - y);
  return a.length ? (a[a.length >> 1] as number) : 0;
};

console.log(`targets ${targets.join(' / ')}, rolls ${RULES.rolls}, cup ${RULES.cup}`);
for (const shopper of values.shopper.split(',') as Shopper[]) {
  const t0 = Date.now();
  const out: RunSummary[] = [];
  for (let i = 0; i < runs; i++)
    out.push(
      playRun(seed0 + i, {
        shopper,
        targets,
        bank: !values['no-bank'],
        ...(values.kit ? { kit: values.kit } : {}),
      }),
    );
  const won = out.filter((r) => r.won).length;
  console.log(
    `\n== ${shopper}: ${pct(won / runs)} won (${won}/${runs}), ${((Date.now() - t0) / runs).toFixed(0)} ms/run`,
  );
  const line: string[] = [];
  for (let r = 0; r < targets.length; r++) {
    const alive = out.filter((x) => x.scores.length > r);
    const beat = alive.filter((x) => (x.scores[r] ?? 0) >= (targets[r] ?? 0));
    line.push(
      `R${r + 1} ${pct(beat.length / Math.max(1, alive.length))} med ${median(alive.map((x) => x.scores[r] ?? 0))} hands ${(alive.reduce((a, x) => a + (x.hands[r] ?? 0), 0) / Math.max(1, alive.length)).toFixed(1)}`,
    );
  }
  console.log(line.join('\n'));
  const pats = new Map<string, number>();
  for (const r of out) for (const p of r.patterns) pats.set(p, (pats.get(p) ?? 0) + 1);
  const totalHands = out.reduce((a, r) => a + r.hands.reduce((x, y) => x + y, 0), 0);
  console.log(
    'patterns per hand:',
    [...pats.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${pct(v / Math.max(1, totalHands))}`)
      .join(', '),
  );
  const charms = new Map<string, number>();
  for (const r of out) for (const c of r.charms) charms.set(c, (charms.get(c) ?? 0) + 1);
  console.log(
    'charms held at the end:',
    [...charms.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, v]) => `${k} ${v}`)
      .join(', '),
  );
}
