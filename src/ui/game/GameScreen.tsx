import { useStore } from '@/ui/state/store';
import { HostView } from './HostView';
import { RoundView } from './RoundView';
import { ScoreOverlay } from './ScoreOverlay';
import { useGame } from './useGame';
import { Viewport } from './Viewport';

export function GameScreen({ onExit }: { onExit: () => void }) {
  const { run, scoring, endScoring, dispatch } = useGame();
  const theme = useStore((s) => s.settings.colourway);
  const round = run.round;
  return (
    <Viewport theme={theme}>
      {() => (
        <>
          {run.phase === 'host' && (
            <HostView run={run} choose={(beast) => dispatch({ type: 'chooseHost', beast })} />
          )}
          {round && run.phase !== 'host' && <RoundView run={run} dispatch={dispatch} />}
          {scoring && round?.result && (
            <ScoreOverlay
              table={round.table}
              score={round.result.score}
              target={run.target}
              onDone={endScoring}
            />
          )}
          {!scoring && (run.phase === 'payout' || run.phase === 'over' || run.phase === 'won') && (
            <div className="overlay" data-testid={`phase-${run.phase}`}>
              <div className="score-card">
                <h2>
                  {run.phase === 'over'
                    ? 'Run over'
                    : run.phase === 'won'
                      ? 'You won'
                      : 'Round won'}
                </h2>
                <button
                  type="button"
                  className="btn primary"
                  data-testid="btn-phase-continue"
                  onClick={onExit}
                >
                  Back to the title
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Viewport>
  );
}
