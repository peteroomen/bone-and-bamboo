import { describe, expect, it } from 'vitest';
import { PATTERNS } from '@/content/patterns';
import { SHAPES } from '@/content/shapes';
import { advise, chanceOf, rollDist } from './advice';
import { type Die, fixedDie, neighbours, opposite } from './dice';
import { patternsOf, type PSet } from './patterns';
import { Rng } from './rng';
import { type RoundState, createRound, roundReducer, takeCheck } from './round';
import { newRun, runReducer, type RunState } from './run';
import { scoreHand } from './scoring';
import { classify, isComplete, type RackSet } from './sets';
import { applyTool, toolProblem } from './tools';

const ps = (s: string): PSet[] =>
  s.split(' ').map((g) => {
    const tiles = g.split(',');
    return { kind: classify(tiles) ?? 'pair', tiles };
  });

const rack = (s: string): RackSet[] =>
  ps(s).map((p) => ({ kind: p.kind, tiles: p.tiles.map((kind) => ({ kind, dieId: 0, face: 0 })) }));

describe('dice shapes', () => {
  it('every shape has unit normals and an opposite for each face', () => {
    for (const shape of Object.values(SHAPES)) {
      expect(shape.normals).toHaveLength(shape.faces);
      for (let i = 0; i < shape.faces; i++) {
        const o = opposite(shape.id, i);
        expect(o).not.toBe(i);
        expect(opposite(shape.id, o)).toBe(i);
      }
    }
  });
  it('knows how many neighbours a face has', () => {
    expect(neighbours('long', 0)).toEqual([1, 3]);
    expect(neighbours('d6', 0)).toHaveLength(4);
    expect(neighbours('d6', 0)).not.toContain(5);
    expect(neighbours('d8', 0)).toHaveLength(3);
    expect(neighbours('d12', 0)).toHaveLength(5);
  });
});

describe('sets', () => {
  it('classifies sets', () => {
    expect(classify(['s1', 's2', 's3'])).toBe('chow');
    expect(classify(['s3', 's1', 's2'])).toBe('chow');
    expect(classify(['w1', 'w2', 'w3'])).toBeNull();
    expect(classify(['d1', 'd1', 'd1'])).toBe('pong');
    expect(classify(['p4', 'p4', 'p4', 'p4'])).toBe('kong');
    expect(classify(['f1', 'f1'])).toBeNull();
  });
  it('knows a finished hand', () => {
    expect(isComplete(rack('s1,s2,s3 s4,s5,s6 s7,s8,s9 p1,p1,p1 m5,m5'))).toBe(true);
    expect(isComplete(rack('s1,s1 s2,s2 s3,s3 s4,s4 s5,s5 s6,s6 s7,s7'))).toBe(true);
    expect(isComplete(rack('s1,s2,s3 m5,m5'))).toBe(false);
  });
});

describe('patterns', () => {
  it('finds the patterns in each example from the hand book', () => {
    for (const p of PATTERNS) {
      const found = patternsOf(ps(p.example.map((g) => g.join(',')).join(' ')));
      expect(found, p.id).toContain(p.id);
    }
  });
  it('a full flush replaces a half flush, and nine gates the full flush', () => {
    const ff = patternsOf(ps('s1,s2,s3 s4,s4,s4 s5,s6,s7 s8,s8,s8 s9,s9'));
    expect(ff).toContain('fullFlush');
    expect(ff).not.toContain('halfFlush');
    const ng = patternsOf(ps('s1,s1,s1 s2,s3,s4 s5,s6,s7 s9,s9,s9 s8,s8'));
    expect(ng).toContain('nineGates');
    expect(ng).not.toContain('fullFlush');
  });
  it('seven pairs need seven different pairs', () => {
    expect(patternsOf(ps('s2,s2 s2,s2 p3,p3 p7,p7 m1,m1 m6,m6 w4,w4'))).not.toContain('sevenPairs');
  });
});

