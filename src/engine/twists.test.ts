import { describe, expect, it } from 'vitest';
import { HOSTS, hostFor } from '@/content/hosts';
import { newRun, runReduce } from './run';
import { type RoundState, preview, roundReduce, startRound } from './round';
import { roundWith } from './testkit';
import { buildTiles } from './tiles';
import { viewStack } from './wall';

const twist = (id: string) =>
  HOSTS.find((h) => h.id === id)?.twist as NonNullable<(typeof HOSTS)[number]['twist']>;
const kinds = (s: RoundState, ...ks: string[]) => {
  const used = new Set<number>();
  return ks.map((k) => {
    const t = s.hand.find((x) => x.kind === k && !used.has(x.id));
    used.add(t?.id as number);
    return t?.id as number;
  });
};
const play = (s: RoundState, ...ks: string[]) =>
  roundReduce(s, { type: 'play', ids: kinds(s, ...ks) });
const illegal = (r: { events: { type: string }[] }) => r.events[0]?.type === 'illegal';

describe('hosts', () => {
  it('has a calm and a storm twist for each wind tile', () => {
    expect(HOSTS).toHaveLength(8);
    for (let w = 0; w < 4; w++) {
      expect(hostFor(w, false).tile).toBe(`w${w + 1}`);
      expect(hostFor(w, true).tile).toBe(`w${w + 1}`);
    }
    expect(HOSTS.map((h) => h.id)).toEqual([
      'fox',
      'azureDragon',
      'monkey',
      'vermilionBird',
      'rabbit',
      'whiteTiger',
      'kitchenGod',
      'blackTortoise',
    ]);
  });
  it('starts a round with the chosen twist, and the storm raises the target', () => {
    let run = newRun({ seed: 't1' });
    run = runReduce(run, { type: 'chooseHost', storm: true }).state;
    expect(run.round?.twist?.twist.id).toBe('coil');
    expect(run.hostId).toBe('azureDragon');
    expect(run.target).toBe(1500);
    const calm = runReduce(newRun({ seed: 't1' }), { type: 'chooseHost', storm: false }).state;
    expect(calm.round?.twist?.twist.id).toBe('masked');
  });
  it('survives a save round-trip with its twist', () => {
    const run = runReduce(newRun({ seed: 't2' }), { type: 'chooseHost', storm: true }).state;
    expect(JSON.parse(JSON.stringify(run))).toEqual(run);
  });
});

describe('Masked (fox)', () => {
  it('hides the tile under each stack top', () => {
    const s = startRound({
      tiles: buildTiles('boneBamboo'),
      rules: roundWith().rules,
      dragons: [],
      levels: {},
      target: 0,
      twist: twist('fox'),
      rng: 4,
    });
    expect(s.rules.peek).toBe(0);
    expect(viewStack(s.stacks[0] ?? [], s.rules.peek).under).toEqual([]);
  });
  it('gives +2 mult to each played tile that was not a stack top at the deal', () => {
    let s = roundWith({ hand: 'p1 p2 p3 s4 s5 s6', rules: { handSize: 6 }, twist: twist('fox') });
    const topId = s.hand[0]?.id as number;
    s = { ...s, twist: { ...(s.twist as NonNullable<typeof s.twist>), tops: [topId] } };
    const r = play(s, 'p1', 'p2', 'p3');
    // 5 chips... chow 10+6 chips; mult 1 + 2 blind tiles x2 = 5
    expect(r.state.table).toHaveLength(1);
    expect(preview(r.state).now.mult).toBe(1 + 2 * 2);
  });
});

