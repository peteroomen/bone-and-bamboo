import { useStore } from '@/ui/state/store';
import { EndView } from './EndView';
import { GiftView } from './GiftView';
import { HostView } from './HostView';
import { PayoutView } from './PayoutView';
import { PlayerBar } from './PlayerBar';
import { RoundView } from './RoundView';
import { ScoreOverlay } from './ScoreOverlay';
import { ShopView } from './ShopView';
import { useGame } from './useGame';
import { Viewport } from './Viewport';

export function GameScreen({ onExit }: { onExit: () => void }) {
  const { run, scoring, endScoring, dispatch } = useGame();
  const theme = useStore((s) => s.settings.colourway);
  const round = run.round;
  const showScore = scoring && round?.result;
  return (
    <Viewport theme={theme}>
      {() => (
        <div className="screen">
          {run.phase === 'round' && round && <RoundView run={run} dispatch={dispatch} />}
          {run.phase !== 'round' && (
            <>
              <div className="screen-body">
                {run.phase === 'host' && (
                  <HostView run={run} choose={(storm) => dispatch({ type: 'chooseHost', storm })} />
                )}
                {run.phase === 'payout' && (
                  <PayoutView run={run} onContinue={() => dispatch({ type: 'continue' })} />
                )}
                {run.phase === 'gift' && <GiftView run={run} dispatch={dispatch} />}
                {run.phase === 'shop' && <ShopView run={run} dispatch={dispatch} />}
                {(run.phase === 'over' || run.phase === 'won') && !showScore && (
                  <EndView run={run} onExit={onExit} />
                )}
              </div>
              {run.phase !== 'over' && run.phase !== 'won' && (
                <PlayerBar run={run} dispatch={dispatch} />
              )}
            </>
          )}
          {showScore && round?.result && (
            <ScoreOverlay
              table={round.table}
              score={round.result.score}
              target={run.target}
              onDone={endScoring}
            />
          )}
        </div>
      )}
    </Viewport>
  );
}