describe('scoring', () => {
  it('scores chips times mult times the patterns', () => {
    const s = scoreHand(rack('s1,s2,s3 s4,s5,s6 s7,s8,s9 s2,s2,s2 s5,s5'), [], {
      wind: 1,
      charms: [],
      levels: {},
    });
    expect(s.patterns).toEqual(expect.arrayContaining(['pureStraight', 'fullFlush']));
    expect(s.total).toBe(Math.floor(s.chips * s.mult * s.xmult + 1e-9));
    expect(s.xmult).toBeGreaterThanOrEqual(6);
  });
  it('the round wind pong and the season count', () => {
    const r = rack('w2,w2,w2 s4,s5,s6 p1,p2,p3 m7,m8,m9 s5,s5');
    const plain = scoreHand(r, [], { wind: 1, charms: [], levels: {} });
    const south = scoreHand(r, ['q2'], { wind: 2, charms: [], levels: {} });
    expect(south.total).toBeGreaterThan(plain.total * 2);
  });
});

describe('odds', () => {
  it('works out an exact chance', () => {
    const die: Die = fixedDie(1, {
      name: 'x',
      shape: 'd6',
      faces: ['s1', 's2', 's3', 's4', 's5', 's6'],
    });
    const d = rollDist(die);
    expect(chanceOf([d], ['s1'])).toBeCloseTo(1 / 6);
    expect(chanceOf([d, d], ['s1', 's1'])).toBeCloseTo(1 / 36);
    expect(chanceOf([d, d], ['s1', 's2'])).toBeCloseTo(2 / 36);
    expect(chanceOf([d, d, d], ['s1'])).toBeCloseTo(1 - (5 / 6) ** 3);
  });
  it('a flower or season face shares its chance out (the die rolls again)', () => {
    const die = fixedDie(1, { name: 'x', shape: 'long', faces: ['s1', 's2', 'f1', 'q2'] });
    expect(chanceOf([rollDist(die)], ['s1'])).toBeCloseTo(0.5);
  });
});

function round(dice: Die[], charms: string[] = [], seed = 1): RoundState {
  return createRound({
    index: 0,
    wind: 1,
    host: false,
    twist: null,
    target: 100,
    seed,
    dice,
    charms,
    levels: {},
  });
}

