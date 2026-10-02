import { cpus } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DRAGON_IDS } from '@/content/dragons';
import { HOSTS } from '@/content/hosts';
import { SET_ORDER } from '@/content/sets';
import { chooseMove, moveAction, type Policy } from '@/engine/ai';
import { newRun, runReduce } from '@/engine/run';
import { type SimRunOptions, type SimRunResult, driveRound, playRunSim } from './driver';

const HELP = `pnpm sim: the headless simulator (reproduces tools/sim-py).

  pnpm sim round [--n 2000] [--policy greedy|pongs]
      The base round: 81 tiles, hand 8, 8 stacks, see 1 under, 8 plays, 3 discards, no dragons.
  pnpm sim free  [--runs 200] [--shopper smart|casual]
      Score distributions per round (nobody can lose).
  pnpm sim run   [--runs 400] [--shopper smart|casual] [--targets 1000,4000,9000,18000]
                 [--no-gift] [--fire 6] [--python-shop] [--bank] [--upgrade] [--lantern 1] [--tileset boneBamboo]
      Win rates against the targets. --python-shop leaves the almanac pack out, as the Python
      prototype's teahouse did (the parity check).
  pnpm sim hosts [--runs 400]
      Each host's round against the same builds under the calm wind: win rate of that round and
      median score against target.
  pnpm sim policies [--runs 400]
      Compares the round policies (never bank / bank when the target is beaten, with and
      without pong upgrades) on the same seeds.
  pnpm sim trace [seed] [--shopper smart|casual]
      One run, round by round.

Common: --seed N (first seed, default 0), --jobs N (worker threads, default 4).`;

function flag(args: string[], name: string, def?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  return args[i + 1] ?? def;
}
const has = (args: string[], name: string) => args.includes(`--${name}`);

function pct(xs: number[], q: number): number {
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] as number;
}
const median = (xs: number[]) => pct(xs, 0.5);
const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** Run a batch of simulated runs, across worker threads when there are several. */
async function runMany(
  opts: Omit<SimRunOptions, 'seed'>,
  from: number,
  runs: number,
  jobs: number,
) {
  if (jobs <= 1 || runs < 8) {
    return Array.from({ length: runs }, (_, i) => playRunSim({ ...opts, seed: from + i }));
  }
  const parts: Promise<SimRunResult[]>[] = [];
  for (let j = 0; j < jobs; j++) {
    const seeds: number[] = [];
    for (let s = j; s < runs; s += jobs) seeds.push(from + s);
    parts.push(
      new Promise((resolve, reject) => {
        const child = spawn(
          'pnpm',
          [
            'exec',
            'tsx',
            '--tsconfig',
            'tsconfig.sim.json',
            fileURLToPath(import.meta.url),
            'worker',
            JSON.stringify(opts),
            JSON.stringify(seeds),
          ],
          { stdio: ['ignore', 'pipe', 'inherit'] },
        );
        let out = '';
        child.stdout.on('data', (d: Buffer) => (out += d.toString()));
        child.on('error', reject);
        child.on('close', (code) =>
          code === 0
            ? resolve(JSON.parse(out) as SimRunResult[])
            : reject(new Error(`worker ${code}`)),
        );
      }),
    );
  }
  return (await Promise.all(parts)).flat();
}

function roundMode(args: string[]) {
  const n = Number(flag(args, 'n', '2000'));
  const from = Number(flag(args, 'seed', '0'));
  const policy = (flag(args, 'policy', 'greedy') ?? 'greedy') as Policy;
  const scores: number[] = [];
  const mix = new Map<string, number>();
  let discards = 0;
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    let run = newRun({ seed: 50_000 + from + i, targets: [0, 0, 0, 0] });
    run = runReduce(run, { type: 'chooseHost', storm: false }).state;
    run = driveRound(run, policy);
    const r = run.round;
    if (!r?.result) continue;
    scores.push(r.result.score.total);
    for (const s of r.table) mix.set(s.kind, (mix.get(s.kind) ?? 0) + 1);
    discards += r.rules.discards - r.discardsLeft;
    drawn += run.tiles.length - r.stacks.reduce((a, s) => a + s.length, 0);
  }
  console.log(`| Rules | p25 | Median | p75 | Sets per round | Discards used | Tiles drawn |`);
  console.log(`|---|---|---|---|---|---|---|`);
  const sets = SET_ORDER.filter((k) => mix.get(k)).map(
    (k) => `${k} ${((mix.get(k) ?? 0) / n).toFixed(1)}`,
  );
  console.log(
    `| Base round, ${policy}, ${n} rounds | ${fmt(pct(scores, 0.25))} | ${fmt(median(scores))} | ${fmt(
      pct(scores, 0.75),
    )} | ${sets.join(' ')} | ${(discards / n).toFixed(1)} | ${(drawn / n).toFixed(0)} of 81 |`,
  );
}

