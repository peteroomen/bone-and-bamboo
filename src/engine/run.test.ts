import { describe, expect, it } from 'vitest';
import { DRAGONS } from '@/content/dragons';
import { chooseMove, moveAction } from './ai';
import { newRun, roundRulesFor, runReduce, targetFor, interestFor } from './run';
import type { RunAction, RunState } from './runTypes';
import { sellPrice } from './shop';
import { countKinds } from './tiles';

function step(run: RunState, a: RunAction): RunState {
  const r = runReduce(run, a);
  const bad = r.events.find((e) => e.type === 'illegal');
  if (bad) throw new Error(`illegal ${JSON.stringify(a)}: ${JSON.stringify(bad)}`);
  return r.state;
}
const tryStep = (run: RunState, a: RunAction) => runReduce(run, a);

/** Play the current round with the bot. */
function playRound(start: RunState): RunState {
  let run = start;
  for (let i = 0; i < 400 && run.phase === 'round'; i++) {
    if (!run.round) break;
    const m = chooseMove(run.round);
    if (!m) break;
    run = step(run, { type: 'round', action: moveAction(m) });
  }
  return run;
}

const free = () => newRun({ seed: 'test', targets: [0, 0, 0, 0] });

/** A run at the teahouse after round 1, with the given money. */
function atShop(money = 50, seed = 'shop'): RunState {
  let run = newRun({ seed, targets: [0, 0, 0, 0] });
  run = step(run, { type: 'chooseHost', storm: false });
  run = playRound(run);
  run = step(run, { type: 'continue' });
  if (run.phase === 'gift') run = step(run, { type: 'gift', pick: null });
  expect(run.phase).toBe('shop');
  return { ...run, money };
}

