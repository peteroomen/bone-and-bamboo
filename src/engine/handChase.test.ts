import { describe, expect, it } from 'vitest';
import { CHASE } from '@/content/handChase';
import {
  CHASE_KINDS,
  chaseAdvice,
  chasePlan,
  chaseReduce,
  handOptions,
  improvingTiles,
  newChase,
  selectedHand,
} from './handChase';
import type { Tile } from './tiles';
const tiles = (text: string): Tile[] => text.split(' ').map((kind, i) => ({ id: i + 1, kind }));
const standard = 'p1 p2 p3 p4 p5 p6 p7 p8 p9 s2 s3 s4 w1 w1';

describe('complete hand scoring', () => {
  it('scores full structure and straight with physical tile chips', () => {
    const s = selectedHand(tiles(standard))!;
    expect(s.complete).toBe(true);
    expect(s.patterns).toEqual(['complete', 'pureStraight']);
    expect(s.chips).toBe(180 + 45 + 9 + 20);
    expect(s.mult).toBe(8);
    expect(s.total).toBe(2032);
  });
  it('keeps alternative decompositions and chooses the best score', () => {
    const rack = tiles('p1 p1 p1 p2 p2 p2 p3 p3 p3 p4 p4 p4 p5 p5');
    const options = handOptions(rack, {}, true);
    expect(options.some((o) => o.sets.some((s) => s.kind === 'chow'))).toBe(true);
    expect(options[0]!.patterns).toContain('allPongs');
    expect(options[0]!.patterns).toContain('fullFlush');
  });
  it('requires seven distinct pairs, never treating a quad as two pairs', () => {
    expect(selectedHand(tiles('p1 p1 p2 p2 p3 p3 p4 p4 s5 s5 s6 s6 w1 w1'))!.patterns).toContain(
      'sevenPairs',
    );
    expect(
      handOptions(tiles('p1 p1 p1 p1 p3 p3 p4 p4 s5 s5 s6 s6 w1 w1'), {}, true).some((s) =>
        s.patterns.includes('sevenPairs'),
      ),
    ).toBe(false);
  });
  it('scores one and two kongs with their extra physical tiles', () => {
    const one = selectedHand(tiles('p1 p1 p1 p1 p2 p3 p4 s2 s3 s4 m6 m7 m8 w1 w1'))!;
    expect(one.ids).toHaveLength(15);
    expect(one.complete).toBe(true);
    expect(one.sets.filter((s) => s.kind === 'kong')).toHaveLength(1);
    const two = selectedHand(tiles('p1 p1 p1 p1 p2 p2 p2 p2 s2 s3 s4 m6 m7 m8 w1 w1'))!;
    expect(two.complete).toBe(true);
    expect(two.ids).toHaveLength(16);
  });
  it('never allows honour chows or four different winds', () => {
    expect(selectedHand(tiles('w1 w2 w3'))).toBeNull();
    expect(selectedHand(tiles('w1 w2 w3 w4'))).toBeNull();
    expect(selectedHand(tiles('w1 w1 w1'))!.total).toBe(70);
  });
  it('detects all named bonuses without overlapping flush rewards', () => {
    const mixed = selectedHand(tiles('p2 p3 p4 s2 s3 s4 m2 m3 m4 p6 p7 p8 m5 m5'))!;
    expect(mixed.patterns).toContain('mixedStraight');
    expect(mixed.patterns).toContain('allSimples');
    const winds = selectedHand(tiles('p1 p1 p1 p2 p2 p2 p3 p3 p3 w1 w1 w1 p5 p5'))!;
    expect(winds.patterns).toContain('halfFlush');
    expect(winds.patterns).toContain('windPong');
    expect(winds.patterns).not.toContain('fullFlush');
  });
  it('scores upgrades once per matching pattern and rejects duplicate IDs/extras', () => {
    const t = tiles(standard);
    expect(selectedHand(t, { complete: 2 })!.total).toBe(254 * 12);
    expect(selectedHand(t, { pureStraight: 1 })!.total).toBe(254 * 12);
    expect(selectedHand([...t, t[0]!])).toBeNull();
    expect(selectedHand([...t, { id: 17, kind: 'w4' }])).toBeNull();
    expect(handOptions([...t, { id: 17, kind: 'w4' }])[0]!.ids).not.toContain(17);
  });
  it('small melds have an explicit fixed score', () => {
    expect(selectedHand(tiles('p2 p2'))!.total).toBe(20);
    expect(selectedHand(tiles('p2 p3 p4'))!.total).toBe(35);
    expect(selectedHand(tiles('p9 p9 p9 p9'))!.total).toBe(150);
  });
});

