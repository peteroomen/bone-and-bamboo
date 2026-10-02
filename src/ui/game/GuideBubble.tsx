import { useEffect, useState } from 'react';
import type { GuideMood } from '@/ui/art/tiles';
import { guideSvg } from '@/ui/art/guide';
import { useStore } from '@/ui/state/store';

/**
 * The guide: the Red Dragon tile with a face, blinking now and then, with a line to say. Its mood
 * follows the situation (point for a tip, think for Ask, happy for a win, wow for a kong, sad for
 * a loss).
 */
export function Guide({ mood = 'idle', size = 56 }: { mood?: GuideMood; size?: number }) {
  const theme = useStore((s) => s.settings.colourway);
  const instant = useStore((s) => s.settings.speed === 'instant');
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (instant) return;
    let off: ReturnType<typeof setTimeout>;
    const on = setInterval(() => {
      setBlink(true);
      off = setTimeout(() => setBlink(false), 140);
    }, 3600);
    return () => {
      clearInterval(on);
      clearTimeout(off);
    };
  }, [instant]);
  return (
    <span
      className="guide"
      aria-hidden
      style={{ width: size, height: size * 1.1 }}
      dangerouslySetInnerHTML={{ __html: guideSvg(theme, mood, blink) }}
    />
  );
}

/** The guide with a speech bubble. */
export function GuideBubble({
  mood = 'point',
  children,
  testId,
}: {
  mood?: GuideMood;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="guide-bubble" data-testid={testId}>
      <Guide mood={mood} size={44} />
      <p>{children}</p>
    </div>
  );
}
