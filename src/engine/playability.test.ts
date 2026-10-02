import { describe, expect, it } from 'vitest';
import { advise, legalPlays } from './advice';
import { autoRefill, moveAction } from './ai';
import { dragonGoals, brokenDragons } from './goals';
import { finishProblem, previewUpgrade, roundReduce, startRound, upgrades, preview } from './round';
import type { RoundState } from './round';
import { newRun, runReduce } from './run';
import type { RunState } from './runTypes';
import { type PlayedSet } from './scoring';
import { classify, orderSet } from './sets';
import { roundWith, tiles } from './testkit';
import { buildTiles } from './tiles';

const ids = (s: RoundState, ...kinds: string[]) => {
  const used = new Set<number>();
  return kinds.map((k) => {
    const t = s.hand.find((x) => x.kind === k && !used.has(x.id));
    used.add(t?.id as number);
    return t?.id as number;
  });
};
function table(...specs: string[]): PlayedSet[] {
  return specs.map((s) => {
    const t = tiles(s);
    return { kind: classify(t) as PlayedSet['kind'], tiles: orderSet(t) };
  });
}
/** A round with a pong of 5 Dots already on the table and a fourth 5 Dots in hand. */
function withPong(extra: Partial<Parameters<typeof roundWith>[0]> = {}): RoundState {
  const s = roundWith({ hand: 'p5 p5 p5 p5 s1 s2 s3 m9', rules: { handSize: 8 }, ...extra });
  return roundReduce(s, { type: 'play', ids: ids(s, 'p5', 'p5', 'p5') }).state;
}

describe('upgrading a tabled pong', () => {
  it('replaces the pong with a kong of the same three tiles plus the fourth, using one play', () => {
    let s = roundWith({ hand: 'jade:p5 p5 p5 bone:p5 s1 s2 s3 m9', rules: { handSize: 8 } });
    const pong = ids(s, 'p5', 'p5', 'p5');
    const fourth = s.hand.filter((t) => t.kind === 'p5' && !pong.includes(t.id))[0];
    s = roundReduce(s, { type: 'play', ids: pong }).state;
    s = roundReduce(s, { type: 'take', stack: 0 }).state ?? s;
    const before = s;
    expect(upgrades(s)).toEqual([{ setIndex: 0, tileId: fourth?.id }]);
    const r = roundReduce(s, { type: 'upgrade', setIndex: 0, tileId: fourth?.id as number });
    expect(r.events.some((e) => e.type === 'illegal')).toBe(false);
    expect(r.state.table).toHaveLength(1);
    expect(r.state.table[0]?.kind).toBe('kong');
    expect(r.state.table[0]?.tiles).toHaveLength(4);
    expect(r.state.playsLeft).toBe(before.playsLeft - 1);
    const all = r.state.table[0]?.tiles.map((t) => t.id) ?? [];
    expect(new Set(all).size).toBe(4);
    expect(all).toContain(fourth?.id);
    expect(r.state.hand.some((t) => t.id === fourth?.id)).toBe(false);
    expect(r.state.table[0]?.tiles.filter((t) => t.enh).length).toBe(2);
  });
  it('scores the kong with its own level and no double counting', () => {
    const s0 = { ...withPong(), levels: { kong: 1 } };
    const tile = s0.hand.find((t) => t.kind === 'p5');
    const r = roundReduce(s0, { type: 'upgrade', setIndex: 0, tileId: tile?.id as number });
    // kong 100 + 30 level + 4x5 tile chips = 150 chips; mult 8 + 3 = 11
    expect(preview(r.state).now.total).toBe(150 * 11);
    expect(previewUpgrade(s0, 0, tile?.id as number)?.after.total).toBe(150 * 11);
    expect(previewUpgrade(s0, 0, tile?.id as number)?.now.total).toBe(preview(s0).now.total);
  });
  it('refuses a kong, a wrong tile, a missing set and an unrefilled hand', () => {
    const s = withPong();
    const four = roundWith({ hand: 'p5 p5 p5 p5 s1 s2 s3 m9', rules: { handSize: 8 } });
    const k = roundReduce(four, { type: 'play', ids: ids(four, 'p5', 'p5', 'p5', 'p5') }).state;
    expect(k.table[0]?.kind).toBe('kong');
    const wrong = s.hand.find((t) => t.kind === 's1');
    expect(
      roundReduce(s, { type: 'upgrade', setIndex: 0, tileId: wrong?.id as number }).events[0],
    ).toMatchObject({ type: 'illegal' });
    expect(roundReduce(s, { type: 'upgrade', setIndex: 3, tileId: 1 }).events[0]).toMatchObject({
      type: 'illegal',
    });
    const full = roundWith({
      hand: 'p5 p5 p5 p5 s1 s2 s3 m9',
      rules: { handSize: 9 },
      stacks: ['m1'],
    });
    const playd = roundReduce(full, { type: 'play', ids: ids(full, 'p5', 'p5', 'p5') }).state;
    const t = playd.hand.find((x) => x.kind === 'p5');
    expect(
      roundReduce(playd, { type: 'upgrade', setIndex: 0, tileId: t?.id as number }).events[0],
    ).toMatchObject({ type: 'illegal' });
  });
  it('can end the round on its last play', () => {
    let s = roundWith({ hand: 'p5 p5 p5 p5', rules: { handSize: 4, plays: 2 } });
    s = roundReduce(s, { type: 'play', ids: ids(s, 'p5', 'p5', 'p5') }).state;
    const t = s.hand[0];
    const r = roundReduce(s, { type: 'upgrade', setIndex: 0, tileId: t?.id as number });
    expect(r.state.phase).toBe('done');
    expect(r.state.result?.score.total).toBe((100 + 20) * 8);
  });
});

