import { chaseAdvice, chaseReduce, newChase } from '@/engine/handChase';
const n = Number(process.argv[2] ?? 200);
let wins = 0;
const reaches = [0, 0, 0, 0];
const cleared = [0, 0, 0, 0];
let complete = 0;
let submitted = 0;
let stuck = 0;
const scores: number[][] = [[], [], [], []];
for (let i = 0; i < n; i++) {
  let s = newChase(64000 + i);
  reaches[0]!++;
  for (let turn = 0; turn < 100; turn++) {
    if (s.phase === 'lost' || s.phase === 'won') {
      if (s.phase === 'won') wins++;
      break;
    }
    if (s.phase === 'upgrade') {
      s = chaseReduce(s, { type: 'upgrade', pattern: 'complete' }).state;
      reaches[s.wind]!++;
      continue;
    }
    const a = chaseAdvice(s);
    const r = chaseReduce(s, a);
    if (r.error) {
      stuck++;
      break;
    }
    if (a.type === 'play') {
      submitted++;
      if (r.state.history.at(-1)?.complete) complete++;
    }
    if (r.state.phase !== 'play') {
      scores[s.wind]!.push(r.state.points);
      if (r.state.phase !== 'lost') cleared[s.wind]!++;
    }
    s = r.state;
  }
}
console.log(
  JSON.stringify(
    {
      n,
      wins,
      reaches,
      cleared,
      complete,
      submitted,
      stuck,
      scores: scores.map((a) => ({
        n: a.length,
        median: a.sort((a, b) => a - b)[Math.floor(a.length / 2)],
      })),
    },
    null,
    2,
  ),
);
