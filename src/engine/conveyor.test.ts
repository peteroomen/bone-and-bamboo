import { describe, expect, it } from 'vitest';
import {
  conveyorReduce,
  entry,
  exitFor,
  finished,
  neighbour,
  newConveyor,
  type ConveyorState,
  type ConveyorAction,
} from './conveyor';
function go(s: ConveyorState, a: ConveyorAction) {
  const r = conveyorReduce(s, a);
  expect(r.error).toBeUndefined();
  return r.state;
}
function conservation(s: ConveyorState) {
  const all = [
    ...s.supply.slice(s.cursor),
    ...s.moving.map((m) => m.tile),
    ...s.bays.flatMap((b) => b.tiles),
    ...s.shipped,
  ];
  expect(all).toHaveLength(s.supply.length);
  expect(new Set(all.map((t) => t.id)).size).toBe(s.supply.length);
  expect(new Set(s.moving.map((t) => t.cell)).size).toBe(s.moving.length);
}
describe('physical conveyor board', () => {
  it('moves the starter crate into eight pairs and eight runs without manual sorting', () => {
    for (let seed = 0; seed < 50; seed++) {
      let s = newConveyor(seed);
      for (let i = 0; i < 200 && !finished(s); i++) {
        const before = JSON.stringify(s);
        const old = s;
        s = go(s, { type: 'tick' });
        expect(JSON.stringify(old)).toBe(before);
        conservation(s);
      }
      expect(finished(s)).toBe(true);
      expect(s.score).toBe(640);
      expect(s.bays.map((b) => b.sets)).toEqual([8, 8]);
      expect(s.blocked).toEqual([]);
    }
  });
  it('observes physical entrances and both corner orientations', () => {
    expect(entry({ kind: 'corner', dir: 'N', bend: 'left' })).toBe('W');
    expect(entry({ kind: 'corner', dir: 'E', bend: 'right' })).toBe('S');
    expect(neighbour(6, 'E')).toBeNull();
    expect(neighbour(0, 'N')).toBeNull();
    let s = go(newConveyor(), { type: 'rotate', cell: 15 });
    for (let i = 0; i < 5; i++) s = go(s, { type: 'tick' });
    expect(s.cursor).toBe(1);
    expect(s.moving.map((t) => t.cell)).toEqual([14]);
    expect(s.blocked).toEqual([14]);
    s = go(s, { type: 'place', cell: 15, track: { kind: 'straight', dir: 'E' } });
    s = go(s, { type: 'tick' });
    expect(s.moving.find((t) => t.tile.id === 0)?.cell).toBe(15);
  });
  it('filters suit and optional rank; unmatched tiles take the main line', () => {
    const gate = { kind: 'gate' as const, dir: 'E' as const, suit: 'p' as const, rank: 2 };
    expect(exitFor(gate, { id: 0, kind: 'p2' })).toBe('S');
    expect(exitFor(gate, { id: 0, kind: 's2' })).toBe('E');
    expect(exitFor(gate, { id: 0, kind: 'p3' })).toBe('E');
    expect(exitFor({ ...gate, rank: 0 }, { id: 0, kind: 'p3' })).toBe('S');
  });
  it('queues behind an incompatible bay without deleting or overlapping tiles', () => {
    let s = go(newConveyor(), { type: 'recipe', bay: 0, recipe: 'run' });
    for (let i = 0; i < 120; i++) {
      s = go(s, { type: 'tick' });
      conservation(s);
    }
    expect(finished(s)).toBe(false);
    expect(s.blocked.length).toBeGreaterThan(0);
    expect(s.bays[0]!.tiles).toHaveLength(1);
    expect(conveyorReduce(s, { type: 'recipe', bay: 0, recipe: 'pair' }).error).toBeTruthy();
  });
  it('moves a full circular belt in unison, with no processing-order advantage', () => {
    let s = newConveyor();
    s.cursor = s.supply.length;
    s.tracks = {
      0: { kind: 'corner', dir: 'E' },
      1: { kind: 'corner', dir: 'S' },
      8: { kind: 'corner', dir: 'W' },
      7: { kind: 'corner', dir: 'N' },
    };
    s.moving = [0, 1, 8, 7].map((cell, id) => ({ cell, from: cell, tile: { id, kind: 's2' } }));
    s = go(s, { type: 'tick' });
    expect(s.moving.map((t) => t.cell)).toEqual([1, 8, 7, 0]);
    expect(s.blocked).toEqual([]);
  });
  it('does not let edits overwrite fixed ports, occupied belts or duplicate the junction', () => {
    let s = newConveyor();
    expect(conveyorReduce(s, { type: 'erase', cell: 14 }).state).toBe(s);
    expect(
      conveyorReduce(s, {
        type: 'place',
        cell: 1,
        track: { kind: 'gate', dir: 'E', suit: 'p', rank: 0 },
      }).error,
    ).toBeTruthy();
    s = go(go(s, { type: 'tick' }), { type: 'tick' });
    expect(conveyorReduce(s, { type: 'erase', cell: 15 }).state).toBe(s);
    expect(
      conveyorReduce(s, {
        type: 'place',
        cell: 5,
        track: { kind: 'gate', dir: 'E', suit: 'p', rank: 7 },
      }).error,
    ).toBeTruthy();
  });
  it('rewinds progress while preserving edits and clear/starter give distinct layouts', () => {
    let s = go(newConveyor(), { type: 'erase', cell: 12 });
    s = go(s, { type: 'tick' });
    s = go(s, { type: 'rewind' });
    expect(s.cursor).toBe(0);
    expect(s.score).toBe(0);
    expect(s.tracks[12]).toBeUndefined();
    s = go(s, { type: 'clear' });
    expect(Object.keys(s.tracks)).toHaveLength(0);
    s = go(s, { type: 'starter' });
    expect(s).toEqual(newConveyor());
  });
  it('replays a JSON action log exactly', () => {
    const actions: ConveyorAction[] = [
      { type: 'rotate', cell: 15 },
      { type: 'tick' },
      { type: 'tick' },
      { type: 'place', cell: 15, track: { kind: 'straight', dir: 'E' } },
    ];
    for (let i = 0; i < 50; i++) actions.push({ type: 'tick' });
    let s = newConveyor();
    for (const a of actions) s = go(s, a);
    let replay = newConveyor();
    for (const a of JSON.parse(JSON.stringify(actions)) as ConveyorAction[]) replay = go(replay, a);
    expect(replay).toEqual(s);
    conservation(s);
  });
});