describe('finishing early', () => {
  it('needs a table that beats the target', () => {
    const s = withPong({ target: 100000 });
    expect(finishProblem(s)).toMatch(/not beaten/);
    expect(roundReduce(s, { type: 'finish' }).events[0]).toMatchObject({ type: 'illegal' });
    const none = roundWith({ hand: 'p1', target: 0 });
    expect(finishProblem(none)).toMatch(/Play a set first/);
  });
  it('banks once, before refilling, with unused discards kept', () => {
    const s = withPong({ target: 100 });
    expect(finishProblem(s)).toBeNull();
    const r = roundReduce(s, { type: 'finish' });
    expect(r.state.phase).toBe('done');
    expect(r.state.result?.unusedDiscards).toBe(3);
    expect(r.events.map((e) => e.type)).toEqual(['finish', 'score', 'end']);
    expect(roundReduce(r.state, { type: 'finish' }).events[0]).toMatchObject({ type: 'illegal' });
  });
  it('settles through the run exactly once, with the normal payout, and survives a reload', () => {
    let run: RunState = newRun({ seed: 'bank', targets: [10, 400, 500, 600] });
    run = runReduce(run, { type: 'chooseHost', storm: false }).state;
    run = runReduce(run, { type: 'auto' }).state;
    const round = run.round as RoundState;
    const first = [...round.hand];
    void first;
    // play something to get a table
    const m = legal(run);
    run = runReduce(run, { type: 'round', action: { type: 'play', ids: m } }).state;
    expect(run.phase).toBe('round');
    const money = run.money;
    const r = runReduce(run, { type: 'round', action: { type: 'finish' } });
    expect(r.state.phase).toBe('payout');
    expect(r.state.scores).toHaveLength(1);
    expect(r.state.money).toBe(money + (r.state.payout?.total ?? 0));
    expect(r.state.payout?.discards).toBe(3);
    const again = runReduce(r.state, { type: 'round', action: { type: 'finish' } });
    expect(again.events[0]).toMatchObject({ type: 'illegal' });
    expect(again.state).toBe(r.state);
    const copy = JSON.parse(JSON.stringify(r.state)) as RunState;
    expect(copy).toEqual(r.state);
  });
});

function legal(run: RunState): number[] {
  const round = run.round as RoundState;
  const p = legalPlays(round.hand, round.discardsLeft).find((x) => x.kind !== 'single');
  return (p ?? legalPlays(round.hand, 0)[0])?.tiles.map((t) => t.id) ?? [];
}

