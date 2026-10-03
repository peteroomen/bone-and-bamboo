import { describe, expect, it } from 'vitest';
import {
  DRAGONS,
  DRAGON_IDS,
  DRAGON_PRICE,
  DRAGON_SLOTS,
  DRAGON_WEIGHT,
  dragonPrice,
} from './dragons';
import { ENHANCEMENTS } from './enhancements';
import { FORTUNES, FORTUNE_IDS, FORTUNE_PRICE, FORTUNE_SLOTS } from './fortunes';
import { HOSTS, hostFor } from './hosts';
import { PACKS } from './packs';
import { GIFT, MONEY, ROUND, SHOP } from './rules';
import { SET_TYPES } from './sets';
import { STORM_TARGET_MULT, LANTERNS, TARGETS } from './targets';
import { TILE_SETS } from './tilesets';

describe('content matches docs/design.md', () => {
  it('sets: chips, mult and levels', () => {
    const row = (k: keyof typeof SET_TYPES) => {
      const s = SET_TYPES[k];
      return [s.chips, s.mult, s.levelChips, s.levelMult];
    };
    expect(row('single')).toEqual([5, 0, 0, 0]);
    expect(row('pair')).toEqual([5, 1, 5, 1]);
    expect(row('chow')).toEqual([10, 1, 10, 1]);
    expect(row('pong')).toEqual([40, 4, 15, 2]);
    expect(row('kong')).toEqual([100, 8, 30, 3]);
    expect(row('winds')).toEqual([100, 10, 30, 3]);
  });
  it('the round and the money', () => {
    expect(ROUND).toMatchObject({
      hand: 12,
      stacks: 1,
      peek: 0,
      plays: 5,
      setsPerPlay: 2,
      discards: 4,
      maxDiscard: 5,
    });
    expect(MONEY.start).toBe(4);
    expect(MONEY.rewards).toEqual([10, 12, 14]);
    expect([MONEY.interestPer, MONEY.interestCap, MONEY.perUnusedDiscard]).toEqual([5, 5, 1]);
    expect(TARGETS).toEqual([1000, 3400, 7500, 15000]);
    expect(STORM_TARGET_MULT).toBe(1.5);
    expect(GIFT).toEqual({ calmOffers: 2, stormOffers: 3, stormMoney: 5 });
  });
  it('the teahouse', () => {
    expect(SHOP).toMatchObject({
      dragons: 3,
      almanac: 2,
      fortunes: 2,
      rerollBase: 2,
      rerollStep: 1,
      burnPrice: 5,
    });
    expect([DRAGON_SLOTS, FORTUNE_SLOTS, FORTUNE_PRICE]).toEqual([5, 2, 3]);
    expect(DRAGON_PRICE).toEqual({ common: 4, uncommon: 6, rare: 8 });
    expect(DRAGON_WEIGHT).toEqual({ common: 6, uncommon: 3, rare: 1 });
    expect(PACKS.honour.price).toBe(5);
    expect(PACKS.fourth.price).toBe(4);
  });
  it('23 dragons: 8 common, 7 uncommon, 8 rare', () => {
    expect(DRAGON_IDS).toHaveLength(23);
    const by = (r: string) => DRAGON_IDS.filter((id) => DRAGONS[id]?.rarity === r).length;
    expect([by('common'), by('uncommon'), by('rare')]).toEqual([8, 7, 8]);
    expect(dragonPrice('abacus')).toBe(4);
    expect(dragonPrice('nightOwl')).toBe(8);
    for (const id of DRAGON_IDS) expect(DRAGONS[id]?.id).toBe(id);
  });
  it('6 fortunes and 4 enhancements', () => {
    expect(FORTUNE_IDS).toHaveLength(6);
    for (const id of FORTUNE_IDS) expect(FORTUNES[id].id).toBe(id);
    expect(ENHANCEMENTS.jade.mult).toBe(4);
    expect(ENHANCEMENTS.bone.chips).toBe(30);
    expect(ENHANCEMENTS.gold.money).toBe(2);
    expect([ENHANCEMENTS.porcelain.xmult, ENHANCEMENTS.porcelain.crack]).toEqual([2, 0.25]);
  });
  it('lanterns, tile sets and hosts', () => {
    expect(LANTERNS.map((l) => l.targetMult)).toEqual([1, 1.25, 1.25, 1.5]);
    expect(LANTERNS.map((l) => l.interest)).toEqual([true, true, false, false]);
    expect(TILE_SETS.map((t) => t.id)).toEqual(['boneBamboo', 'twoRivers', 'jadeCourt']);
    expect(HOSTS).toHaveLength(8);
    for (let w = 0; w < 4; w++) {
      expect(hostFor(w, false).storm).toBe(false);
      expect(hostFor(w, true).storm).toBe(true);
    }
  });
});