describe('The coil (azure dragon)', () => {
  it('locks a stack until a chow is played, and doubles chow chips', () => {
    let s = roundWith({
      hand: 'p1 p2 p3 s4',
      stacks: ['m1 m2', 'm3 m4'],
      rules: { handSize: 4 },
      twist: twist('azureDragon'),
      twistState: { locked: [1] },
    });
    expect(illegal(roundReduce(s, { type: 'take', stack: 1 }))).toBe(true);
    s = roundWith({
      hand: 'p1 p2 p3 s4 s9',
      stacks: ['m1 m2', 'm3 m4'],
      rules: { handSize: 5 },
      twist: twist('azureDragon'),
      twistState: { locked: [1] },
    });
    const r = play(s, 'p1', 'p2', 'p3');
    expect(r.state.twist?.locked).toEqual([]);
    expect(illegal(roundReduce(r.state, { type: 'take', stack: 1 }))).toBe(false);
    // chow: (10 + 6) x2 chips, mult 1
    expect(preview(r.state).now.total).toBe(32);
  });
  it('does not unlock for a pair', () => {
    const s = roundWith({
      hand: 'p1 p1 s4',
      stacks: ['m1 m2', 'm3 m4'],
      rules: { handSize: 3 },
      twist: twist('azureDragon'),
      twistState: { locked: [0] },
    });
    expect(play(s, 'p1', 'p1').state.twist?.locked).toEqual([0]);
  });
});

describe('Swaps (monkey)', () => {
  it('swaps two stack tops after every 2nd play', () => {
    let s = roundWith({
      hand: 'p1 p1 s2 s2 m3 m3',
      stacks: ['m1', 'm2', 'm4', 'm5'],
      rules: { handSize: 2 },
      twist: twist('monkey'),
    });
    const before = s.stacks.map((st) => st[st.length - 1]?.id);
    let r = play(s, 'p1', 'p1');
    expect(r.events.some((e) => e.type === 'swap')).toBe(false);
    s = { ...r.state, hand: [...r.state.hand] };
    r = play(s, 's2', 's2');
    const swap = r.events.find((e) => e.type === 'swap');
    expect(swap).toMatchObject({ type: 'swap', auto: true });
    const after = r.state.stacks.map((st) => st[st.length - 1]?.id);
    expect(after).not.toEqual(before);
    expect([...after].sort()).toEqual([...before].sort());
  });
  it('lets the player swap two tops once a round', () => {
    const s = roundWith({
      hand: 'p1',
      stacks: ['m1', 'm2', 'm4'],
      rules: { handSize: 1 },
      twist: twist('monkey'),
    });
    const a = s.stacks[0]?.[0]?.id;
    const r = roundReduce(s, { type: 'swap', a: 0, b: 2 });
    expect(r.state.stacks[2]?.[0]?.id).toBe(a);
    expect(r.state.twist?.swapsLeft).toBe(0);
    expect(illegal(roundReduce(r.state, { type: 'swap', a: 0, b: 1 }))).toBe(true);
    expect(illegal(roundReduce(s, { type: 'swap', a: 1, b: 1 }))).toBe(true);
  });
  it('is not allowed in other winds', () => {
    const s = roundWith({ hand: 'p1', stacks: ['m1', 'm2'], rules: { handSize: 1 } });
    expect(illegal(roundReduce(s, { type: 'swap', a: 0, b: 1 }))).toBe(true);
  });
});

describe('Embers (vermilion bird)', () => {
  it('sets 3 wall tiles burning', () => {
    const s = startRound({
      tiles: buildTiles('boneBamboo'),
      rules: roundWith().rules,
      dragons: [],
      levels: {},
      target: 0,
      twist: twist('vermilionBird'),
      rng: 9,
    });
    expect(s.twist?.burning).toHaveLength(3);
  });
  it('gives +3 mult to a played burning tile', () => {
    let s = roundWith({ hand: 'p1 p2 p3', rules: { handSize: 3 }, twist: twist('vermilionBird') });
    s = {
      ...s,
      twist: { ...(s.twist as NonNullable<typeof s.twist>), burning: [s.hand[0]?.id as number] },
    };
    const r = play(s, 'p1', 'p2', 'p3');
    expect(preview(r.state).now.mult).toBe(1 + 3);
  });
  it('burns away a tile that sits on a stack top for 2 turns', () => {
    let s = roundWith({
      hand: 'p1 p1 s2 s2 m3 m3 m4 m4',
      stacks: ['m1 m2', 'm5'],
      rules: { handSize: 2 },
      twist: twist('vermilionBird'),
    });
    const burningId = s.stacks[0]?.[1]?.id as number;
    s = { ...s, twist: { ...(s.twist as NonNullable<typeof s.twist>), burning: [burningId] } };
    const r1 = play(s, 'p1', 'p1');
    expect(r1.state.twist?.burning).toEqual([burningId]);
    expect(r1.events.some((e) => e.type === 'burn')).toBe(false);
    const r2 = play({ ...r1.state }, 's2', 's2');
    expect(r2.events.some((e) => e.type === 'burn')).toBe(true);
    expect(r2.state.twist?.burning).toEqual([]);
    expect(r2.state.stacks[0]?.map((t) => t.id)).not.toContain(burningId);
  });
});