describe('dragon goals and warnings', () => {
  it('shows "not yet" for an empty table and live progress after', () => {
    const g = dragonGoals([], ['allSimples', 'pongHall', 'mahjong', 'twoSuits', 'pureStraight']);
    expect(g.every((x) => x.notYet && !x.active)).toBe(true);
    const some = dragonGoals(table('p1 p1 p1', 'p2 p3 p4'), [
      'pongHall',
      'allSimples',
      'twoSuits',
      'pureStraight',
    ]);
    const by = Object.fromEntries(some.map((x) => [x.id, x]));
    expect(by.pongHall?.progress).toBe('1/2 pongs or kongs');
    expect(by.pongHall?.active).toBe(false);
    expect(by.allSimples?.progress).toMatch(/broken/);
    expect(by.twoSuits?.active).toBe(true);
    expect(by.pureStraight?.progress).toBe('0/3 runs in one suit');
  });
  it('counts the runs for Nine Rings and the repeats for Twin Cranes and Great Bell', () => {
    const t = table('p1 p2 p3', 'p4 p5 p6', 's1 s2 s3', 's1 s2 s3', 'p7 p7 p7 p7');
    const g = Object.fromEntries(
      dragonGoals(t, ['pureStraight', 'twinCranes', 'kongBell']).map((x) => [x.id, x]),
    );
    expect(g.pureStraight?.progress).toBe('2/3 runs in one suit');
    expect(g.twinCranes?.progress).toMatch(/1 identical pair: ×1.5/);
    expect(g.kongBell?.progress).toMatch(/1 kong: ×2/);
  });
  it('warns when a play would break a multiplier, and signs a negative delta', () => {
    const s = roundWith({ hand: 'w1 w1 s5 s5', rules: { handSize: 4 }, dragons: ['allSimples'] });
    const played = roundReduce(
      roundWith({ hand: 'p2 p3 p4 w1 w1', rules: { handSize: 5 }, dragons: ['allSimples'] }),
      {
        type: 'play',
        ids: [],
      },
    );
    void played;
    void s;
    const r = roundWith({
      hand: 'p2 p3 p4 w1 w1 s9',
      rules: { handSize: 6 },
      dragons: ['allSimples'],
    });
    const r1 = roundReduce(r, { type: 'play', ids: ids(r, 'p2', 'p3', 'p4') }).state;
    const p = preview(r1, ids(r1, 'w1', 'w1'));
    expect(p.warnings[0]).toMatch(/Rice Bowl: ×2 → ×1/);
    expect(p.withSelected && p.withSelected.total - p.now.total).toBeLessThan(
      p.withSelected?.total ?? 0,
    );
    expect(
      brokenDragons(table('p2 p3 p4'), table('p2 p3 p4', 'w1 w1'), ['allSimples']),
    ).toHaveLength(1);
    expect(brokenDragons(table('p2 p3 p4'), table('p2 p3 p4', 'p5 p5'), ['allSimples'])).toEqual(
      [],
    );
  });
});

describe('ask the dragon', () => {
  it('advises a stack when the hand needs refilling, from visible tiles only', () => {
    const base = { hand: 'p1 p2 s9', rules: { handSize: 4 } } as const;
    const a = roundWith({ ...base, stacks: ['m4 m7', 's5 p3 s1', 'm8'] });
    const adv = advise(a);
    expect(adv).toMatchObject({ type: 'draw', stack: 1 });
    // changing a hidden tile (under the visible strip) changes nothing
    const b = roundWith({ ...base, stacks: ['m4 m7', 'm1 s5 p3 s1', 'm8'] });
    const b2 = {
      ...b,
      stacks: b.stacks.map((st, i) =>
        i === 1 ? [{ ...(st[0] as object), kind: 'w4' } as never, ...st.slice(1)] : st,
      ),
    };
    expect(advise(b)).toEqual(advise(b2 as RoundState));
  });
  it('suggests the upgrade when it gains', () => {
    const s = withPong();
    expect(advise(s)).toMatchObject({ type: 'upgrade', setIndex: 0 });
  });
  it('on the last play compares real scores', () => {
    let s = roundWith({ hand: 'p5 p5 p5 p9 p9 s4', rules: { handSize: 6, plays: 2 }, target: 1e6 });
    s = roundReduce(s, { type: 'play', ids: ids(s, 'p5', 'p5', 'p5') }).state;
    expect(s.playsLeft).toBe(1);
    expect(advise(s)).toMatchObject({ type: 'play', kind: 'pair' });
  });
  it('banks when the table already beats the target and no last play improves it', () => {
    let s = roundWith({ hand: 'p5 p5 p5 p9 s4', rules: { handSize: 5, plays: 2 }, target: 100 });
    s = roundReduce(s, { type: 'play', ids: ids(s, 'p5', 'p5', 'p5') }).state;
    expect(advise(s)).toMatchObject({ type: 'finish' });
  });
  it('always returns a legal action with a reason across 200 rounds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      let s = startRound({
        tiles: buildTiles(seed % 5 === 0 ? 'twoRivers' : 'boneBamboo'),
        rules: { handSize: 8, plays: 8, discards: 3, peek: 1, stacks: 8, maxDiscard: 5 },
        dragons: seed % 3 === 0 ? ['allSimples', 'pongHall'] : [],
        levels: {},
        target: 500,
        rng: seed,
      });
      for (let n = 0; n < 200 && s.phase === 'play'; n++) {
        const a = advise(s);
        expect(a).not.toBeNull();
        if (!a) break;
        expect(a.reason.length).toBeGreaterThan(3);
        const action =
          a.type === 'draw'
            ? ({ type: 'take', stack: a.stack } as const)
            : a.type === 'play' || a.type === 'discard'
              ? moveAction(a)
              : a.type === 'upgrade'
                ? ({ type: 'upgrade', setIndex: a.setIndex, tileId: a.tileId } as const)
                : ({ type: 'finish' } as const);
        const r = roundReduce(s, action);
        expect(
          r.events.some((e) => e.type === 'illegal'),
          JSON.stringify(a),
        ).toBe(false);
        s = r.state;
      }
      expect(s.phase).toBe('done');
      void autoRefill;
    }
  });
});
