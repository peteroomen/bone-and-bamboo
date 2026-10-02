import { useState } from 'react';
import { DRAGON_SLOTS } from '@/content/dragons';
import { hostFor } from '@/content/hosts';
import { WIND_NAMES } from '@/content/rules';
import { TileView } from '@/ui/art/Tile';
import { useStore } from '@/ui/state/store';
import type { RunAction, RunEvent, RunState } from '@/engine/runTypes';
import { DragonGlyph, OfferCard } from './Cards';
import { dragonCard } from './cardProps';
import { DRAGONS } from '@/content/dragons';

/** After a round is won, the host leaves a gift: one of the rare dragons, free. */
export function GiftView({
  run,
  dispatch,
}: {
  run: RunState;
  dispatch: (a: RunAction) => RunEvent[];
}) {
  const gift = run.gift;
  const theme = useStore((st) => st.settings.colourway);
  const [chosen, setChosen] = useState<number | null>(null);
  if (!gift) return null;
  const host = hostFor(run.roundIndex, run.storm);
  const full = run.dragons.length >= DRAGON_SLOTS;

  const take = (i: number) => {
    if (full) setChosen(i);
    else dispatch({ type: 'gift', pick: i });
  };

  return (
    <div className="gift" data-testid="gift">
      <span className="host-tile" aria-hidden>
        <TileView tile={{ id: -200, kind: host.tile }} theme={theme} />
      </span>
      <h2>The {WIND_NAMES[run.roundIndex]} wind leaves a gift</h2>
      <p className="muted">Choose one.{gift.bonus ? ` And $${gift.bonus} for the road.` : ''}</p>
      {chosen === null ? (
        <div className="offers gift-offers">
          {gift.offers.map((id, i) => (
            <OfferCard
              key={id}
              {...dragonCard(id)}
              price="Take"
              testId={`gift-${i}`}
              onClick={() => take(i)}
            />
          ))}
        </div>
      ) : (
        <div className="swap" data-testid="gift-swap">
          <p>
            Your dragons are full. Swap one out for{' '}
            <b>{DRAGONS[gift.offers[chosen] as string]?.name}</b>:
          </p>
          <ul className="sheet-list">
            {run.dragons.map((id, i) => (
              <li key={id}>
                <DragonGlyph id={id} />
                <span>
                  <b>{DRAGONS[id]?.name}</b>
                  <span>{DRAGONS[id]?.text}</span>
                </span>
                <button
                  type="button"
                  className="btn"
                  data-testid={`swap-${i}`}
                  onClick={() => dispatch({ type: 'gift', pick: chosen, replace: i })}
                >
                  Swap
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn ghost" onClick={() => setChosen(null)}>
            Back
          </button>
        </div>
      )}
      <button
        type="button"
        className="btn ghost"
        data-testid="btn-gift-decline"
        onClick={() => dispatch({ type: 'gift', pick: null })}
      >
        Decline
      </button>
    </div>
  );
}
