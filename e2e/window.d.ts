import type { RunAction, RunState } from '../src/engine/run';

declare global {
  interface Window {
    /** The test hooks installed by src/ui/state/testHooks.ts. */
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
