import { type ReactNode, useEffect } from 'react';

/** A panel that rises from the foot of the stage, over a scrim. Escape or the scrim closes it. */
export function Sheet({
  title,
  onClose,
  children,
  testId,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onClose]);
  return (
    <div
      className="sheet-scrim"
      onClick={onClose}
      data-testid={testId ? `${testId}-scrim` : undefined}
    >
      <div
        className="sheet"
        role="dialog"
        aria-label={title}
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="btn ghost sheet-close"
            aria-label="Close"
            onClick={onClose}
            data-testid="sheet-close"
          >
            ✕
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
