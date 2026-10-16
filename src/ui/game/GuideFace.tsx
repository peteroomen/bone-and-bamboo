import { guideSvg } from '@/ui/art/guide';
import type { GuideMood } from '@/ui/art/tiles';
import { useTheme } from '@/ui/state/store';

/** The guide: the Red Dragon tile, alive. */
export function GuideFace({
  mood = 'idle',
  className = '',
}: {
  mood?: GuideMood;
  className?: string;
}) {
  const theme = useTheme();
  return (
    <span
      className={`guide-face ${className}`}
      dangerouslySetInnerHTML={{ __html: guideSvg(theme, mood) }}
    />
  );
}
