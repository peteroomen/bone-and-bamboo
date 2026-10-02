import { useCallback, useEffect, useState } from 'react';
import { runReduce } from '@/engine/run';
import type { RunAction, RunEvent, RunState } from '@/engine/runTypes';
import { getState, setState, useStore } from '@/ui/state/store';

export interface GameApi {
  readonly run: RunState;
  /** The score count-up for the round that just ended is showing. */
  readonly scoring: boolean;
  readonly endScoring: () => void;
  /** Runs an action through the engine and returns what happened. */
  readonly dispatch: (action: RunAction) => RunEvent[];
}

declare global {
  interface Window {
    /** For the end-to-end tests: the live run and whether the UI is busy. */
    __bb?: { run: RunState; scoring: boolean };
  }
}

export function useGame(): GameApi {
  const run = useStore((s) => s.run) as RunState;
  const [scoring, setScoring] = useState(false);

  const dispatch = useCallback((action: RunAction): RunEvent[] => {
    const cur = getState().run;
    if (!cur) return [];
    const r = runReduce(cur, action);
    if (r.state !== cur) setState({ run: r.state });
    if (r.events.some((e) => e.type === 'round' && e.event.type === 'end')) setScoring(true);
    return r.events;
  }, []);

  const endScoring = useCallback(() => setScoring(false), []);

  useEffect(() => {
    window.__bb = { run, scoring };
  }, [run, scoring]);

  return { run, scoring, endScoring, dispatch };
}
