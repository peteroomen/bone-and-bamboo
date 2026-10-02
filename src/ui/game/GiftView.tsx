import { useState } from 'react';
import { CURIO_SLOTS } from '@/content/curios';
import { hostFor } from '@/content/hosts';
import type { RunAction, RunEvent, RunState } from '@/engine/runTypes';
import { Portrait } from './Portrait';
import { CurioGlyph, OfferCard } from './Cards';
import { curioCard } from './cardProps';
import { CURIOS } from '@/content/curios';

/** After a round is won, the host leaves a gift: one of the rare curios, free. */
export function GiftView({
  run,
  dispatch,
}: {
  run: RunState;
  dispatch: (a: RunAction) => RunEvent[];
}) {
  const gift = run.gift;
  const [chosen, setChosen] = useState<number | null>(null);
  if (!gift) return null;
  const host = hostFor(run.roundIndex, run.beast);
  const full = run.curios.length >= CURIO_SLOTS;

  const take = (i: number) => {
    if (full) setChosen(i);
    else dispatch({ type: 'gift', pick: i });
  };

  return (
    <div className="gift" data-testid="gift">
      <Portrait name={host.name} colour={host.colour} size={72} />
      <h2>{host.name} leaves a gift</h2>
      <p className="muted">Choose one.{gift.bonus ? ` And $${gift.bonus} for the road.` : ''}</p>
      {chosen === null ? (
        <div className="offers gift-offers">
          {gift.offers.map((id, i) => (
            <OfferCard
              key={id}
              {...curioCard(id)}
              price="Take"
              testId={`gift-${i}`}
              onClick={() => take(i)}
            />
          ))}
        </div>
      ) : (
        <div className="swap" data-testid="gift-swap">
          <p>
            Your curios are full. Swap one out for{' '}
            <b>{CURIOS[gift.offers[chosen] as string]?.name}</b>:
          </p>
          <ul className="sheet-list">
            {run.curios.map((id, i) => (
              <li key={id}>
                <CurioGlyph id={id} />
                <span>
                  <b>{CURIOS[id]?.name}</b>
                  <span>{CURIOS[id]?.text}</span>
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
