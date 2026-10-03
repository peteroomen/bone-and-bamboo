import { factoryAdvice, factoryReduce, newFactory } from '@/engine/factory';
const count = 200;
let score = 0,
  sets = 0,
  recycled = 0,
  orders = 0,
  gates = 0,
  stuck = 0;
for (let seed = 0; seed < count; seed++) {
  let s = newFactory(seed);
  for (let i = 0; i < 200 && !s.finished; i++) {
    const result = factoryReduce(s, factoryAdvice(s));
    if (result.error) throw new Error(result.error);
    s = result.state;
  }
  score += s.score;
  sets += Object.values(s.made).reduce((a, b) => a + b, 0);
  recycled += s.recycled.length;
  orders += Number(s.orderDone);
  gates += Number(s.gate.bought);
  stuck += Number(!s.finished);
}
process.stdout.write(
  JSON.stringify(
    {
      seeds: count,
      meanScore: score / count,
      meanSets: sets / count,
      meanRecycled: recycled / count,
      orders,
      gates,
      stuck,
    },
    null,
    2,
  ) + '\n',
);
