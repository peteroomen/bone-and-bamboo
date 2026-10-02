import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROFILE,
  colourwayUnlocked,
  foldRun,
  lanternReached,
  noteRun,
  tileSetUnlocked,
  unlockedColourways,
} from './profile';
import { newRun } from './run';
import type { RunState } from './runTypes';

const finished = (patch: Partial<RunState>): RunState => ({
  ...newRun({ seed: 1 }),
  phase: 'won',
  scores: [1500, 5000, 12000, 25000],
  stats: { bestRound: 25000, roundsWon: 4, bigSet: 900 },
  hostIds: ['fox', 'monkey', 'rabbit', 'kitchenGod'],
  hostsBeaten: ['fox', 'monkey', 'rabbit', 'kitchenGod'],
  ...patch,
});

describe('the profile', () => {
  it('starts with only the first tile set, lantern and colourway', () => {
    expect(tileSetUnlocked(DEFAULT_PROFILE, 'boneBamboo')).toBe(true);
    expect(tileSetUnlocked(DEFAULT_PROFILE, 'twoRivers')).toBe(false);
    expect(tileSetUnlocked(DEFAULT_PROFILE, 'jadeCourt')).toBe(false);
    expect(unlockedColourways(DEFAULT_PROFILE)).toEqual(['theatre']);
    expect(lanternReached(DEFAULT_PROFILE, 'boneBamboo')).toBe(1);
  });
  it('winning a run unlocks Two Rivers, porcelain and the next lantern', () => {
    const { profile, unlocks } = foldRun(DEFAULT_PROFILE, finished({}));
    expect(profile.runsWon).toBe(1);
    expect(profile.runsPlayed).toBe(1);
    expect(profile.bestRun).toBe(43500);
    expect(profile.bigSet).toBe(900);
    expect(tileSetUnlocked(profile, 'twoRivers')).toBe(true);
    expect(colourwayUnlocked(profile, 'porcelain')).toBe(true);
    expect(lanternReached(profile, 'boneBamboo')).toBe(2);
    expect(unlocks.map((u) => u.kind).sort()).toEqual(['colourway', 'lantern', 'tileSet']);
  });
  it('a lost run records but unlocks nothing', () => {
    const { profile, unlocks } = foldRun(DEFAULT_PROFILE, finished({ phase: 'over' }));
    expect(profile.runsPlayed).toBe(1);
    expect(profile.runsWon).toBe(0);
    expect(profile.bestRun).toBe(0);
    expect(unlocks).toEqual([]);
  });
  it('lights a lantern per tile set, and only one at a time', () => {
    let p = foldRun(DEFAULT_PROFILE, finished({ lantern: 1 })).profile;
    p = foldRun(p, finished({ lantern: 2 })).profile;
    expect(lanternReached(p, 'boneBamboo')).toBe(3);
    p = foldRun(p, finished({ lantern: 1 })).profile;
    expect(lanternReached(p, 'boneBamboo')).toBe(3);
    p = foldRun(p, finished({ lantern: 4 })).profile;
    expect(lanternReached(p, 'boneBamboo')).toBe(4);
    expect(lanternReached(p, 'twoRivers')).toBe(1);
  });
  it('Jade Court needs 3 different storms beaten; papercut needs all 4', () => {
    let p = foldRun(
      DEFAULT_PROFILE,
      finished({ hostsBeaten: ['azureDragon', 'vermilionBird'] }),
    ).profile;
    expect(tileSetUnlocked(p, 'jadeCourt')).toBe(false);
    p = foldRun(p, finished({ hostsBeaten: ['whiteTiger', 'azureDragon'] })).profile;
    expect(tileSetUnlocked(p, 'jadeCourt')).toBe(true);
    expect(colourwayUnlocked(p, 'papercut')).toBe(false);
    p = foldRun(p, finished({ hostsBeaten: ['blackTortoise'] })).profile;
    expect(colourwayUnlocked(p, 'papercut')).toBe(true);
  });
  it('notes the dragons seen and owned and the hosts met', () => {
    const run = newRun({ seed: 2 });
    const p = noteRun(DEFAULT_PROFILE, { ...run, dragons: ['abacus'], hostIds: ['fox'] });
    expect(p.dragonsOwned).toEqual(['abacus']);
    expect(p.dragonsSeen).toEqual(['abacus']);
    expect(p.hostsMet).toEqual(['fox']);
    expect(noteRun(p, { ...run, dragons: ['abacus'], hostIds: ['fox'] })).toBe(p);
  });
  it('is plain JSON', () => {
    const p = foldRun(DEFAULT_PROFILE, finished({})).profile;
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
  });
});
