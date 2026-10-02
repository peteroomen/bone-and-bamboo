import { describe, expect, it } from 'vitest';
import { playRunSim } from './driver';

describe('the simulator', () => {
  it('plays a whole run headless, deterministically', () => {
    const a = playRunSim({
      seed: 3,
      shopper: 'smart',
      targets: [1000, 4000, 9000, 18000],
      gift: true,
      fire: 6,
      evalSeeds: 4,
    });
    const b = playRunSim({
      seed: 3,
      shopper: 'smart',
      targets: [1000, 4000, 9000, 18000],
      gift: true,
      fire: 6,
      evalSeeds: 4,
    });
    expect(a).toEqual(b);
    expect(a.scores.length).toBeGreaterThanOrEqual(1);
  });
  it('lets nobody lose without targets', () => {
    const r = playRunSim({ seed: 5, shopper: 'casual', gift: true, fire: 6 });
    expect(r.won).toBe(true);
    expect(r.scores).toHaveLength(4);
  });
  it('the smart shopper builds a stronger run than the casual one, on average', () => {
    let smart = 0;
    let casual = 0;
    for (let seed = 0; seed < 12; seed++) {
      smart +=
        playRunSim({ seed, shopper: 'smart', gift: true, fire: 6, evalSeeds: 6 }).scores[3] ?? 0;
      casual += playRunSim({ seed, shopper: 'casual', gift: true, fire: 6 }).scores[3] ?? 0;
    }
    expect(smart).toBeGreaterThan(casual);
  });
});
