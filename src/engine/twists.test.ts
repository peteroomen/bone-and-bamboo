import { describe, expect, it } from 'vitest';
import { HOSTS, hostFor } from '@/content/hosts';
import { newRun, runReduce } from './run';
import { type RoundState, preview, roundReduce, startRound } from './round';
import { roundWith } from './testkit';
import { buildTiles } from './tiles';

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
  it('shrinks the hand by 1', () => {
    const s = startRound({
      tiles: buildTiles('boneBamboo'),
      rules: roundWith().rules,
      dragons: [],
      levels: {},
      target: 0,
      twist: twist('fox'),
      rng: 4,
    });
    expect(s.rules.handSize).toBe(11);
    expect(s.hand).toHaveLength(11);
  });
  it('gives +1 mult to each set of 3 or more tiles, not to a pair', () => {
    const s = roundWith({ hand: 'p1 p2 p3 s4 s4', rules: { handSize: 5 }, twist: twist('fox') });
    expect(preview(play(s, 'p1', 'p2', 'p3').state).now.mult).toBe(1 + 1);
    expect(preview(play(s, 's4', 's4').state).now.mult).toBe(1);
  });
});

describe('The coil (azure dragon)', () => {
  it('blocks discarding until a chow is played, and doubles chow chips', () => {
    const s = roundWith({
      hand: 'p1 p2 p3 s4 s9',
      stacks: ['m1 m2 m3'],
      rules: { handSize: 5 },
      twist: twist('azureDragon'),
    });
    expect(illegal(roundReduce(s, { type: 'discard', ids: kinds(s, 's9') }))).toBe(true);
    const r = play(s, 'p1', 'p2', 'p3');
    expect(r.state.twist?.uncoiled).toBe(true);
    expect(illegal(roundReduce(r.state, { type: 'discard', ids: kinds(r.state, 's9') }))).toBe(
      false,
    );
    // chow: (10 + 6) x2 chips, mult 1
    expect(preview(r.state).now.total).toBe(32);
  });
  it('does not uncoil for a pair', () => {
    const s = roundWith({ hand: 'p1 p1 s4', rules: { handSize: 3 }, twist: twist('azureDragon') });
    expect(play(s, 'p1', 'p1').state.twist?.uncoiled).toBe(false);
  });
  it('lets a single be played when no set is held and discarding is blocked', () => {
    const s = roundWith({ hand: 'p1 p4 s7', rules: { handSize: 3 }, twist: twist('azureDragon') });
    expect(illegal(roundReduce(s, { type: 'play', ids: kinds(s, 'p1') }))).toBe(false);
  });
});

describe('Swaps (monkey)', () => {
  it('swaps a random hand tile back into the pile after every 2nd play', () => {
    let s = roundWith({
      hand: 'p1 p1 s2 s2 m3',
      stacks: ['m5 m6 m7 m8 m9'],
      rules: { handSize: 5 },
      twist: twist('monkey'),
    });
    let r = play(s, 'p1', 'p1');
    expect(r.events.some((e) => e.type === 'swap')).toBe(false);
    s = r.state;
    const pile = s.stacks[0]?.length ?? 0;
    r = play(s, 's2', 's2');
    expect(r.events.find((e) => e.type === 'swap')).toMatchObject({ type: 'swap', auto: true });
    expect(r.state.hand).toHaveLength(5);
    // two drawn for the pair, one put back and one drawn for the swap
    expect(r.state.stacks[0]).toHaveLength(pile - 2);
  });
  it('lets the player swap one tile of their choice once a round', () => {
    const s = roundWith({
      hand: 'p1 s9',
      stacks: ['m1 m2 m3'],
      rules: { handSize: 2 },
      twist: twist('monkey'),
    });
    const id = kinds(s, 's9')[0] as number;
    const r = roundReduce(s, { type: 'swap', id });
    expect(r.state.hand.map((t) => t.id)).not.toContain(id);
    expect(r.state.hand).toHaveLength(2);
    expect(r.state.stacks[0]?.map((t) => t.id)).toContain(id);
    expect(r.state.twist?.swapsLeft).toBe(0);
    expect(illegal(roundReduce(r.state, { type: 'swap', id: r.state.hand[0]?.id as number }))).toBe(
      true,
    );
  });
  it('is not allowed in other winds', () => {
    const s = roundWith({ hand: 'p1', stacks: ['m1'], rules: { handSize: 1 } });
    expect(illegal(roundReduce(s, { type: 'swap', id: s.hand[0]?.id as number }))).toBe(true);
  });
});