describe('Moon tide (rabbit)', () => {
  it('adds 1 to the hand size and sends discards to the bottom of a stack', () => {
    const s = startRound({
      tiles: buildTiles('boneBamboo'),
      rules: roundWith().rules,
      dragons: [],
      levels: {},
      target: 0,
      twist: twist('rabbit'),
      rng: 3,
    });
    expect(s.rules.handSize).toBe(9);
    let r = roundWith({
      hand: 'p1 p5 s9',
      stacks: ['m1', 'm2'],
      rules: { handSize: 3 },
      twist: twist('rabbit'),
    });
    r = { ...r, rules: { ...r.rules, handSize: 3 } };
    const wall = r.stacks.flat().length;
    const d = roundReduce(r, { type: 'discard', ids: kinds(r, 'p1', 's9') });
    expect(d.state.discarded).toHaveLength(0);
    expect(d.state.stacks.flat()).toHaveLength(wall + 2);
    expect(d.events.filter((e) => e.type === 'tide')).toHaveLength(2);
  });
});

describe('Claws (white tiger)', () => {
  it('doubles pong and kong chips and halves chow chips', () => {
    const s = roundWith({
      hand: 'p5 p5 p5 s1 s2 s3',
      rules: { handSize: 6 },
      twist: twist('whiteTiger'),
    });
    const pong = play(s, 'p5', 'p5', 'p5');
    expect(preview(pong.state).now.total).toBe((40 + 15) * 2 * 4);
    const chow = play(s, 's1', 's2', 's3');
    expect(preview(chow.state).now.total).toBe((16 / 2) * 1);
  });
});

describe('The report (kitchen god)', () => {
  it('costs 25 points per discard at the end and doubles the mult for none', () => {
    const base = roundWith({
      hand: 'p5 p5 p5 s9 s8',
      rules: { handSize: 5 },
      twist: twist('kitchenGod'),
    });
    const none = play(base, 'p5', 'p5', 'p5');
    expect(preview(none.state).now.total).toBe(55 * 4 * 2);
    const d = roundReduce(base, { type: 'discard', ids: kinds(base, 's9') });
    const after = play({ ...d.state, hand: d.state.hand }, 'p5', 'p5', 'p5');
    expect(preview(after.state).now.total).toBe(55 * 4 - 25);
  });
});

describe('The shell (black tortoise)', () => {
  it('deals 6 stacks', () => {
    const s = startRound({
      tiles: buildTiles('boneBamboo'),
      rules: roundWith().rules,
      dragons: [],
      levels: {},
      target: 0,
      twist: twist('blackTortoise'),
      rng: 5,
    });
    expect(s.stacks).toHaveLength(6);
    expect(s.twist?.armour).toBe(true);
    expect(s.twist?.tops).toHaveLength(6);
  });
  it('keeps armoured tiles in hand until a pong or kong is played; kongs +4 mult', () => {
    let s = roundWith({
      hand: 'p1 p2 s9 m9 p5 p5 p5 p5',
      rules: { handSize: 8 },
      twist: twist('blackTortoise'),
    });
    const armouredId = s.hand[2]?.id as number;
    s = { ...s, twist: { ...(s.twist as NonNullable<typeof s.twist>), tops: [armouredId] } };
    expect(illegal(roundReduce(s, { type: 'discard', ids: [armouredId] }))).toBe(true);
    const free = s.hand[0]?.id as number;
    expect(illegal(roundReduce(s, { type: 'discard', ids: [free] }))).toBe(false);
    const kong = play(s, 'p5', 'p5', 'p5', 'p5');
    expect(kong.state.twist?.armour).toBe(false);
    expect(
      illegal(
        roundReduce(
          { ...kong.state, hand: kong.state.hand },
          { type: 'discard', ids: [armouredId] },
        ),
      ),
    ).toBe(false);
    expect(preview(kong.state).now.mult).toBe(8 + 4);
  });
});
