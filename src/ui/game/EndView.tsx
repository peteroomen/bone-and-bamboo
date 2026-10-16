import { PATTERN_BY_ID, type PatternId } from '@/content/patterns';
import type { RunState } from '@/engine/run';
import { roundsOf } from '@/engine/run';
import { abandonRun, startRun } from '@/ui/state/store';
import { GuideFace } from './GuideFace';

/** The end of a run: won or lost, with what happened. */
export function EndView({ run }: { run: RunState }) {
  const won = run.phase === 'won';
  const best = Math.max(0, ...run.history.map((h) => h.best));
  const pats = new Map<PatternId, number>();
  for (const h of run.history) for (const p of h.patterns) pats.set(p, (pats.get(p) ?? 0) + 1);
  const last = run.history[run.history.length - 1];
  return (
    <div className="panel-screen">
      <div className="panel">
        <GuideFace mood={won ? 'wow' : 'sad'} className="end-guide" />
        <h2 className="panel-title">{won ? 'All four winds beaten!' : 'The wind won this time'}</h2>
        <p className="panel-sub">
          {won
            ? `You beat all ${roundsOf(run)} rounds.`
            : last
              ? `Round ${last.index + 1}: ${last.score.toLocaleString('en-GB')} of ${last.target.toLocaleString('en-GB')}.`
              : ''}
        </p>
        <ul className="cash-lines">
          <li>
            <span>Rounds won</span>
            <b>{run.history.filter((h) => h.score >= h.target).length}</b>
          </li>
          <li>
            <span>Best hand</span>
            <b>{best.toLocaleString('en-GB')}</b>
          </li>
          {[...pats.entries()].slice(0, 5).map(([p, n]) => (
            <li key={p}>
              <span>{PATTERN_BY_ID[p].name}</span>
              <b>×{n}</b>
            </li>
          ))}
        </ul>
        <button type="button" className="btn big" onClick={() => startRun()} data-testid="new-run">
          New run
        </button>
        <button type="button" className="btn ghost" onClick={abandonRun}>
          Title
        </button>
      </div>
    </div>
  );
}
