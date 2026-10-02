import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, foldRun } from '@/engine/profile';
import { newRun } from '@/engine/run';
import { DEFAULT_SETTINGS } from './store';
import { type SaveData, decodeSave, encodeSave, saveFileJson } from './transfer';

const data = (): SaveData => ({
  settings: { ...DEFAULT_SETTINGS, speed: 'fast', colourway: 'porcelain' },
  profile: {
    ...DEFAULT_PROFILE,
    runsPlayed: 3,
    runsWon: 1,
    bestRound: 12345,
    dragonsOwned: ['abacus'],
    lanterns: { boneBamboo: 2 },
  },
  run: newRun({ seed: 42 }),
});

describe('save transfer', () => {
  it('round-trips a save code', () => {
    const d = data();
    const code = encodeSave(d);
    expect(code.startsWith('BB1.')).toBe(true);
    expect(decodeSave(code)).toEqual({ ok: true, save: d, droppedRun: false });
  });
  it('reads a save file, and a code pasted with line breaks or without its prefix', () => {
    const d = data();
    expect(decodeSave(saveFileJson(d)).ok).toBe(true);
    const body = encodeSave(d).slice(4);
    expect(decodeSave(`  ${body.slice(0, 50)}\n${body.slice(50)}  `).ok).toBe(true);
  });
  it('rejects junk and other apps', () => {
    expect(decodeSave('hello').ok).toBe(false);
    expect(decodeSave('BB1.!!!').ok).toBe(false);
    expect(decodeSave(JSON.stringify({ app: 'twelve-petals', v: 1, profile: {} })).ok).toBe(false);
    expect(decodeSave(JSON.stringify({ app: 'bone-and-bamboo', v: 9, profile: {} }))).toMatchObject(
      {
        ok: false,
      },
    );
  });
  it('leaves out a finished run, and fills in a missing profile field', () => {
    const d = { ...data(), run: { ...newRun({ seed: 1 }), phase: 'won' as const } };
    const res = decodeSave(encodeSave(d));
    expect(res).toMatchObject({ ok: true, droppedRun: true });
    const old = JSON.stringify({
      app: 'bone-and-bamboo',
      v: 1,
      settings: {},
      profile: { runsWon: 2 },
      run: null,
    });
    const r = decodeSave(old);
    expect(r.ok && r.save.profile.runsWon).toBe(2);
    expect(r.ok && r.save.profile.dragonsSeen).toEqual([]);
    void foldRun;
  });
});
