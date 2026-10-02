import { useEffect, useState } from 'react';
import { type Unlock, foldRun, noteRun } from '@/engine/profile';
import { getState, setState, updateProfile, updateProfileWith, useTheme } from '@/ui/state/store';
import { TipLayer } from './TipLayer';
import { dueTip } from './tips';
import { tipFor } from '@/content/guide';
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
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  // what you have seen of the dragons and winds is kept as you go
  useEffect(() => updateProfileWith((p) => noteRun(p, run)), [run]);
  // a finished run goes into the profile once; what it unlocked is shown at the end
  useEffect(() => {
    if ((run.phase !== 'over' && run.phase !== 'won') || run.recorded) return;
    const done = foldRun(getState().profile, run);
    setState({ profile: done.profile });
    setUnlocks(done.unlocks);
    dispatch({ type: 'record' });
  }, [run, dispatch]);
  const theme = useTheme();
  const round = run.round;
  const showScore = scoring && round?.result;
  const scoreTip =
    run.guided && !run.tipsSeen.includes('score') ? (tipFor('score')?.text ?? null) : null;
  const done = () => {
    endScoring();
    if (scoreTip) dispatch({ type: 'tip', id: 'score' });
    if (run.guided) updateProfile({ guidedDone: true });
  };
  return (
    <Viewport theme={theme}>
      {() => (
        <div className="screen">
          {run.phase === 'round' && round && <RoundView run={run} dispatch={dispatch} />}
          {run.phase === 'host' && (
            <TipLayer
              tip={dueTip(run, { valid: false })}
              onRead={(id) => dispatch({ type: 'tip', id })}
            />
          )}
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
                  <EndView run={run} unlocks={unlocks} onExit={onExit} />
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
              onDone={done}
              tip={scoreTip}
            />
          )}
        </div>
      )}
    </Viewport>
  );
}