describe('hand-chase lifecycle and public hints', () => {
  it('deals 124 unique tiles without dragon tiles and replays exactly', () => {
    const s = newChase(123);
    expect(s).toEqual(newChase(123));
    expect(s.rack).toHaveLength(16);
    expect(s.pile).toHaveLength(108);
    expect(CHASE_KINDS).toHaveLength(31);
    expect([...s.rack, ...s.pile].some((t) => t.kind.startsWith('d'))).toBe(false);
  });
  it('retains unplayed tiles and scores separate submissions additively', () => {
    const base = newChase(1);
    const s = { ...base, rack: tiles('p2 p2 p3 p3 p4 p4') };
    const a = chaseReduce(s, { type: 'play', ids: [1, 2] }).state;
    expect(a.points).toBe(20);
    expect(a.rack.some((t) => t.id === 3)).toBe(true);
    const b = chaseReduce({ ...a, rack: tiles('p3 p3') }, { type: 'play', ids: [1, 2] }).state;
    expect(b.points).toBe(40);
    expect(b.history).toHaveLength(2);
    expect(s.points).toBe(0);
  });
  it('rejects illegal actions without mutation and cannot bank early', () => {
    const s = newChase(4);
    for (const ids of [
      [],
      [999],
      [s.rack[0]!.id, s.rack[0]!.id],
      s.rack.slice(0, 6).map((t) => t.id),
    ]) {
      expect(chaseReduce(s, { type: 'exchange', ids }).state).toBe(s);
    }
    expect(chaseReduce(s, { type: 'bank' }).state).toBe(s);
    expect(chaseReduce(s, { type: 'upgrade', pattern: 'complete' }).state).toBe(s);
  });
  it('handles banking, upgrades and wins on the fourth wind', () => {
    const cleared = chaseReduce({ ...newChase(1), points: 300 }, { type: 'bank' }).state;
    expect(cleared.phase).toBe('upgrade');
    const next = chaseReduce(cleared, { type: 'upgrade', pattern: 'sevenPairs' }).state;
    expect(next.wind).toBe(1);
    expect(next.levels.sevenPairs).toBe(1);
    expect(next.plays).toBe(CHASE.plays);
    expect(chaseReduce({ ...next, wind: 3, points: 9999 }, { type: 'bank' }).state.phase).toBe(
      'won',
    );
  });
  it('settles a dead rack instead of leaving a player stuck', () => {
    const s = { ...newChase(1), rack: tiles('p1 p4'), pile: [], exchanges: 0 };
    // A legal last scoring play can leave no continuation, even if plays remain.
    const r = chaseReduce({ ...s, rack: tiles('p1 p1 p4') }, { type: 'play', ids: [1, 2] });
    expect(r.state.phase).toBe('lost');
  });
  it('conserves physical tiles and suggestions cannot see pile order', () => {
    let s = newChase(64001);
    for (let i = 0; i < 30 && s.phase === 'play'; i++) {
      const a = chaseAdvice(s);
      expect(a).toEqual(chaseAdvice({ ...s, pile: [...s.pile].reverse() }));
      const r = chaseReduce(s, a);
      expect(r.error).toBeUndefined();
      s = r.state;
      const all = [...s.rack, ...s.pile, ...s.spent, ...s.discarded];
      expect(all).toHaveLength(124);
      expect(new Set(all.map((t) => t.id)).size).toBe(124);
      expect(chasePlan(s.rack).melds + chasePlan(s.rack).partials).toBeLessThanOrEqual(4);
    }
  });
  it('finds completing tiles and excludes exhausted copies', () => {
    const rack = tiles('p1 p2 p3 p4 p5 p6 p7 p8 p9 s2 s3 w1 w1');
    const s = { ...newChase(1), rack };
    expect(improvingTiles(s).map((w) => w.kind)).toContain('s4');
    expect(
      improvingTiles({
        ...s,
        discarded: Array.from({ length: 4 }, (_, i) => ({ id: 200 + i, kind: 's4' })),
      }).map((w) => w.kind),
    ).not.toContain('s4');
  });
});
