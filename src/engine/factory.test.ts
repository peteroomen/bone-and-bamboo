import { describe, expect, it } from 'vitest';
import {
  accepts,
  canAuto,
  factoryAdvice,
  factoryReduce,
  newFactory,
  type FactoryAction,
  type FactoryState,
} from './factory';
import type { Tile } from './tiles';
const tiles = (...kinds: string[]): Tile[] => kinds.map((kind, id) => ({ kind, id }));
const go = (s: FactoryState, a: FactoryAction) => {
  const result = factoryReduce(s, a);
  expect(result.error).toBeUndefined();
  return result.state;
};
function opening() {
  let s = newFactory();
  for (const machine of [
    'pair',
    'pair',
    'run',
    'run',
    'run',
    'triple',
    'triple',
    'triple',
  ] as const)
    s = go(s, { type: 'route', source: s.supply[s.cursor]!.id, machine });
  return s;
}
function conserve(s: FactoryState) {
  const all = [
    ...s.supply.slice(s.cursor),
    ...s.tray,
    ...Object.values(s.machines).flat(),
    ...s.shipped,
    ...s.recycled,
  ];
  expect(all.length).toBe(s.supply.length);
  expect(new Set(all.map((t) => t.id)).size).toBe(s.supply.length);
  expect(all.every((t) => s.supply[t.id]?.kind === t.kind)).toBe(true);
}
describe('toy factory', () => {
  it('ships the teaching pair, run and triple with separate score and brass', () => {
    const s = opening();
    expect(s.score).toBe(125);
    expect(s.brass).toBe(125);
    expect(s.made).toEqual({ pair: 1, run: 1, triple: 1 });
    expect(Object.values(s.machines).flat()).toHaveLength(0);
    conserve(s);
  });
  it('recognises runs in any order without mixing suits, duplicates or winds', () => {
    const ts = tiles('s5', 's3', 's4', 'p4', 's6', 's3', 'w1');
    expect(accepts('run', ts.slice(0, 2), ts[2]!)).toBe(true);
    for (const i of [3, 4, 5, 6]) expect(accepts('run', ts.slice(0, 2), ts[i]!)).toBe(false);
    expect(accepts('run', [], ts[6]!)).toBe(false);
    expect(accepts('pair', [ts[1]!], ts[5]!)).toBe(true);
    expect(accepts('pair', [ts[1]!], ts[1]!)).toBe(false);
  });
  it('holds, routes and recovers physical tiles without advancing the belt twice', () => {
    let s = newFactory();
    s = go(s, { type: 'hold', source: 0 });
    expect(s.cursor).toBe(1);
    s = go(s, { type: 'route', source: 0, machine: 'pair' });
    expect(s.cursor).toBe(1);
    s = go(s, { type: 'recover', machine: 'pair', tile: 0 });
    expect(s.tray.map((t) => t.id)).toEqual([0]);
    conserve(s);
  });
  it('rejects remote tiles, invalid matches and a full tray without mutation', () => {
    let s = newFactory();
    const before = JSON.stringify(s);
    expect(factoryReduce(s, { type: 'route', source: 15, machine: 'pair' }).state).toBe(s);
    expect(JSON.stringify(s)).toBe(before);
    for (let source = 0; source < 3; source++) s = go(s, { type: 'hold', source });
    expect(factoryReduce(s, { type: 'hold', source: 3 }).error).toBeTruthy();
    s = go(s, { type: 'route', source: 0, machine: 'pair' });
    expect(factoryReduce(s, { type: 'route', source: 3, machine: 'pair' }).error).toBeTruthy();
    conserve(s);
  });
  it('spends brass once without reducing score; gate respects suit and compatibility', () => {
    expect(factoryReduce(newFactory(), { type: 'buy' }).error).toBeTruthy();
    let s = go(opening(), { type: 'buy' });
    expect(s.score).toBe(125);
    expect(s.brass).toBe(85);
    expect(factoryReduce(s, { type: 'buy' }).error).toBeTruthy();
    const head = s.supply[s.cursor]!;
    s = go(s, {
      type: 'gate',
      target: 'pair',
      suit: head.kind[0] === 's' ? 'p' : 's',
      enabled: true,
    });
    expect(canAuto(s)).toBe(false);
    expect(factoryReduce(s, { type: 'step' }).state).toBe(s);
    s = go(s, { type: 'gate', target: 'pair', suit: 'both', enabled: true });
    expect(canAuto(s)).toBe(true);
    const cursor = s.cursor;
    s = go(s, { type: 'step' });
    expect(s.cursor).toBe(cursor + 1);
    expect(canAuto(go(s, { type: 'gate', target: 'pair', suit: 'both', enabled: false }))).toBe(
      false,
    );
    conserve(s);
  });
  it('recycles without score and allows completion only when the crate is empty', () => {
    let s = newFactory();
    expect(factoryReduce(s, { type: 'finish' }).error).toBeTruthy();
    while (s.cursor < s.supply.length)
      s = go(s, { type: 'recycle', source: s.supply[s.cursor]!.id });
    expect(s.score).toBe(0);
    expect(s.brass).toBe(68);
    s = go(s, { type: 'finish' });
    expect(s.finished).toBe(true);
    expect(factoryReduce(s, { type: 'buy' }).error).toBeTruthy();
    conserve(s);
  });
  it('grants the order bonus exactly once', () => {
    let s = newFactory();
    s.supply = tiles('s1', 's2', 's3', 'p2', 'p3', 'p4', 's4', 's5', 's6');
    for (let source = 0; source < 9; source++) s = go(s, { type: 'route', source, machine: 'run' });
    expect(s.score).toBe(240);
    expect(s.brass).toBe(210);
    expect(s.orderDone).toBe(true);
    conserve(s);
  });
  it('finishes 100 seeded crates, conserves tiles after every action, and replays exactly', () => {
    for (let seed = 0; seed < 100; seed++) {
      let s = newFactory(seed);
      const actions: FactoryAction[] = [];
      for (let i = 0; i < 200 && !s.finished; i++) {
        const action = factoryAdvice(s);
        actions.push(action);
        s = go(s, action);
        conserve(s);
      }
      expect(s.finished).toBe(true);
      let replay = newFactory(seed);
      for (const a of JSON.parse(JSON.stringify(actions)) as FactoryAction[])
        replay = go(replay, a);
      expect(replay).toEqual(s);
    }
  });
});
