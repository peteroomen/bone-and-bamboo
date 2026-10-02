import { SEASON_NAMES, WIND_NAMES } from '@/content/rules';
import type { RunState } from '@/engine/runTypes';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** The run is over: lost at a round, or won all four winds. */
export function EndView({ run, onExit }: { run: RunState; onExit: () => void }) {
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
      <button type="button" className="btn primary" data-testid="btn-end-continue" onClick={onExit}>
        Back to the title
      </button>
    </div>
  );
}
