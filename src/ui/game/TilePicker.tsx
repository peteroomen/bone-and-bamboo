import { useMemo, useState } from 'react';
import { SUITED, SUIT_NAMES, type SuitedSuit } from '@/content/tiles';
import { type Tile, compareKinds, isSuited, kindName, suitOf } from '@/engine/tiles';
import { TileView } from '@/ui/art/Tile';
import { useStore } from '@/ui/state/store';

type Filter = 'all' | SuitedSuit | 'honours';

/**
 * Your tiles as a grid. With maxPicks 0 it is a view of your set (the set picker); with a number
 * it lets you pick that many tiles (for a fortune), and a suit if the fortune needs one.
 */
export function TilePicker({
  pool,
  maxPicks,
  needsSuit = false,
  confirmLabel = 'Use',
  error,
  onConfirm,
}: {
  pool: readonly Tile[];
  maxPicks: number;
  needsSuit?: boolean;
  confirmLabel?: string;
  error?: string | null;
  onConfirm?: (ids: number[], suit?: SuitedSuit) => void;
}) {
  const theme = useStore((s) => s.settings.colourway);
  const [filter, setFilter] = useState<Filter>('all');
  const [picked, setPicked] = useState<number[]>([]);
  const [suit, setSuit] = useState<SuitedSuit | null>(null);
  const sorted = useMemo(
    () => pool.slice().sort((a, b) => compareKinds(a.kind, b.kind) || a.id - b.id),
    [pool],
  );
  const shown = sorted.filter((t) =>
    filter === 'all' ? true : filter === 'honours' ? !isSuited(t.kind) : suitOf(t.kind) === filter,
  );
  const hasHonours = sorted.some((t) => !isSuited(t.kind));
  const toggle = (id: number) =>
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < maxPicks ? [...cur, id] : cur,
    );
  const filters: [Filter, string][] = [
    ['all', `All ${sorted.length}`],
    ...SUITED.map((s): [Filter, string] => [
      s,
      `${SUIT_NAMES[s]} ${sorted.filter((t) => suitOf(t.kind) === s).length}`,
    ]),
    ...(hasHonours ? ([['honours', 'Honours']] as [Filter, string][]) : []),
  ];
  return (
    <div className="picker" data-testid="picker">
      {sorted.length > 12 && (
        <div className="tabs" role="tablist">
          {filters.map(([f, label]) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`tab${filter === f ? ' on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="picker-grid">
        {shown.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`picker-tile${picked.includes(t.id) ? ' selected' : ''}`}
            data-testid={`pick-${t.id}`}
            aria-label={kindName(t.kind)}
            aria-pressed={picked.includes(t.id)}
            disabled={maxPicks === 0}
            onClick={() => toggle(t.id)}
          >
            <TileView tile={t} theme={theme} />
          </button>
        ))}
      </div>
      {maxPicks > 0 && (
        <div className="picker-foot">
          {needsSuit && (
            <div className="tabs" role="radiogroup" aria-label="Suit">
              {SUITED.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={suit === s}
                  className={`tab${suit === s ? ' on' : ''}`}
                  data-testid={`suit-${s}`}
                  onClick={() => setSuit(s)}
                >
                  {SUIT_NAMES[s]}
                </button>
              ))}
            </div>
          )}
          {error && <p className="picker-error">{error}</p>}
          <button
            type="button"
            className="btn primary"
            data-testid="btn-picker-confirm"
            disabled={picked.length === 0 || (needsSuit && !suit)}
            onClick={() => onConfirm?.(picked, suit ?? undefined)}
          >
            {confirmLabel} ({picked.length}/{maxPicks})
          </button>
        </div>
      )}
    </div>
  );
}
