import { useState } from 'react';
import { DRAGONS, DRAGON_SLOTS } from '@/content/dragons';
import { FORTUNES, FORTUNE_SLOTS } from '@/content/fortunes';
import { fortunePool } from '@/engine/run';
import type { FortuneArgs, RunAction, RunEvent, RunState } from '@/engine/runTypes';
import { sellPrice } from '@/engine/shop';
import { Glyph, DragonGlyph } from './Cards';
import { FORTUNE_GLYPH } from '@/ui/art/glyphs';
import { Sheet } from './Sheet';
import { TilePicker } from './TilePicker';

type Open =
  | null
  | { kind: 'dragons' }
  | { kind: 'fortunes' }
  | { kind: 'set' }
  | { kind: 'use'; index: number };

/**
 * The player bar, docked at the foot of every run screen: your money, your dragon row, your fortune
 * pocket and your set. Each opens a sheet. Each is one big touch target, not five small ones.
 */
export function PlayerBar({
  run,
  dispatch,
}: {
  run: RunState;
  dispatch: (a: RunAction) => RunEvent[];
}) {
  const [open, setOpen] = useState<Open>(null);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(null);
    setError(null);
  };
  const canSell = run.phase === 'shop' || run.phase === 'gift';
  const canUse =
    (run.phase === 'shop' && !run.shop?.open) ||
    (run.phase === 'round' && run.round?.phase === 'play');

  const use = (index: number, args: FortuneArgs) => {
    const events = dispatch({ type: 'fortune', index, args });
    const bad = events.find((e) => e.type === 'illegal');
    if (bad && bad.type === 'illegal') setError(bad.reason);
    else close();
  };

  const useIndex = open?.kind === 'use' ? open.index : -1;
  const useFortune = useIndex >= 0 ? run.fortunes[useIndex] : undefined;

  return (
    <>
      <div className="playerbar" data-testid="playerbar">
        <span className="money" data-testid="money" aria-label={`Money: ${run.money}`}>
          ${run.money}
        </span>
        <button
          type="button"
          className="pb-slot pb-dragons"
          data-testid="pb-dragons"
          aria-label={`Dragons, ${run.dragons.length} of ${DRAGON_SLOTS}`}
          onClick={() => setOpen({ kind: 'dragons' })}
        >
          {Array.from({ length: DRAGON_SLOTS }, (_, i) => {
            const id = run.dragons[i];
            return id ? (
              <DragonGlyph key={i} id={id} size={28} />
            ) : (
              <span key={i} className="glyph empty" aria-hidden style={{ width: 28, height: 28 }} />
            );
          })}
        </button>
        <button
          type="button"
          className="pb-slot pb-fortunes"
          data-testid="pb-fortunes"
          aria-label={`Fortunes, ${run.fortunes.length} of ${FORTUNE_SLOTS}`}
          onClick={() => setOpen({ kind: 'fortunes' })}
        >
          {Array.from({ length: FORTUNE_SLOTS }, (_, i) => {
            const id = run.fortunes[i];
            return id ? (
              <Glyph key={i} char={FORTUNE_GLYPH[id]} size={28} />
            ) : (
              <span key={i} className="glyph empty" aria-hidden style={{ width: 28, height: 28 }} />
            );
          })}
        </button>
        <button
          type="button"
          className="pb-slot pb-set"
          data-testid="pb-set"
          aria-label={`Your set, ${run.tiles.length} tiles`}
          onClick={() => setOpen({ kind: 'set' })}
        >
          <b>{run.tiles.length}</b>
          <span>tiles</span>
        </button>
      </div>

      {open?.kind === 'dragons' && (
        <Sheet
          title={`Dragons ${run.dragons.length}/${DRAGON_SLOTS}`}
          onClose={close}
          testId="sheet-dragons"
        >
          {run.dragons.length === 0 && <p className="muted">No dragons yet.</p>}
          <ul className="sheet-list">
            {run.dragons.map((id, i) => (
              <li key={id}>
                <DragonGlyph id={id} />
                <span>
                  <b>{DRAGONS[id]?.name}</b>
                  <span>{DRAGONS[id]?.text}</span>
                </span>
                {canSell && (
                  <button
                    type="button"
                    className="btn"
                    data-testid={`sell-${i}`}
                    onClick={() => dispatch({ type: 'sell', index: i })}
                  >
                    Sell ${sellPrice(id)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Sheet>
      )}

      {open?.kind === 'fortunes' && (
        <Sheet
          title={`Fortunes ${run.fortunes.length}/${FORTUNE_SLOTS}`}
          onClose={close}
          testId="sheet-fortunes"
        >
          {run.fortunes.length === 0 && (
            <p className="muted">No fortunes. Buy them at the teahouse.</p>
          )}
          <ul className="sheet-list">
            {run.fortunes.map((id, i) => (
              <li key={`${id}${i}`}>
                <Glyph char={FORTUNE_GLYPH[id]} />
                <span>
                  <b>{FORTUNES[id].name}</b>
                  <span>{FORTUNES[id].text}</span>
                </span>
                <button
                  type="button"
                  className="btn"
                  data-testid={`use-fortune-${i}`}
                  disabled={!canUse}
                  onClick={() => setOpen({ kind: 'use', index: i })}
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
          {!canUse && run.fortunes.length > 0 && (
            <p className="muted">Use fortunes in the teahouse, or between turns in a round.</p>
          )}
        </Sheet>
      )}

      {open?.kind === 'use' && useFortune && (
        <Sheet title={FORTUNES[useFortune].name} onClose={close} testId="sheet-use">
          <p className="muted">
            {FORTUNES[useFortune].text}
            {run.phase === 'round' ? ' (from your hand)' : ''}
          </p>
          <TilePicker
            pool={fortunePool(run)}
            maxPicks={FORTUNES[useFortune].maxTiles}
            needsSuit={FORTUNES[useFortune].needsSuit === true}
            error={error}
            onConfirm={(ids, suit) => use(useIndex, { tileIds: ids, ...(suit ? { suit } : {}) })}
          />
        </Sheet>
      )}

      {open?.kind === 'set' && (
        <Sheet title={`Your set: ${run.tiles.length} tiles`} onClose={close} testId="sheet-set">
          <TilePicker pool={run.tiles} maxPicks={0} />
        </Sheet>
      )}
    </>
  );
}
