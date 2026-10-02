import { describe, expect, it } from 'vitest';
import { autoRefill, chooseSlot } from './ai';
import { advise } from './advice';
import { freeWallSlots, needsRefill, roundReduce, startRound } from './round';
import { newRun, roundRulesFor, runReduce } from './run';
import { roundWith } from './testkit';
import { buildTiles } from './tiles';

const illegal = (r: { events: { type: string }[] }) => r.events[0]?.type === 'illegal';

// testkit's wall: 2 rows, width 3 — slots 0-1 on top, resting on 2-4 below (0 on 2 and 3, 1 on 3 and 4)
describe('a round on the brick wall', () => {
  it('builds this side of the wall and deals the hand from the rest', () => {
    const run = newRun({ seed: 3, draw: 'wall' });
    const s = startRound({
      tiles: buildTiles('boneBamboo'),
      rules: roundRulesFor(run),
      dragons: [],
      levels: {},
      target: 0,
      rng: 3,
    });
    expect(s.wall).toHaveLength(30);
    expect(s.hand).toHaveLength(s.rules.handSize);
    expect(s.stacks[0]).toHaveLength(81 - 30 - s.rules.handSize);
    expect(freeWallSlots(s)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('takes only a free tile, and only into a hand with room', () => {
    const s = roundWith({ hand: 'p1 p2', rules: { handSize: 3 }, wall: 'm1 m2 s1 s2 s3' });
    expect(illegal(roundReduce(s, { type: 'take', slot: 3 }))).toBe(true);
    const r = roundReduce(s, { type: 'take', slot: 0 });
    expect(r.events[0]).toMatchObject({ type: 'take', slot: 0 });
    expect(r.state.hand.map((t) => t.kind)).toEqual(['p1', 'p2', 'm1']);
    expect(r.state.wall?.[0]).toBeNull();
    // s1 had only m1 on it; s2 still has m2
    expect(freeWallSlots(r.state)).toEqual([1, 2]);
    expect(illegal(roundReduce(r.state, { type: 'take', slot: 1 }))).toBe(true);
  });

  it('holds plays and discards until the hand is filled from the wall', () => {
    const s = roundWith({ hand: 'p1 p2 p3 s9', rules: { handSize: 4 }, wall: 'm1 m2 s1 s2 s3' });
    const ids = s.hand.slice(0, 3).map((t) => t.id);
    const played = roundReduce(s, { type: 'play', ids }).state;
    expect(played.hand).toHaveLength(1);
    expect(needsRefill(played)).toBe(true);
    expect(
      illegal(roundReduce(played, { type: 'discard', ids: [played.hand[0]?.id as number] })),
    ).toBe(true);
    const full = autoRefill(played).state;
    expect(full.hand).toHaveLength(4);
    expect(needsRefill(full)).toBe(false);
  });

  it('refills from the pile on its own once the wall side is empty', () => {
    const s = roundWith({
      hand: 'p1 p2 p3',
      rules: { handSize: 3 },
      wall: '_ _ _ _ s3',
      stacks: ['m7 m8 m9'],
    });
    const taken = roundReduce(s, {
      type: 'play',
      ids: s.hand.map((t) => t.id),
    }).state;
    // s3 must be taken by hand; the rest comes from the pile after it
    expect(taken.hand).toHaveLength(0);
    const r = roundReduce(taken, { type: 'take', slot: 4 });
    expect(r.state.hand.map((t) => t.kind)).toEqual(['s3', 'm9', 'm8']);
  });

  it('the bot and Ask take a free tile that helps, from what shows', () => {
    const s = roundWith({ hand: 'p1 p2 s9', rules: { handSize: 4 }, wall: 'm5 p3 w1 w2 w3' });
    expect(chooseSlot(s)).toBe(1);
    expect(advise(s)).toMatchObject({ type: 'draw', slot: 1 });
  });

  it('plays a whole run through the reducer, saves as JSON', () => {
    let run = newRun({ seed: 9, draw: 'wall', targets: [0, 0, 0, 0] });
    run = runReduce(run, { type: 'chooseHost', storm: false }).state;
    run = runReduce(run, { type: 'round', action: { type: 'take', slot: 0 } }).state;
    expect(JSON.parse(JSON.stringify(run))).toEqual(run);
    expect(run.round?.rules.draw).toBe('wall');
  });
});
