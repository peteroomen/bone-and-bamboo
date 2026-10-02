import { describe, expect, it } from 'vitest';
import { type PlayedSet, scoreTable } from './scoring';
import { classify, orderSet } from './sets';
import { tiles } from './testkit';

function table(...specs: string[]): PlayedSet[] {
  return specs.map((s) => {
    const t = tiles(s);
    return { kind: classify(t) as PlayedSet['kind'], tiles: orderSet(t) };
  });
}
const score = (t: PlayedSet[], dragons: string[] = [], levels = {}) =>
  scoreTable(t, { dragons, levels });

describe('scoring', () => {
  it('scores the worked example: 117 chips x 6 mult = 702', () => {
    const t = table('s2 s3 s4', 'm9 m9 m9', 'p6 p7 p8');
    const r = score(t);
    expect(r.chips).toBe(10 + 9 + (40 + 27) + (10 + 21));
    expect(r.chips).toBe(117);
    expect(r.mult).toBe(1 + 4 + 1);
    expect(r.total).toBe(702);
  });
  it('emits a step per set and per dragon, with running totals', () => {
    const r = score(table('p1 p2 p3', 'p4 p4'), ['redString', 'coinString']);
    expect(r.steps.map((s) => s.type)).toEqual(['set', 'set', 'dragon', 'dragon']);
    const last = r.steps[r.steps.length - 1];
    expect(last?.type === 'dragon' && last.chips).toBe(r.chips);
  });
  it('adds level chips and level mult', () => {
    const t = table('p1 p2 p3');
    expect(score(t, [], { chow: 2 }).total).toBe((10 + 20 + 6) * (1 + 2));
    expect(score(table('p5 p5 p5'), [], { pong: 1 }).total).toBe((40 + 15 + 15) * (4 + 2));
  });
  it('counts honours as 10 chips and singles as +0 mult', () => {
    expect(score(table('w1')).total).toBe(0);
    expect(score(table('w1 w1')).chips).toBe(5 + 20);
  });
  it('floors the score', () => {
    expect(score(table('p1 p1'), ['twoSuits']).total).toBe(Math.floor(7 * 1 * 1.5));
  });
  it('applies the enhancements: jade +4 mult, bone +30 chips, porcelain x2', () => {
    const base = score(table('p2 p2')).total;
    expect(base).toBe(9 * 1);
    expect(score(table('jade:p2 p2')).total).toBe(9 * 5);
    expect(score(table('bone:p2 p2')).total).toBe(39 * 1);
    expect(score(table('porcelain:p2 p2')).total).toBe(9 * 1 * 2);
    expect(score(table('gold:p2 p2')).total).toBe(base);
  });
  describe('dragons', () => {
    const chows = table('p1 p2 p3', 'p4 p5 p6', 's7 s8 s9');
    it('Abacus: +2 mult per chow', () => expect(score(chows, ['abacus']).mult).toBe(3 + 6));
    it('Red String: +6 mult', () => expect(score(chows, ['redString']).mult).toBe(3 + 6));
    it('Coin String: +50 chips', () =>
      expect(score(chows, ['coinString']).chips).toBe(score(chows).chips + 50));
    it('suit dragons: +12 chips per tile of the suit', () => {
      const base = score(chows).chips;
      expect(score(chows, ['coinPurse']).chips).toBe(base + 12 * 6);
      expect(score(chows, ['bambooGrove']).chips).toBe(base + 12 * 3);
      expect(score(chows, ['scroll']).chips).toBe(base);
    });
    it("Sparrow's Nest: pairs +6 mult", () =>
      expect(score(table('p1 p1', 'p2 p2'), ['sparrowNest']).mult).toBe(2 + 12));
    it('Gold Toad, Iron Teapot, Long Sleeves, Lantern, Night Owl change no score', () => {
      for (const c of ['goldToad', 'ironTeapot', 'longSleeves', 'lantern', 'nightOwl'])
        expect(score(chows, [c]).total).toBe(score(chows).total);
    });
    it('Pong Hall: x2 with 2+ pongs or kongs', () => {
      expect(score(table('p1 p1 p1', 'p2 p2 p2'), ['pongHall']).x).toBe(2);
      expect(score(table('p1 p1 p1', 'p2 p2'), ['pongHall']).x).toBe(1);
      expect(score(table('p1 p1 p1 p1', 'p2 p2 p2'), ['pongHall']).x).toBe(2);
    });
    it('Moon Gate: +4 mult per set with a 1, 9 or honour', () => {
      expect(score(table('p1 p2 p3', 'p4 p5 p6', 'w1 w1'), ['outside']).mult).toBe(1 + 1 + 1 + 8);
      expect(score(table('p1'), ['outside']).mult).toBe(0);
    });
    it('Mahjong!: x2 with 4+ sets and a pair', () => {
      const four = table('p1 p2 p3', 'p4 p5 p6', 's1 s2 s3', 's4 s5 s6', 'm1 m1');
      expect(score(four, ['mahjong']).x).toBe(2);
      expect(score(four.slice(0, 4), ['mahjong']).x).toBe(1);
      expect(score(table('p1 p2 p3', 'p4 p5 p6', 's1 s2 s3', 'm1 m1'), ['mahjong']).x).toBe(1);
    });
    it('Two Fish: x1.5 with 2 suits or fewer', () => {
      expect(score(table('p1 p2 p3', 's4 s5 s6'), ['twoSuits']).x).toBe(1.5);
      expect(score(chows, ['twoSuits']).x).toBe(1.5);
      expect(score(table('p1 p2 p3', 's4 s5 s6', 'm1 m1'), ['twoSuits']).x).toBe(1);
      expect(score(table('w1 w1', 'w2 w2'), ['twoSuits']).x).toBe(1.5);
    });
    it('Rice Bowl: x2 with no 1s, 9s or honours', () => {
      expect(score(table('p2 p3 p4', 's5 s5'), ['allSimples']).x).toBe(2);
      expect(score(table('p1 p2 p3'), ['allSimples']).x).toBe(1);
      expect(score(table('p2 p3 p4', 'w1 w1'), ['allSimples']).x).toBe(1);
      expect(score([], ['allSimples']).x).toBe(1);
    });
    it('Nine Rings: x3 with 1-2-3, 4-5-6, 7-8-9 of one suit', () => {
      expect(score(table('p1 p2 p3', 'p4 p5 p6', 'p7 p8 p9'), ['pureStraight']).x).toBe(3);
      expect(score(table('p1 p2 p3', 'p4 p5 p6', 's7 s8 s9'), ['pureStraight']).x).toBe(1);
      expect(score(table('p1 p2 p3', 'p4 p5 p6'), ['pureStraight']).x).toBe(1);
    });
    it('Kong Bell: x2 per kong', () => {
      expect(score(table('p1 p1 p1 p1', 's1 s1 s1 s1'), ['kongBell']).x).toBe(4);
      expect(score(table('p1 p1 p1'), ['kongBell']).x).toBe(1);
    });
    it('Wind Chime: +12 mult per wind set', () => {
      expect(score(table('w1 w2 w3 w4', 'w2 w2 w2', 'p1 p1 p1'), ['windChime']).mult).toBe(
        10 + 4 + 4 + 24,
      );
      expect(score(table('w1 w1'), ['windChime']).mult).toBe(1);
      expect(score(table('w3 w3 w3 w3'), ['windChime']).mult).toBe(8 + 12);
    });
    it('Three Treasures: x1.5 per pong', () => {
      expect(score(table('p1 p1 p1', 's2 s2 s2'), ['threeTreasures']).x).toBe(2.25);
      expect(score(table('p1 p1 p1 p1'), ['threeTreasures']).x).toBe(1);
    });
    it('Stone Lion: +3 mult per tile in pongs and kongs', () => {
      expect(score(table('p1 p1 p1', 's2 s2 s2 s2', 'p4 p5 p6'), ['stoneLion']).mult).toBe(
        4 + 8 + 1 + 3 * 7,
      );
    });
    it('Twin Cranes: x1.5 per pair of identical sets', () => {
      expect(score(table('p1 p2 p3', 'p1 p2 p3'), ['twinCranes']).x).toBe(1.5);
      expect(score(table('p1 p2 p3', 'p1 p2 p3', 'p1 p2 p3', 'p1 p2 p3'), ['twinCranes']).x).toBe(
        2.25,
      );
      expect(score(table('p1 p2 p3', 'p2 p3 p4'), ['twinCranes']).x).toBe(1);
      expect(score(table('p1', 'p1'), ['twinCranes']).x).toBe(1);
    });
    it('applies dragons left to right and multiplies at the end', () => {
      const t = table('p1 p2 p3');
      const r = score(t, ['redString', 'twoSuits']);
      expect(r.total).toBe(Math.floor(16 * (1 + 6) * 1.5));
    });
  });
});
