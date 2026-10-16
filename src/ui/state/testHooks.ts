import { advise } from '@/engine/advice';
import type { RunAction, RunState } from '@/engine/run';
import { texturesReady } from '@/ui/three/faces';
import { onScreen } from '@/ui/three/motion';
import { dispatch, getState, startRun } from './store';

declare global {
  interface Window {
    /** For the end-to-end tests: read the state, act, and ask the guide. */
    __bb?: {
      run: () => RunState | null;
      busy: () => number;
      dispatch: (a: RunAction) => string | null;
      advise: () => RunAction | null;
      start: (seed: number) => void;
      textures: () => Promise<void>;
      dieAt: (dieId: number) => { x: number; y: number } | null;
    };
  }
}

export function installTestHooks(): void {
  window.__bb = {
    run: () => getState().run,
    busy: () => getState().busy,
    dispatch,
    advise: () => {
      const r = getState().run?.current;
      return r && getState().run?.phase === 'round'
        ? { type: 'round', action: advise(r).action }
        : null;
    },
    start: (seed: number) => startRun(seed),
    textures: texturesReady,
    dieAt: (dieId: number) => onScreen.get(dieId) ?? null,
  };
}
