import { Sheet } from './Sheet';

/** A yes or no before something that can't be undone. */
export function ConfirmSheet({
  title,
  body,
  action,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet title={title} onClose={onCancel} testId="sheet-confirm">
      <p>{body}</p>
      <button type="button" className="btn primary" data-testid="btn-confirm" onClick={onConfirm}>
        {action}
      </button>
      <button type="button" className="btn ghost" onClick={onCancel}>
        Cancel
      </button>
    </Sheet>
  );
}