describe('Embers (vermilion bird)', () => {
  it('sets 4 tiles burning', () => {
    const s = startRound({
      tiles: buildTiles('boneBamboo'),
      rules: roundWith().rules,
      dragons: [],
      levels: {},
      target: 0,
      twist: twist('vermilionBird'),
      rng: 9,
    });
    expect(s.twist?.burning).toHaveLength(4);
  });
  it('gives +4 mult to a played burning tile', () => {
    let s = roundWith({ hand: 'p1 p2 p3', rules: { handSize: 3 }, twist: twist('vermilionBird') });
    s = {
      ...s,
      twist: { ...(s.twist as NonNullable<typeof s.twist>), burning: [s.hand[0]?.id as number] },
    };
    const r = play(s, 'p1', 'p2', 'p3');
    expect(preview(r.state).now.mult).toBe(1 + 4);
  });
  it('burns away a tile held in the hand for 2 turns', () => {
    let s = roundWith({
      hand: 'p1 p1 s2 s2 m9',
      stacks: ['m1 m2 m3 m4 m5'],
      rules: { handSize: 5 },
      twist: twist('vermilionBird'),
    });
    const burningId = kinds(s, 'm9')[0] as number;
    s = { ...s, twist: { ...(s.twist as NonNullable<typeof s.twist>), burning: [burningId] } };
    const r1 = play(s, 'p1', 'p1');
    expect(r1.events.some((e) => e.type === 'burn')).toBe(false);
    const r2 = play(r1.state, 's2', 's2');
    expect(r2.events.some((e) => e.type === 'burn')).toBe(true);
    expect(r2.state.twist?.burning).toEqual([]);
    expect(r2.state.hand.map((t) => t.id)).not.toContain(burningId);
    expect(r2.state.hand).toHaveLength(5);
  });
});

describe('Moon tide (rabbit)', () => {
  it('adds 1 to the hand size and shuffles discards back into the pile', () => {
    const s = startRound({
      tiles: buildTiles('boneBamboo'),
      rules: roundWith().rules,
      dragons: [],
      levels: {},
      target: 0,
      twist: twist('rabbit'),
      rng: 3,
    });
    expect(s.rules.handSize).toBe(13);
    let r = roundWith({
      hand: 'p1 p5 s9',
      stacks: ['m1 m2'],
      rules: { handSize: 3 },
      twist: twist('rabbit'),
    });
    r = { ...r, rules: { ...r.rules, handSize: 3 } };
    const d = roundReduce(r, { type: 'discard', ids: kinds(r, 'p1', 's9') });
    expect(d.state.discarded).toHaveLength(0);
    expect(d.state.hand).toHaveLength(3);
    // 2 went back in, 2 were drawn
    expect(d.state.stacks[0]).toHaveLength(2);
    expect(d.events.filter((e) => e.type === 'tide')).toHaveLength(2);
  });
});

describe('Claws (white tiger)', () => {
  it('doubles pong and kong chips and leaves chows alone', () => {
    const s = roundWith({
      hand: 'p5 p5 p5 s1 s2 s3',
      rules: { handSize: 6 },
      twist: twist('whiteTiger'),
    });
    const pong = play(s, 'p5', 'p5', 'p5');
    expect(preview(pong.state).now.total).toBe((40 + 15) * 2 * 4);
    const chow = play(s, 's1', 's2', 's3');
    expect(preview(chow.state).now.total).toBe(16 * 1);
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
  it('armours the first hand', () => {
    const s = startRound({
      tiles: buildTiles('boneBamboo'),
      rules: roundWith().rules,
      dragons: [],
      levels: {},
      target: 0,
      twist: twist('blackTortoise'),
      rng: 5,
    });
    expect(s.twist?.armour).toBe(true);
    expect([...(s.twist?.tops ?? [])].sort()).toEqual(s.hand.map((t) => t.id).sort());
  });
  it('keeps armoured tiles in hand until any set is played; kongs +4 mult', () => {
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
  it('lifts the armour when any set is played, even a pair', () => {
    const s = roundWith({
      hand: 'p1 p1 s9',
      rules: { handSize: 3 },
      twist: twist('blackTortoise'),
    });
    expect(s.twist?.armour).toBe(true);
    expect(play(s, 'p1', 'p1').state.twist?.armour).toBe(false);
  });
});
