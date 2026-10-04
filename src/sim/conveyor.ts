import { conveyorReduce, finished, newConveyor } from '@/engine/conveyor';
let complete = 0,
  score = 0,
  ticks = 0,
  blocked = 0;
for (let seed = 0; seed < 200; seed++) {
  let s = newConveyor(seed);
  for (let i = 0; i < 200 && !finished(s); i++) {
    s = conveyorReduce(s, { type: 'tick' }).state;
    blocked += s.blocked.length;
  }
  complete += Number(finished(s));
  score += s.score;
  ticks += s.tick;
}
process.stdout.write(
  JSON.stringify(
    {
      seeds: 200,
      complete,
      meanScore: score / 200,
      meanBeats: ticks / 200,
      blockedTileBeats: blocked,
    },
    null,
    2,
  ) + '\n',
);
