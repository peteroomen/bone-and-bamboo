import { type Tip, tipFor } from '@/content/guide';
import { needsRefill, upgrades } from '@/engine/round';
import type { RunState } from '@/engine/runTypes';
import { findSets } from '@/engine/sets';

export interface Selection {
  /** The picked tiles make a set that can be played. */
  readonly valid: boolean;
}

/**
 * The guide's next tip for the guided first run, or null. Tips appear once each, in the order the
 * situations come up; the caller waits for the table to be still and holds play while one shows.
 */
export function dueTip(run: RunState, sel: Selection): Tip | null {
  if (!run.guided || run.roundIndex !== 0) return null;
  const pick = (id: Tip['id']): Tip | null =>
    run.tipsSeen.includes(id) ? null : (tipFor(id) ?? null);
  if (run.phase === 'host') return pick('host');
  const round = run.round;
  if (run.phase !== 'round' || !round || round.phase !== 'play') return null;
  if (round.hand.length === 0 && round.table.length === 0 && round.turns === 0) return pick('wall');
  if (needsRefill(round)) return null;
  const kinds = new Set(findSets(round.hand).map((c) => c.kind));
  return (
    pick('full') ??
    (kinds.has('pair') ? pick('pair') : null) ??
    (kinds.has('chow') ? pick('run') : null) ??
    (kinds.has('pong') ? pick('pong') : null) ??
    (sel.valid ? pick('preview') : null) ??
    (kinds.size === 0 && round.discardsLeft > 0 ? pick('discard') : null) ??
    (upgrades(round).length > 0 ? pick('kong') : null)
  );
}