function summarise(res: SimRunResult[], shopper: string, mode: 'free' | 'run') {
  if (mode === 'free') {
    console.log(
      `| Round | p10 | p25 | Median | p75 | p90 |  (${shopper}, ${res.length} runs, no targets)`,
    );
    console.log('|---|---|---|---|---|---|');
    for (let r = 0; r < 4; r++) {
      const xs = res.map((x) => x.scores[r] ?? 0);
      console.log(
        `| ${r + 1} | ${[0.1, 0.25, 0.5, 0.75, 0.9].map((q) => fmt(pct(xs, q))).join(' | ')} |`,
      );
    }
  } else {
    const wins = res.filter((x) => x.won).length;
    const lost = [0, 1, 2, 3].map((r) => res.filter((x) => x.lostAt === r).length);
    console.log(
      `${shopper}: won ${((100 * wins) / res.length).toFixed(0)}% of ${res.length} runs; lost in round ` +
        lost.map((n, r) => `${r + 1}: ${((100 * n) / res.length).toFixed(0)}%`).join(', '),
    );
  }
  const pol = new Map<string, number>();
  for (const x of res) pol.set(x.policy, (pol.get(x.policy) ?? 0) + 1);
  console.log(`final way of playing: ${JSON.stringify(Object.fromEntries(pol))}`);
  const buys = new Map<string, number>();
  for (const x of res)
    for (const b of x.bought) {
      const key = b.replace(/#\d+$/, '');
      buys.set(key, (buys.get(key) ?? 0) + 1);
    }
  console.log(
    'most bought: ' +
      [...buys]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 14)
        .map(([k, v]) => `${k} ${(v / res.length).toFixed(2)}`)
        .join(', '),
  );
  if (mode === 'free') {
    const last = median(res.map((x) => x.scores[3] ?? 0));
    const rows: [number, string, number][] = [];
    for (const c of DRAGON_IDS) {
      const w = res.filter((x) => x.dragons.includes(c)).map((x) => x.scores[3] ?? 0);
      if (w.length >= 5) rows.push([median(w) / last, c, w.length]);
    }
    console.log('round 4 median with each dragon, against all runs:');
    for (const [ratio, c, n] of rows.sort((a, b) => b[0] - a[0]))
      console.log(
        `  ${c.padEnd(16)} x${ratio.toFixed(2)}  (in ${((100 * n) / res.length).toFixed(0)}% of runs)`,
      );
  } else {
    const rows: [number, string, number][] = [];
    for (const c of DRAGON_IDS) {
      const w = res.filter((x) => x.dragons.includes(c));
      if (w.length >= 5) rows.push([w.filter((x) => x.won).length / w.length, c, w.length]);
    }
    console.log('win rate with each dragon at the end:');
    for (const [wr, c, n] of rows.sort((a, b) => b[0] - a[0]))
      console.log(
        `  ${c.padEnd(16)} ${(100 * wr).toFixed(0)}%  (in ${((100 * n) / res.length).toFixed(0)}% of finished builds)`,
      );
  }
}

async function hostsMode(args: string[], jobs: number, from: number, shopper: 'smart' | 'casual') {
  const runs = Number(flag(args, 'runs', '400'));
  const base = { shopper, gift: true, fire: 6, targets: [1000, 4000, 9000, 18000] };
  const calm = await runMany({ ...base, storm: [false, false, false, false] }, from, runs, jobs);
  console.log(
    `| Wind | Host | Round win rate | Median score ÷ target | Runs reaching it | (${shopper}, ${runs} runs) |`,
  );
  console.log('|---|---|---|---|---|---|');
  const row = (label: string, host: string, rs: { score: number; target: number }[]) => {
    const wins = rs.filter((r) => r.score >= r.target).length;
    const ratio = median(rs.map((r) => (100 * r.score) / r.target));
    console.log(
      `| ${label} | ${host} | ${((100 * wins) / Math.max(1, rs.length)).toFixed(0)}% | ${(ratio / 100).toFixed(2)} | ${rs.length} | |`,
    );
  };
  for (let w = 0; w < 4; w++) {
    const storm = await runMany(
      { ...base, storm: [0, 1, 2, 3].map((r) => r === w) },
      from,
      runs,
      jobs,
    );
    const names = HOSTS.filter((h) => h.wind === w);
    const calmRounds = calm
      .map((x) => x.rounds[w])
      .filter((x): x is { score: number; target: number } => !!x);
    const stormRounds = storm
      .map((x) => x.rounds[w])
      .filter((x): x is { score: number; target: number } => !!x);
    row(['East', 'South', 'West', 'North'][w] as string, `${names[0]?.title} (calm)`, calmRounds);
    row(
      ['East', 'South', 'West', 'North'][w] as string,
      `${names[1]?.title} (storm, target ×1.5)`,
      stormRounds,
    );
  }
}