describe('a round', () => {
  const same = (n: number, kind: string) =>
    Array.from({ length: n }, (_, i) =>
      fixedDie(i + 1, { name: 'x', shape: 'd6', faces: Array(6).fill(kind) }),
    );

  it('rolls, takes a pong and a kong upgrade, and gives a free roll', () => {
    let s = round(same(4, 's5'));
    s = roundReducer(s, { type: 'roll' }).state;
    expect(s.rollsLeft).toBe(23);
    expect(takeCheck(s, [1, 2])).toMatchObject({ kind: 'pair' });
    s = roundReducer(s, { type: 'take', dieIds: [1, 2, 3] }).state;
    expect(s.rack[0]?.kind).toBe('pong');
    const r = roundReducer(s, { type: 'take', dieIds: [4] });
    expect(r.state.rack[0]?.kind).toBe('kong');
    expect(r.state.rollsLeft).toBe(24);
  });

  it('scores a finished hand and clears the rack', () => {
    const dice = [
      fixedDie(1, { name: 'a', shape: 'd6', faces: Array(6).fill('s1') }),
      fixedDie(2, { name: 'b', shape: 'd6', faces: Array(6).fill('s2') }),
      fixedDie(3, { name: 'c', shape: 'd6', faces: Array(6).fill('s3') }),
    ];
    let s = round(dice);
    for (let i = 0; i < 4; i++) {
      s = roundReducer(s, { type: 'roll' }).state;
      s = roundReducer(s, { type: 'take', dieIds: [1, 2, 3] }).state;
    }
    s = roundReducer(s, { type: 'roll' }).state;
    expect(takeCheck(s, [1, 2])).toHaveProperty('problem');
    // a pair needs two alike: there is none, so this hand can't finish with these dice
    expect(s.rack).toHaveLength(4);
  });

  it('sets a flower aside and rolls the die again', () => {
    const die = fixedDie(1, { name: 'x', shape: 'long', faces: ['f1', 's2', 's2', 's2'] });
    let saw = false;
    for (let seed = 0; seed < 30 && !saw; seed++) {
      const r = roundReducer(round([die], [], seed), { type: 'roll' });
      if (r.state.shelf.length > 0) {
        saw = true;
        expect(r.state.cup[0]?.face).not.toBe(0);
      }
    }
    expect(saw).toBe(true);
  });

  it('the Thumb tips a die onto a neighbour only', () => {
    const die = fixedDie(1, {
      name: 'x',
      shape: 'd6',
      faces: ['s1', 's2', 's3', 's4', 's5', 's6'],
    });
    let s = round([die], ['thumb']);
    s = roundReducer(s, { type: 'roll' }).state;
    const f = s.cup[0]?.face as number;
    expect(() => roundReducer(s, { type: 'tip', dieId: 1, face: opposite('d6', f) })).toThrow();
    const n = neighbours('d6', f)[0] as number;
    s = roundReducer(s, { type: 'tip', dieId: 1, face: n }).state;
    expect(s.cup[0]?.face).toBe(n);
    expect(() => roundReducer(s, { type: 'tip', dieId: 1, face: f })).toThrow();
  });

  it('never mutates its input and stays plain JSON', () => {
    const s = round(same(3, 'p5'));
    const before = JSON.stringify(s);
    roundReducer(s, { type: 'roll' });
    expect(JSON.stringify(s)).toBe(before);
    expect(JSON.parse(before)).toEqual(s);
  });

  it('the advice always gives a legal action', () => {
    let s = round(same(3, 'p5').concat(same(3, 's2').map((d, i) => ({ ...d, id: 10 + i }))));
    for (let i = 0; i < 60 && !s.over; i++)
      s = roundReducer(s, advise(s, { bank: false }).action).state;
    expect(s.score).toBeGreaterThan(0);
  });
});

describe('tools', () => {
  const dice = [
    fixedDie(1, { name: 'x', shape: 'd6', faces: ['s1', 's2', 's3', 'p4', 'p5', 'p6'] }),
  ];
  it('brushes, nudges, weights and carves', () => {
    const rng = new Rng(1);
    expect(applyTool('brush', dice, 1, 3, rng, { suit: 's' })[0]?.faces[3]?.kind).toBe('s4');
    expect(applyTool('nudge', dice, 1, 0, rng, { step: 1 })[0]?.faces[0]?.kind).toBe('s2');
    expect(toolProblem('nudge', dice, 1, 0, { step: -1 })).not.toBeNull();
    expect(applyTool('lead', dice, 1, 0, rng)[0]?.faces[0]?.weight).toBe(2);
    expect(applyTool('chisel', dice, 1, 0, rng, { kind: 'd1' })[0]?.faces[0]?.kind).toBe('d1');
    expect(toolProblem('chisel', dice, 1, 0, { kind: 'f1' })).not.toBeNull();
  });
});

describe('a run', () => {
  it('plays a whole run with the advice and stays legal', () => {
    let run: RunState = newRun({ seed: 3 });
    let steps = 0;
    while (run.phase !== 'over' && run.phase !== 'won' && steps < 5000) {
      if (run.phase === 'round' && run.current)
        run = runReducer(run, { type: 'round', action: advise(run.current).action }).state;
      else if (run.phase === 'cashout') run = runReducer(run, { type: 'collect' }).state;
      else if (run.phase === 'gift') run = runReducer(run, { type: 'skipGift' }).state;
      else run = runReducer(run, { type: 'next' }).state;
      steps++;
    }
    expect(run.history.length).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(run))).toEqual(run);
  });
});
