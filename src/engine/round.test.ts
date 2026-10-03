import { describe, expect, it } from 'vitest';
import { type RoundState, nextTiles, preview, roundReduce, startRound } from './round';
import { roundWith, tiles } from './testkit';
import type { RoundEvent } from './round';
import { buildTiles } from './tiles';

const ids = (s: RoundState, ...kinds: string[]) =>
  kinds.map((k) => s.hand.find((t) => t.kind === k)?.id as number);

describe('a round', () => {
  it('starts with a full hand drawn from the pile', () => {
    const events: RoundEvent[] = [];
    const s = startRound(
      {
        tiles: buildTiles('boneBamboo'),
        rules: roundWith().rules,
        dragons: [],
        levels: {},
        target: 0,
        rng: 5,
      },
      events,
    );
    expect(s.hand).toHaveLength(12);
    expect(s.stacks).toHaveLength(1);
    expect(s.stacks.flat()).toHaveLength(81 - 12);
    expect(s.playsLeft).toBe(5);
    expect(s.discardsLeft).toBe(4);
    expect(events.filter((e) => e.type === 'draw')).toHaveLength(12);
  });

  it('refills the hand from the top of the pile after a play', () => {
    const s = roundWith({ hand: 'p1 p2 p3 s5', stacks: ['m1 m2 m3 m4'], rules: { handSize: 4 } });
    const r = roundReduce(s, { type: 'play', ids: ids(s, 'p1', 'p2', 'p3') });
    expect(r.state.hand.map((t) => t.kind)).toEqual(['s5', 'm4', 'm3', 'm2']);
    expect(r.state.stacks[0]?.map((t) => t.kind)).toEqual(['m1']);
    expect(r.events.map((e) => e.type)).toEqual(['play', 'draw', 'draw', 'draw']);
  });

  it('refills after a discard, and stops when the pile runs dry', () => {
    const s = roundWith({ hand: 'p1 p2 s5 s9', stacks: ['m1'], rules: { handSize: 4 } });
    const r = roundReduce(s, { type: 'discard', ids: ids(s, 'p1', 'p2') });
    expect(r.state.hand.map((t) => t.kind)).toEqual(['s5', 's9', 'm1']);
    expect(r.state.stacks[0]).toHaveLength(0);
  });

  it('shows the next tiles of the pile only with peek (the Lantern)', () => {
    const s = roundWith({ stacks: ['m1 m2 m3 m4'], rules: { peek: 0 } });
    expect(nextTiles(s)).toEqual([]);
    const lit = roundWith({ stacks: ['m1 m2 m3 m4'], rules: { peek: 3 } });
    expect(nextTiles(lit).map((t) => t.kind)).toEqual(['m4', 'm3', 'm2']);
  });

  it('plays a set onto the table, using a play', () => {
    const s = roundWith({ hand: 'p1 p2 p3 s5', stacks: ['m1'], rules: { handSize: 4 } });
    const r = roundReduce(s, { type: 'play', ids: ids(s, 'p1', 'p2', 'p3') });
    expect(r.state.table).toHaveLength(1);
    expect(r.state.table[0]?.kind).toBe('chow');
    expect(r.state.playsLeft).toBe(4);
    expect(r.state.hand.map((t) => t.kind)).toEqual(['s5', 'm1']);
    expect(r.events[0]).toMatchObject({ type: 'play', kind: 'chow' });
  });

  it('refuses a play that is not a set', () => {
    const s = roundWith({ hand: 'p1 p2 s5 s9', rules: { handSize: 4 } });
    const r = roundReduce(s, { type: 'play', ids: ids(s, 'p1', 's5') });
    expect(r.events[0]).toMatchObject({ type: 'illegal' });
    expect(r.state).toBe(s);
  });

  it('discards 1 to 5 tiles, using a discard', () => {
    const s = roundWith({ hand: 'p1 p2 p3 s5 s9 m1', rules: { handSize: 6 } });
    const r = roundReduce(s, { type: 'discard', ids: ids(s, 'p1', 'p2') });
    expect(r.state.discardsLeft).toBe(3);
    expect(r.state.discarded).toHaveLength(2);
    expect(r.state.hand).toHaveLength(4);
    expect(roundReduce(s, { type: 'discard', ids: [] }).events[0]).toMatchObject({
      type: 'illegal',
    });
    const six = roundWith({ hand: 'p1 p2 p3 s5 s9 m1', rules: { handSize: 6 } });
    expect(
      roundReduce(six, { type: 'discard', ids: six.hand.map((t) => t.id) }).events[0],
    ).toMatchObject({ type: 'illegal' });
  });

  it('refuses a discard with none left', () => {
    const s = { ...roundWith({ hand: 'p1 p2', rules: { handSize: 2 } }), discardsLeft: 0 };
    expect(
      roundReduce(s, { type: 'discard', ids: [s.hand[0]?.id as number] }).events[0],
    ).toMatchObject({
      type: 'illegal',
    });
  });

  it('allows a last-resort single only with no set and no discards', () => {
    const s = { ...roundWith({ hand: 'p1 p4 s7', rules: { handSize: 3 } }), discardsLeft: 0 };
    const r = roundReduce(s, { type: 'play', ids: [s.hand[0]?.id as number] });
    expect(r.state.table[0]?.kind).toBe('single');
    const withDiscards = roundWith({ hand: 'p1 p4 s7', rules: { handSize: 3 } });
    expect(
      roundReduce(withDiscards, { type: 'play', ids: [withDiscards.hand[0]?.id as number] })
        .events[0],
    ).toMatchObject({ type: 'illegal' });
  });

  it('ends after the last play and scores the whole table', () => {
    let s = roundWith({ hand: 'p1 p2 p3 s4 s5 s6', rules: { handSize: 6, plays: 2 } });
    s = roundReduce(s, { type: 'play', ids: ids(s, 'p1', 'p2', 'p3') }).state;
    expect(s.phase).toBe('play');
    const r = roundReduce(s, { type: 'play', ids: ids(s, 's4', 's5', 's6') });
    expect(r.state.phase).toBe('done');
    expect(r.state.result?.score.total).toBe((10 + 6 + 10 + 15) * 2);
    expect(r.events.map((e) => e.type)).toEqual(['play', 'score', 'end']);
  });

  it('ends when the hand and the wall are both empty', () => {
    let s = roundWith({ hand: 'p1 p2 p3', rules: { handSize: 3 } });
    const r = roundReduce(s, { type: 'play', ids: ids(s, 'p1', 'p2', 'p3') });
    s = r.state;
    expect(s.phase).toBe('done');
    expect(s.playsLeft).toBe(4);
  });

  it('refuses everything once the round is over', () => {
    const s = roundWith({ hand: 'p1 p2 p3', rules: { handSize: 3 } });
    const done = roundReduce(s, { type: 'play', ids: ids(s, 'p1', 'p2', 'p3') }).state;
    expect(roundReduce(done, { type: 'discard', ids: [] }).events[0]).toMatchObject({
      type: 'illegal',
    });
  });

  it('previews the table and what the selection would add', () => {
    let s = roundWith({ hand: 'p1 p2 p3 s4 s5 s6 m1 m1', rules: { handSize: 8 } });
    s = roundReduce(s, { type: 'play', ids: ids(s, 'p1', 'p2', 'p3') }).state;
    const p = preview(s, ids(s, 's4', 's5', 's6'));
    expect(p.now.total).toBe((10 + 6) * 1);
    expect(p.withSelected?.total).toBe((10 + 6 + 10 + 15) * 2);
    expect(preview(s, ids(s, 's4', 'm1')).withSelected).toBeNull();
    expect(preview(s).withSelected).toBeNull();
  });

  it('gives gold money for played gold tiles and cracks porcelain by the seeded roll', () => {
    const run = (rng: number) => {
      const s = roundWith({
        hand: 'gold:p5 p5 porcelain:s2 s2',
        rules: { handSize: 4, plays: 2 },
        rng,
      });
      const of = (st: RoundState, kind: string) =>
        st.hand.filter((t) => t.kind === kind).map((t) => t.id);
      let r = roundReduce(s, { type: 'play', ids: of(s, 'p5') });
      r = roundReduce(r.state, { type: 'play', ids: of(r.state, 's2') });
      return r.state.result;
    };
    expect(run(1)?.gold).toBe(2);
    const outcomes = new Set(Array.from({ length: 40 }, (_, i) => run(i + 1)?.cracked.length));
    expect(outcomes).toEqual(new Set([0, 1]));
    expect(run(3)).toEqual(run(3));
  });

  it('is plain JSON all the way', () => {
    let s = roundWith({ hand: 'p1 p2 p3 s5', rules: { handSize: 4 }, stacks: ['m1 m2'] });
    s = roundReduce(s, { type: 'play', ids: ids(s, 'p1', 'p2', 'p3') }).state;
    const copy = JSON.parse(JSON.stringify(s)) as RoundState;
    expect(copy).toEqual(s);
    const discard = { type: 'discard', ids: [s.hand[0]?.id as number] } as const;
    expect(roundReduce(copy, discard).state).toEqual(roundReduce(s, discard).state);
  });

  it('never mutates its input', () => {
    const s = roundWith({ hand: 'p1 p2 p3 s5', rules: { handSize: 4 }, stacks: ['m1'] });
    const before = JSON.stringify(s);
    roundReduce(s, { type: 'play', ids: ids(s, 'p1', 'p2', 'p3') });
    roundReduce(s, { type: 'discard', ids: ids(s, 's5') });
    expect(JSON.stringify(s)).toBe(before);
    void tiles;
  });
});
