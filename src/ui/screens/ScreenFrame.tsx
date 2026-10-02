import type { ReactNode } from 'react';
import { Viewport } from '@/ui/game/Viewport';
import { setState, useTheme } from '@/ui/state/store';

/** A screen outside a run: a back button, a title and a scrolling body. */
export function ScreenFrame({
  title,
  testId,
  children,
  back = 'title',
}: {
  title: string;
  testId: string;
  children: ReactNode;
  back?: 'title' | 'setup';
}) {
  const theme = useTheme();
  return (
    <Viewport theme={theme}>
      {() => (
        <div className="frame" data-testid={testId}>
          <header className="frame-head">
            <button
              type="button"
              className="btn ghost frame-back"
              aria-label="Back"
              data-testid="btn-back"
              onClick={() => setState({ screen: back })}
            >
              ←
            </button>
            <h2>{title}</h2>
          </header>
          <div className="frame-body">{children}</div>
        </div>
      )}
    </Viewport>
  );
}
