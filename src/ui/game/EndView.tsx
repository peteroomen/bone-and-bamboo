import { SEASON_NAMES, WIND_NAMES } from '@/content/rules';
import { COLOURWAYS } from '@/content/colourways';
import { TILE_SETS } from '@/content/tilesets';
import type { Unlock } from '@/engine/profile';
import type { RunState } from '@/engine/runTypes';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** The run is over: lost at a round, or won all four winds. */
/** What a run unlocked, in plain words. */
function unlockText(u: Unlock): string {
  switch (u.kind) {
    case 'tileSet':
      return `New tile set: ${TILE_SETS.find((t) => t.id === u.id)?.name ?? u.id}`;
    case 'lantern':
      return `Lantern ${u.level} is lit for ${TILE_SETS.find((t) => t.id === u.tileSet)?.name ?? u.tileSet}`;
    case 'colourway':
      return `New colourway: ${COLOURWAYS.find((c) => c.id === u.id)?.name ?? u.id}`;
  }
}

export function EndView({
  run,
  unlocks,
  onExit,
}: {
  run: RunState;
  unlocks: readonly Unlock[];
  onExit: () => void;
}) {
  const won = run.phase === 'won';
  return (
    <div className="end" data-testid={won ? 'phase-won' : 'phase-over'}>
      <h2>{won ? 'The four winds are yours' : 'The run ends'}</h2>
      <p className="muted">
        {won
          ? 'Every host is beaten. A fine run.'
          : `${WIND_NAMES[run.roundIndex]} (${SEASON_NAMES[run.roundIndex]}) was a little too much this time.`}
      </p>
      <ul className="payout-rows">
        {run.scores.map((s, i) => (
          <li key={i}>
            <span>{WIND_NAMES[i]}</span>
            <b>{fmt(s)}</b>
          </li>
        ))}
      </ul>
      {unlocks.length > 0 && (
        <ul className="unlocks" data-testid="unlocks">
          {unlocks.map((u, i) => (
            <li key={i}>{unlockText(u)}</li>
          ))}
        </ul>
      )}
      <button type="button" className="btn primary" data-testid="btn-end-continue" onClick={onExit}>
        Back to the title
      </button>
    </div>
  );
}
