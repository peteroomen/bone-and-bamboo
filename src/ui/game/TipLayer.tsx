import { useEffect, useState } from 'react';
import type { Tip } from '@/content/guide';
import { speedFactor } from '@/ui/state/store';
import { Guide } from './GuideBubble';

/**
 * The guide's tip. It waits until the table has been still for a moment, then holds play: the layer
 * covers the stage until the tip is read.
 */
export function TipLayer({ tip, onRead }: { tip: Tip | null; onRead: (id: string) => void }) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    setShown(null);
    if (!tip) return;
    const t = setTimeout(() => setShown(tip.id), 450 * speedFactor());
    return () => clearTimeout(t);
  }, [tip]);
  if (!tip || shown !== tip.id) return null;
  return (
    <div className="tip-layer" data-testid="tip" role="dialog" aria-label="A tip from the guide">
      <div className="guide-bubble tip-bubble">
        <Guide mood={tip.mood} size={60} />
        <p data-testid="tip-text">{tip.text}</p>
      </div>
      <button
        type="button"
        className="btn primary"
        data-testid="btn-tip-ok"
        onClick={() => onRead(tip.id)}
      >
        Got it
      </button>
    </div>
  );
}