describe('a run', () => {
  it('starts at $4 with the 81 tiles, no dragons, choosing a host for East', () => {
    const run = newRun({ seed: 1 });
    expect(run.money).toBe(4);
    expect(run.tiles).toHaveLength(81);
    expect(run.phase).toBe('host');
    expect(run.roundIndex).toBe(0);
    expect(run.dragons).toEqual([]);
  });

  it('has the targets 1,000 / 3,600 / 8,000 / 16,000 and the lantern and storm multipliers', () => {
    expect([0, 1, 2, 3].map((r) => targetFor(1, r, false))).toEqual([1000, 3600, 8000, 16000]);
    expect([0, 1, 2, 3].map((r) => targetFor(2, r, false))).toEqual([1250, 4500, 10000, 20000]);
    expect(targetFor(4, 0, false)).toBe(1500);
    expect(targetFor(1, 0, true)).toBe(1500);
    expect(targetFor(1, 1, true)).toBe(5400);
  });

  it('works out the round rules from dragons, tile set and lantern', () => {
    expect(roundRulesFor(free())).toMatchObject({
      handSize: 12,
      plays: 5,
      discards: 4,
      peek: 0,
      stacks: 1,
    });
    const rules = roundRulesFor({
      dragons: ['longSleeves', 'nightOwl', 'ironTeapot', 'lantern'],
      tileSet: 'boneBamboo',
      lantern: 1,
    });
    expect(rules).toMatchObject({ handSize: 13, plays: 6, discards: 6, peek: 3 });
    expect(roundRulesFor({ dragons: [], tileSet: 'jadeCourt', lantern: 1 })).toMatchObject({
      handSize: 13,
      discards: 3,
    });
    expect(roundRulesFor({ dragons: [], tileSet: 'boneBamboo', lantern: 4 }).discards).toBe(3);
  });

  it('deals the round when you choose a host, and the storm raises the target', () => {
    const folk = step(newRun({ seed: 2 }), { type: 'chooseHost', storm: false });
    expect(folk.phase).toBe('round');
    expect(folk.target).toBe(1000);
    expect(folk.round?.stacks).toHaveLength(1);
    expect(folk.round?.hand).toHaveLength(folk.round?.rules.handSize ?? 0);
    const storm = step(newRun({ seed: 2 }), { type: 'chooseHost', storm: true });
    expect(storm.target).toBe(1500);
  });

  it('ends the run when a round misses its target', () => {
    let run = newRun({ seed: 3, targets: [1e9, 1, 1, 1] });
    run = step(run, { type: 'chooseHost', storm: false });
    run = playRound(run);
    expect(run.phase).toBe('over');
    expect(run.scores).toHaveLength(1);
  });

  describe('money', () => {
    it('pays $10 / $12 / $14 + $1 per unused discard + interest after rounds 1-3', () => {
      let run = free();
      for (let r = 0; r < 3; r++) {
        run = step(run, { type: 'chooseHost', storm: false });
        run = playRound(run);
        const unused = run.round?.result?.unusedDiscards ?? 0;
        const before = run.money - (run.payout?.total ?? 0);
        expect(run.phase).toBe('payout');
        expect(run.payout?.reward).toBe([10, 12, 14][r]);
        expect(run.payout?.discards).toBe(unused);
        expect(run.payout?.interest).toBe(Math.min(Math.floor(before / 5), 5));
        expect(run.money).toBe(before + (run.payout?.total ?? 0));
        run = step(run, { type: 'continue' });
        if (run.phase === 'gift') run = step(run, { type: 'gift', pick: null });
        run = step(run, { type: 'leave' });
      }
    });
    it('pays no money after round 4: the run is won', () => {
      let run = free();
      for (let r = 0; r < 4; r++) {
        run = step(run, { type: 'chooseHost', storm: false });
        run = playRound(run);
        if (r < 3) {
          run = step(run, { type: 'continue' });
          if (run.phase === 'gift') run = step(run, { type: 'gift', pick: null });
          run = step(run, { type: 'leave' });
        }
      }
      expect(run.phase).toBe('won');
      expect(run.payout).toBeNull();
      expect(run.scores).toHaveLength(4);
    });
    it('gives $1 per $5 held, up to $5; none at lantern 3', () => {
      expect(interestFor({ money: 4, lantern: 1 })).toBe(0);
      expect(interestFor({ money: 17, lantern: 1 })).toBe(3);
      expect(interestFor({ money: 400, lantern: 1 })).toBe(5);
      expect(interestFor({ money: 400, lantern: 3 })).toBe(0);
    });
    it('adds dragon income (Gold Toad +$4) and gold tile money', () => {
      let run: RunState = { ...free(), dragons: ['goldToad'] };
      run = step(run, { type: 'chooseHost', storm: false });
      run = playRound(run);
      expect(run.payout?.income).toBe(4);
      const total =
        (run.payout?.reward ?? 0) +
        (run.payout?.discards ?? 0) +
        (run.payout?.interest ?? 0) +
        4 +
        (run.payout?.gold ?? 0);
      expect(run.payout?.total).toBe(total);
    });
  });

  describe("the spirit's gift", () => {
    function atGift(storm: boolean, dragons: string[] = []) {
      let run: RunState = { ...free(), dragons };
      run = step(run, { type: 'chooseHost', storm });
      run = playRound(run);
      return step(run, { type: 'continue' });
    }
    it('offers 1 of 2 rare dragons from a calm wind', () => {
      const run = atGift(false);
      expect(run.phase).toBe('gift');
      expect(run.gift?.offers).toHaveLength(2);
      expect(run.gift?.offers.every((id) => DRAGONS[id]?.rarity === 'rare')).toBe(true);
      const id = run.gift?.offers[1] as string;
      const next = step(run, { type: 'gift', pick: 1 });
      expect(next.dragons).toEqual([id]);
      expect(next.phase).toBe('shop');
    });
    it('offers 3 rare dragons and $5 from a storm', () => {
      const run = atGift(true);
      expect(run.gift?.offers).toHaveLength(3);
      expect(run.gift?.bonus).toBe(5);
      const before = run.money;
      expect(before).toBeGreaterThanOrEqual(4 + 5);
    });
    it('never offers a dragon you own', () => {
      const run = atGift(false, ['nightOwl', 'kongBell']);
      expect(run.gift?.offers).not.toContain('nightOwl');
      expect(run.gift?.offers).not.toContain('kongBell');
    });
    it('lets you decline', () => {
      const run = step(atGift(false), { type: 'gift', pick: null });
      expect(run.dragons).toEqual([]);
      expect(run.phase).toBe('shop');
    });
    it('with a full row, asks you to swap one out or decline', () => {
      const full = ['abacus', 'redString', 'coinString', 'sparrowNest', 'goldToad'];
      const run = atGift(false, full);
      expect(tryStep(run, { type: 'gift', pick: 0 }).events[0]).toMatchObject({ type: 'illegal' });
      const swapped = step(run, { type: 'gift', pick: 0, replace: 2 });
      expect(swapped.dragons).toHaveLength(5);
      expect(swapped.dragons[2]).toBe(run.gift?.offers[0]);
    });
  });

  describe('the teahouse', () => {
    it('offers 3 dragons, 2 almanac pages, 2 fortunes and 1 pack', () => {
      const run = atShop();
      const shop = run.shop;
      expect(shop?.dragons).toHaveLength(3);
      expect(shop?.almanac).toHaveLength(2);
      expect(shop?.almanac.every((a) => a.price === 3)).toBe(true);
      expect(shop?.fortunes).toHaveLength(2);
      expect(shop?.fortunes.every((a) => a.price === 3)).toBe(true);
      expect(new Set(shop?.fortunes.map((f) => f.item)).size).toBe(2);
      expect([4, 5]).toContain(shop?.pack.price);
    });
    it('prices dragons by rarity: $4, $6, $8', () => {
      for (const seed of ['a', 'b', 'c', 'd', 'e']) {
        for (const o of atShop(50, seed).shop?.dragons ?? []) {
          const r = DRAGONS[o.item]?.rarity;
          expect(o.price).toBe(r === 'common' ? 4 : r === 'uncommon' ? 6 : 8);
        }
      }
    });
    it('never offers a dragon you own', () => {
      let run = atShop();
      const owned = ['abacus', 'redString', 'coinString', 'scroll'];
      run = { ...run, dragons: owned };
      run = step(run, { type: 'reroll' });
      for (const o of run.shop?.dragons ?? []) expect(owned).not.toContain(o.item);
    });
    it('buys a dragon, an almanac page and a fortune', () => {
      let run = atShop(100);
      const c = run.shop?.dragons[0];
      run = step(run, { type: 'buy', what: 'dragon', index: 0 });
      expect(run.dragons).toEqual([c?.item]);
      expect(run.money).toBe(100 - (c?.price ?? 0));
      expect(run.shop?.dragons[0]?.sold).toBe(true);
      expect(tryStep(run, { type: 'buy', what: 'dragon', index: 0 }).events[0]).toMatchObject({
        type: 'illegal',
      });
      const page = run.shop?.almanac[0]?.item as 'chow';
      run = step(run, { type: 'buy', what: 'almanac', index: 0 });
      expect(run.levels[page]).toBe(1);
      const f = run.shop?.fortunes[1]?.item;
      run = step(run, { type: 'buy', what: 'fortune', index: 1 });
      expect(run.fortunes).toEqual([f]);
    });
    it('refuses what you cannot afford, and a full dragon row or fortune pocket', () => {
      expect(tryStep(atShop(2), { type: 'buy', what: 'dragon', index: 0 }).events[0]).toMatchObject(
        {
          type: 'illegal',
        },
      );
      let run = atShop(100);
      run = {
        ...run,
        dragons: ['abacus', 'redString', 'coinString', 'scroll', 'goldToad'].filter(
          (c) => !run.shop?.dragons.some((o) => o.item === c),
        ),
      };
      run = { ...run, dragons: [...run.dragons, 'x1', 'x2', 'x3', 'x4', 'x5'].slice(0, 5) };
      expect(tryStep(run, { type: 'buy', what: 'dragon', index: 0 }).events[0]).toMatchObject({
        type: 'illegal',
      });
      let p = atShop(100);
      p = step(p, { type: 'buy', what: 'fortune', index: 0 });
      p = step(p, { type: 'buy', what: 'fortune', index: 1 });
      p = {
        ...p,
        shop: p.shop && {
          ...p.shop,
          fortunes: p.shop.fortunes.map((f) => ({ ...f, sold: false })),
        },
      };
      expect(tryStep(p, { type: 'buy', what: 'fortune', index: 0 }).events[0]).toMatchObject({
        type: 'illegal',
      });
    });
    it('rerolls the dragons for $2, then $3, then $4', () => {
      let run = atShop(100);
      const m = run.money;
      run = step(run, { type: 'reroll' });
      expect(run.money).toBe(m - 2);
      run = step(run, { type: 'reroll' });
      expect(run.money).toBe(m - 5);
      run = step(run, { type: 'reroll' });
      expect(run.money).toBe(m - 9);
      expect(run.shop?.dragons).toHaveLength(3);
    });
    it('burns a kind for $5, once a visit', () => {
      let run = atShop(100);
      const n = run.tiles.length;
      const had = countKinds(run.tiles).get('p5') ?? 0;
      run = step(run, { type: 'burn', kind: 'p5' });
      expect(run.money).toBe(95);
      expect(run.tiles).toHaveLength(n - had);
      expect(run.tiles.some((t) => t.kind === 'p5')).toBe(false);
      expect(tryStep(run, { type: 'burn', kind: 'p6' }).events[0]).toMatchObject({
        type: 'illegal',
      });
      expect(tryStep(atShop(100), { type: 'burn', kind: 'w1' }).events[0]).toMatchObject({
        type: 'illegal',
      });
    });
    it('sells a dragon for half its price, rounded down', () => {
      expect(sellPrice('abacus')).toBe(2);
      expect(sellPrice('pongHall')).toBe(3);
      expect(sellPrice('nightOwl')).toBe(4);
      let run: RunState = { ...atShop(10), dragons: ['nightOwl', 'abacus'] };
      run = step(run, { type: 'sell', index: 0 });
      expect(run.money).toBe(14);
      expect(run.dragons).toEqual(['abacus']);
    });
    it('leaves for the next wind', () => {
      const run = step(atShop(), { type: 'leave' });
      expect(run.phase).toBe('host');
      expect(run.roundIndex).toBe(1);
      expect(run.target).toBe(0);
    });
  });

  describe('packs', () => {
    function open(pack: 'fourth' | 'winds' | 'honour' | 'almanac', money = 50) {
      let run = atShop(money);
      run = { ...run, packPool: [pack] };
      run = {
        ...run,
        shop: run.shop && {
          ...run.shop,
          pack: { item: pack, price: pack === 'honour' ? 5 : 4, sold: false },
        },
      };
      return step(run, { type: 'buy', what: 'pack', index: 0 });
    }
    it('Fourth copy: offers kinds you own exactly 3 of, and adds a 4th', () => {
      let run = open('fourth');
      const offers = run.shop?.open?.offers ?? [];
      expect(offers).toHaveLength(3);
      const k = offers[0]?.type === 'tiles' ? offers[0].kinds[0] : '';
      const n = run.tiles.length;
      run = step(run, { type: 'pack', pick: 0 });
      expect(run.tiles).toHaveLength(n + 1);
      expect(countKinds(run.tiles).get(k as string)).toBe(4);
      expect(run.shop?.open).toBeUndefined();
    });
    it('Fourth copy only offers kinds with exactly 3', () => {
      let run = atShop(50);
      run = { ...run, tiles: run.tiles.filter((t, i) => !(t.kind === 'p1' && i % 2 === 0)) };
      const open = step(
        {
          ...run,
          packPool: ['fourth'],
          shop: run.shop && { ...run.shop, pack: { item: 'fourth', price: 4, sold: false } },
        },
        { type: 'buy', what: 'pack', index: 0 },
      );
      for (const o of open.shop?.open?.offers ?? []) {
        if (o.type === 'tiles') expect(countKinds(open.tiles).get(o.kinds[0] as string)).toBe(3);
      }
    });
    it('Winds: the four winds, or 2 of one', () => {
      const run = open('winds');
      expect(run.shop?.open?.offers).toHaveLength(5);
      const all = step(run, { type: 'pack', pick: 0 });
      expect(
        all.tiles
          .filter((t) => t.kind.startsWith('w'))
          .map((t) => t.kind)
          .sort(),
      ).toEqual(['w1', 'w2', 'w3', 'w4']);
    });
    it('Honour triple: 3 offered honours, add 3 copies of one ($5)', () => {
      const before = atShop(50).money;
      const run = open('honour');
      expect(run.money).toBe(before - 5);
      const offers = run.shop?.open?.offers ?? [];
      expect(offers).toHaveLength(3);
      const kind = offers[1]?.type === 'tiles' ? offers[1].kinds[0] : '';
      const done = step(run, { type: 'pack', pick: 1 });
      expect(done.tiles.filter((t) => t.kind === kind)).toHaveLength(3);
    });
    it('Almanac: 3 almanac pages, take one', () => {
      const run = open('almanac');
      const offers = run.shop?.open?.offers ?? [];
      expect(offers).toHaveLength(3);
      const set = offers[0]?.type === 'page' ? offers[0].set : 'chow';
      const done = step(run, { type: 'pack', pick: 0 });
      expect(done.levels[set]).toBe(1);
    });
    it('can be skipped, and blocks the shop until it is closed', () => {
      const run = open('winds');
      expect(tryStep(run, { type: 'leave' }).events[0]).toMatchObject({ type: 'illegal' });
      const skipped = step(run, { type: 'pack', pick: null });
      expect(skipped.tiles).toHaveLength(run.tiles.length);
      expect(skipped.shop?.open).toBeUndefined();
    });
    it('assigns new tiles unique ids', () => {
      const run = step(open('winds'), { type: 'pack', pick: 0 });
      expect(new Set(run.tiles.map((t) => t.id)).size).toBe(run.tiles.length);
    });
  });

  describe('fortunes', () => {
    function withFortune(id: 'rubbing' | 'fire' | 'brush' | 'jade' | 'bone' | 'gold') {
      return { ...atShop(), fortunes: [id] as RunState['fortunes'] };
    }
    const ofKind = (run: RunState, kind: string) =>
      run.tiles.filter((t) => t.kind === kind).map((t) => t.id);
    it('Rubbing copies a tile (a 4th copy)', () => {
      const run = step(withFortune('rubbing'), {
        type: 'fortune',
        index: 0,
        args: { tileIds: [ofKind(withFortune('rubbing'), 'p5')[0] as number] },
      });
      expect(countKinds(run.tiles).get('p5')).toBe(4);
      expect(run.fortunes).toEqual([]);
      expect(new Set(run.tiles.map((t) => t.id)).size).toBe(run.tiles.length);
    });
    it('Fire destroys up to 6 tiles', () => {
      const base = withFortune('fire');
      const ids = base.tiles.slice(0, 6).map((t) => t.id);
      const run = step(base, { type: 'fortune', index: 0, args: { tileIds: ids } });
      expect(run.tiles).toHaveLength(75);
      expect(
        tryStep(base, {
          type: 'fortune',
          index: 0,
          args: { tileIds: base.tiles.slice(0, 7).map((t) => t.id) },
        }).events[0],
      ).toMatchObject({ type: 'illegal' });
    });
    it('Brush changes up to 3 tiles to one suit, keeping the rank', () => {
      const base = withFortune('brush');
      const ids = [...ofKind(base, 'p5'), ...ofKind(base, 'm2')].slice(0, 3);
      const run = step(base, { type: 'fortune', index: 0, args: { tileIds: ids, suit: 's' } });
      expect(
        run.tiles
          .filter((t) => ids.includes(t.id))
          .every((t) => t.kind === 's5' || t.kind === 's2'),
      ).toBe(true);
      expect(
        tryStep(base, { type: 'fortune', index: 0, args: { tileIds: ids } }).events[0],
      ).toMatchObject({ type: 'illegal' });
    });
    it('Brush cannot change an honour', () => {
      let base = withFortune('brush');
      base = { ...base, tiles: [...base.tiles, { id: 9001, kind: 'w1' }] };
      expect(
        tryStep(base, { type: 'fortune', index: 0, args: { tileIds: [9001], suit: 'p' } })
          .events[0],
      ).toMatchObject({ type: 'illegal' });
    });
    it('Jade, Bone and Gold Leaf enhance tiles', () => {
      for (const [id, enh, n] of [
        ['jade', 'jade', 2],
        ['bone', 'bone', 2],
        ['gold', 'gold', 1],
      ] as const) {
        const base = withFortune(id);
        const ids = base.tiles.slice(0, n).map((t) => t.id);
        const run = step(base, { type: 'fortune', index: 0, args: { tileIds: ids } });
        expect(run.tiles.filter((t) => t.enh === enh)).toHaveLength(n);
      }
      const base = withFortune('gold');
      expect(
        tryStep(base, {
          type: 'fortune',
          index: 0,
          args: { tileIds: base.tiles.slice(0, 2).map((t) => t.id) },
        }).events[0],
      ).toMatchObject({ type: 'illegal' });
    });
    it('acts on tiles in your hand during a round', () => {
      let run = step(newRun({ seed: 'f', targets: [0, 0, 0, 0] }), {
        type: 'chooseHost',
        storm: false,
      });
      run = { ...run, fortunes: ['jade'] };
      const hand = run.round?.hand ?? [];
      const ids = hand.slice(0, 2).map((t) => t.id);
      const next = step(run, { type: 'fortune', index: 0, args: { tileIds: ids } });
      expect(next.round?.hand.filter((t) => t.enh === 'jade')).toHaveLength(2);
      expect(next.tiles.filter((t) => t.enh === 'jade')).toHaveLength(2);
      // a tile in the pile is not in the hand
      const wallTile = run.round?.stacks[0]?.[0];
      expect(
        tryStep(run, { type: 'fortune', index: 0, args: { tileIds: [wallTile?.id as number] } })
          .events[0],
      ).toMatchObject({ type: 'illegal' });
    });
    it('Fire in a round removes the tile from hand and set', () => {
      let run = step(newRun({ seed: 'f2', targets: [0, 0, 0, 0] }), {
        type: 'chooseHost',
        storm: false,
      });
      run = { ...run, fortunes: ['fire'] };
      const id = run.round?.hand[0]?.id as number;
      const next = step(run, { type: 'fortune', index: 0, args: { tileIds: [id] } });
      // the hand refills at once
      expect(next.round?.hand).toHaveLength(run.round?.hand.length ?? 0);
      expect(next.round?.hand.some((t) => t.id === id)).toBe(false);
      expect(next.tiles.some((t) => t.id === id)).toBe(false);
    });
    it('is not usable outside a round or the teahouse', () => {
      const run = { ...newRun({ seed: 1 }), fortunes: ['jade'] as RunState['fortunes'] };
      expect(
        tryStep(run, { type: 'fortune', index: 0, args: { tileIds: [1] } }).events[0],
      ).toMatchObject({ type: 'illegal' });
    });
  });

  describe('saves', () => {
    it('is plain JSON: a state survives a round-trip and plays on identically', () => {
      let run = atShop(40, 'save');
      run = step(run, { type: 'buy', what: 'almanac', index: 0 });
      const copy = JSON.parse(JSON.stringify(run)) as RunState;
      expect(copy).toEqual(run);
      const a = step(run, { type: 'reroll' });
      const b = step(copy, { type: 'reroll' });
      expect(b).toEqual(a);
    });
    it('resumes mid-round exactly', () => {
      const run = step(newRun({ seed: 'mid' }), { type: 'chooseHost', storm: false });
      const copy = JSON.parse(JSON.stringify(run)) as RunState;
      const move = chooseMove(run.round as NonNullable<RunState['round']>);
      expect(move).not.toBeNull();
      const act: RunAction = {
        type: 'round',
        action: moveAction(move as NonNullable<typeof move>),
      };
      expect(step(copy, act)).toEqual(step(run, act));
    });
    it('never mutates its input', () => {
      const run = atShop(40);
      const before = JSON.stringify(run);
      runReduce(run, { type: 'reroll' });
      runReduce(run, { type: 'buy', what: 'dragon', index: 0 });
      runReduce(run, { type: 'burn', kind: 'p1' });
      expect(JSON.stringify(run)).toBe(before);
    });
  });
});
