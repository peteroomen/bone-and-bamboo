import type { ReactNode } from 'react';
import { StageContext, useStageSize } from './stageSize';

/**
 * Full-screen background plus a scaled 390-wide logical stage. On a landscape screen the stage
 * stands in the middle of the window with the table colour either side.
 */
export function Viewport({ children }: { children: (stageH: number) => ReactNode }) {
  const size = useStageSize();
  return (
    <div
      className="viewport"
      data-landscape={size.landscape ? 'y' : undefined}
      style={{ ['--k' as string]: String(size.scale) }}
    >
      <div
        className="stage"
        style={{
          height: size.h,
          transform: `translate(${size.left}px, ${size.top}px) scale(${size.scale})`,
          position: 'absolute',
          left: 0,
          top: 0,
        }}
      >
        <StageContext.Provider value={size}>{children(size.h)}</StageContext.Provider>
      </div>
    </div>
  );
}
