import { describe, expect, it } from 'vitest';
import { HOSTS } from '@/content/hosts';
import { chooseMove, moveAction } from './ai';
import { Rng } from './rng';
import { newRun, runReduce } from './run';
import type { RunAction, RunState } from './runTypes';

/** Random legal-ish actions through the whole run reducer: it must never throw or corrupt state. */
function randomAction(run: RunState, rng: Rng): RunAction {
  const r = run.round;
  switch (run.phase) {
    case 'host':
      return { type: 'chooseHost', storm: rng.next() < 0.5 };
    case 'round': {
      if (!r) return { type: 'continue' };
      const roll = rng.next();
      const bot = r.phase === 'play' ? chooseMove(r) : null;
      if (bot && roll < 0.35) return { type: 'round', action: moveAction(bot) };
      const ids = rng.shuffle(r.hand.map((t) => t.id)).slice(0, 1 + rng.int(4));
      if (roll < 0.5) return { type: 'round', action: { type: 'play', ids } };
      if (roll < 0.7) return { type: 'round', action: { type: 'discard', ids } };
      if (roll < 0.8) return { type: 'round', action: { type: 'finish' } };
      if (roll < 0.9) return { type: 'round', action: { type: 'swap', id: ids[0] ?? 0 } };
      return {
        type: 'round',
        action: { type: 'upgrade', setIndex: rng.int(4), tileId: ids[0] ?? 0 },
      };
    }
    case 'payout':
      return { type: 'continue' };
    case 'gift':
      return { type: 'gift', pick: rng.int(4) - 1 < 0 ? null : rng.int(3), replace: rng.int(5) };
    case 'shop': {
      const roll = rng.next();
      if (roll < 0.15) return { type: 'leave' };
      if (roll < 0.3) return { type: 'pack', pick: rng.int(4) };
      if (roll < 0.4) return { type: 'reroll' };
      if (roll < 0.45) return { type: 'sell', index: rng.int(5) };
      if (roll < 0.5) return { type: 'burn', kind: `p${1 + rng.int(9)}` };
      if (roll < 0.6)
        return {
          type: 'fortune',
          index: rng.int(2),
          args: { tileIds: [run.tiles[rng.int(run.tiles.length)]?.id ?? 0], suit: 's' },
        };
      const what = rng.pick(['dragon', 'almanac', 'fortune', 'pack'] as const);
      return { type: 'buy', what, index: rng.int(3) };
    }
    default:
      return { type: 'record' };
  }
}

describe('fuzz', () => {
  it('survives thousands of random actions in every twist without throwing', () => {
    let finished = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const rng = new Rng(seed);
      let run = newRun({ seed, targets: [200, 300, 400, 500] });
      for (let i = 0; i < 1500 && run.phase !== 'won' && run.phase !== 'over'; i++) {
        const before = JSON.stringify(run);
        const a = randomAction(run, rng);
        const out = runReduce(run, a);
        // input never mutated; state stays plain JSON
        expect(JSON.stringify(run)).toBe(before);
        run = JSON.parse(JSON.stringify(out.state)) as RunState;
        expect(run.money).toBeGreaterThanOrEqual(0);
        expect(run.hostIds.every((id) => HOSTS.some((h) => h.id === id))).toBe(true);
        if (run.round) {
          expect(run.round.hand.length).toBeLessThanOrEqual(run.round.rules.handSize + 1);
          const ids = [
            ...run.round.stacks.flat(),
            ...run.round.hand,
            ...run.round.table.flatMap((s) => s.tiles),
            ...run.round.discarded,
          ].map((t) => t.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
      }
      if (run.phase === 'won' || run.phase === 'over') finished++;
    }
    expect(finished).toBeGreaterThan(5);
  }, 60_000);
});
