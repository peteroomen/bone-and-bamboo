import { WIND_NAMES } from '@/content/rules';

const GLYPHS = ['東', '南', '西', '北'] as const;
/** East is your side (the bottom); play goes round the square: East, South, West, North. */
const SIDES = ['bottom', 'right', 'top', 'left'] as const;

/**
 * The square of the wall, seen from above: one side per wind. This round's side is lit, the sides
 * already played are taken down, the rest still stand.
 */
export function WallSquare({ round }: { round: number }) {
  return (
    <div className="wall-square" data-testid="wall-square" aria-label="The square of the wall">
      {SIDES.map((side, i) => (
        <span
          key={side}
          className={`ws-side ws-${side}${i === round ? ' now' : i < round ? ' done' : ''}`}
          aria-label={`${WIND_NAMES[i]}${i === round ? ', this round' : i < round ? ', played' : ''}`}
        >
          {Array.from({ length: 6 }, (_, k) => (
            <i key={k} />
          ))}
        </span>
      ))}
      <span className="ws-label" aria-hidden>
        {GLYPHS[round]}
      </span>
    </div>
  );
}