async function policiesMode(
  args: string[],
  jobs: number,
  from: number,
  shopper: 'smart' | 'casual',
) {
  const runs = Number(flag(args, 'runs', '400'));
  const base = {
    shopper,
    gift: true,
    fire: 6,
    targets: [1000, 4000, 9000, 18000],
  };
  console.log(
    `| Policy | Won | Money at the end | Rounds banked early | Kongs on tables | (${shopper}, ${runs} runs) |`,
  );
  console.log('|---|---|---|---|---|---|');
  for (const [label, play] of [
    ['Play every round out', {}],
    ['Bank when the target is beaten', { bank: true }],
    ['Upgrade pongs to kongs', { upgrade: true }],
    ['Bank and upgrade', { bank: true, upgrade: true }],
  ] as const) {
    const res = await runMany({ ...base, play }, from, runs, jobs);
    const won = res.filter((x) => x.won).length;
    const mean = (f: (x: SimRunResult) => number) => res.reduce((a, x) => a + f(x), 0) / res.length;
    console.log(
      `| ${label} | ${((100 * won) / res.length).toFixed(0)}% | $${mean((x) => x.money).toFixed(1)} | ${mean((x) => x.banked).toFixed(2)} | ${mean((x) => x.kongs).toFixed(2)} | |`,
    );
  }
}

function trace(args: string[]) {
  const seed = Number(args[1] ?? '1');
  const shopper = (flag(args, 'shopper', 'smart') ?? 'smart') as 'smart' | 'casual';
  const r = playRunSim({ seed, shopper, gift: true, fire: 6 });
  console.log(JSON.stringify(r, null, 1));
  void chooseMove;
  void moveAction;
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  if (!mode || mode === '--help' || mode === 'help') return console.log(HELP);
  const jobs = Number(flag(args, 'jobs', String(Math.min(4, cpus().length))));
  const from = Number(flag(args, 'seed', '0'));
  const shopper = (flag(args, 'shopper', 'smart') ?? 'smart') as 'smart' | 'casual';
  if (mode === 'round') return roundMode(args);
  if (mode === 'hosts') return hostsMode(args, jobs, from, shopper);
  if (mode === 'policies') return policiesMode(args, jobs, from, shopper);
  if (mode === 'trace') return trace(args);
  if (mode === 'free' || mode === 'run') {
    const runs = Number(flag(args, 'runs', mode === 'free' ? '200' : '400'));
    const targetArg = flag(args, 'targets', mode === 'run' ? '1000,4000,9000,18000' : undefined);
    const opts: Omit<SimRunOptions, 'seed'> = {
      shopper,
      gift: !has(args, 'no-gift'),
      pythonShop: has(args, 'python-shop'),
      play: { bank: has(args, 'bank'), upgrade: has(args, 'upgrade') },
      fire: Number(flag(args, 'fire', '6')),
      ...(mode === 'run' && targetArg ? { targets: targetArg.split(',').map(Number) } : {}),
      ...(flag(args, 'lantern') ? { lantern: Number(flag(args, 'lantern')) } : {}),
      ...(flag(args, 'tileset') ? { tileSet: flag(args, 'tileset') as string } : {}),
    };
    const res = await runMany(opts, from, runs, jobs);
    return summarise(res, shopper, mode);
  }
  console.log(HELP);
}

if (process.argv[2] === 'worker') {
  const opts = JSON.parse(process.argv[3] ?? '{}') as Omit<SimRunOptions, 'seed'>;
  const seeds = JSON.parse(process.argv[4] ?? '[]') as number[];
  process.stdout.write(JSON.stringify(seeds.map((seed) => playRunSim({ ...opts, seed }))));
} else {
  void main();
}
