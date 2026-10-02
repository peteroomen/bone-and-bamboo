import { createContext, useContext, useEffect, useState } from 'react';

/** The logical stage is 390 wide; it is scaled to fit the window. */
export const STAGE_W = 390;
/** The shortest logical stage height: everything important must fit in this (360×640 phone). */
export const MIN_STAGE_H = 690;

export interface StageSize {
  readonly scale: number;
  /** The logical height of the stage. */
  readonly h: number;
  readonly left: number;
  readonly top: number;
  /** Wider than tall: a laptop or desktop. The stage is sized by height and framed. */
  readonly landscape: boolean;
}

/** On a landscape screen the stage fills the height, aiming for this many logical pixels. */
export const DESK_H = 760;

let probe: HTMLDivElement | null = null;

/** Safe-area insets (notches, home indicators) in CSS pixels. */
function insets(): { top: number; bottom: number } {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
}

/** The stage's scale and logical height for a window (exported for tests). */
export function fitStage(vw: number, vh: number): { scale: number; h: number; landscape: boolean } {
  const landscape = vw > vh;
  let scale: number;
  if (landscape) {
    const target = Math.min(DESK_H, Math.max(MIN_STAGE_H, vh));
    scale = Math.min(vh / target, vw / STAGE_W);
  } else {
    scale = Math.min(vw / STAGE_W, 1.4);
    if (vh / scale < MIN_STAGE_H) scale = vh / MIN_STAGE_H;
  }
  return { scale, h: vh / scale, landscape };
}

function measure(): StageSize {
  const vw = window.innerWidth;
  const inset = insets();
  const vh = window.innerHeight - inset.top - inset.bottom;
  const { scale, h, landscape } = fitStage(vw, vh);
  return { scale, h, left: (vw - STAGE_W * scale) / 2, top: inset.top, landscape };
}

export function useStageSize(): StageSize {
  const [size, setSize] = useState(measure);
  useEffect(() => {
    const on = () => setSize(measure());
    window.addEventListener('resize', on);
    window.visualViewport?.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.visualViewport?.removeEventListener('resize', on);
    };
  }, []);
  return size;
}

const PHONE: StageSize = { scale: 1, h: MIN_STAGE_H, left: 0, top: 0, landscape: false };
export const StageContext = createContext<StageSize>(PHONE);

/** The size of the stage this screen is drawn on (inside a Viewport). */
export function useStage(): StageSize {
  return useContext(StageContext);
}
