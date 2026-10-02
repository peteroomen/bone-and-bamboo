import { useState } from 'react';
import { CURIO_SLOTS } from '@/content/curios';
import { FORTUNE_SLOTS } from '@/content/fortunes';
import { PACKS } from '@/content/packs';
import { SHOP } from '@/content/rules';
import { SET_TYPES } from '@/content/sets';
import type { PackOffer, RunAction, RunEvent, RunState } from '@/engine/runTypes';
import { rerollPrice } from '@/engine/shop';
import { type Tile, compareKinds, kindName } from '@/engine/tiles';
import { TileView } from '@/ui/art/Tile';
import { useStore } from '@/ui/state/store';
import { Glyph, OfferCard } from './Cards';
import { curioCard, fortuneCard, packCard, pageCard } from './cardProps';
import { SET_GLYPH } from '@/ui/art/glyphs';
import { Sheet } from './Sheet';

function offerSummary(o: PackOffer): { name: string; text: string; kinds: string[] } {
  if (o.type === 'page') {
    const t = SET_TYPES[o.set];
    return {
      name: `${t.name} page`,
      text: `Level up: +${t.levelChips} chips, +${t.levelMult} mult`,
      kinds: [],
    };
  }
  const counts = new Map<string, number>();
  for (const k of o.kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
  const parts = [...counts].map(([k, n]) => (n > 1 ? `${n} × ${kindName(k)}` : kindName(k)));
  return {
    name: parts.length > 2 ? `${o.kinds.length} tiles` : parts.join(', '),
    text: parts.join(', '),
    kinds: o.kinds.slice(),
  };
}

export function ShopView({
  run,
  dispatch,
}: {
  run: RunState;
  dispatch: (a: RunAction) => RunEvent[];
}) {
  const shop = run.shop;
  const theme = useStore((s) => s.settings.colourway);
  const [burning, setBurning] = useState(false);
  if (!shop) return null;
  const money = run.money;
  const curiosFull = run.curios.length >= CURIO_SLOTS;
  const pocketFull = run.fortunes.length >= FORTUNE_SLOTS;
  const reroll = rerollPrice(shop);
  const kinds = new Map<string, { tile: Tile; n: number }>();
  for (const t of run.tiles) {
    const e = kinds.get(t.kind);
    if (e) e.n++;
    else kinds.set(t.kind, { tile: t, n: 1 });
  }
  const burnable = [...kinds.values()].sort((a, b) => compareKinds(a.tile.kind, b.tile.kind));

  return (
    <div className="shop" data-testid="shop">
      <h2>
        Teahouse <span>after round {run.roundIndex + 1}</span>
      </h2>

      <section aria-label="Curios">
        <h3>Curios</h3>
        <div className="offers three">
          {shop.curios.map((o, i) => (
            <OfferCard
              key={`${o.item}${i}`}
              {...curioCard(o.item)}
              price={o.price}
              sold={o.sold}
              disabled={money < o.price || curiosFull}
              {...(curiosFull && !o.sold ? { note: 'Row full' } : {})}
              testId={`buy-curio-${i}`}
              onClick={() => dispatch({ type: 'buy', what: 'curio', index: i })}
            />
          ))}
        </div>
      </section>

      <section aria-label="Pages and fortunes">
        <h3>Almanac pages and fortunes</h3>
        <div className="offers four">
          {shop.almanac.map((o, i) => (
            <OfferCard
              key={`a${i}`}
              {...pageCard(o.item)}
              price={o.price}
              sold={o.sold}
              disabled={money < o.price}
              testId={`buy-almanac-${i}`}
              onClick={() => dispatch({ type: 'buy', what: 'almanac', index: i })}
            />
          ))}
          {shop.fortunes.map((o, i) => (
            <OfferCard
              key={`f${i}`}
              {...fortuneCard(o.item)}
              price={o.price}
              sold={o.sold}
              disabled={money < o.price || pocketFull}
              {...(pocketFull && !o.sold ? { note: 'Pocket full' } : {})}
              testId={`buy-fortune-${i}`}
              onClick={() => dispatch({ type: 'buy', what: 'fortune', index: i })}
            />
          ))}
        </div>
      </section>

      <section className="shop-row" aria-label="Pack and services">
        <OfferCard
          {...packCard(shop.pack.item)}
          price={shop.pack.price}
          sold={shop.pack.sold}
          disabled={money < shop.pack.price}
          testId="buy-pack"
          onClick={() => dispatch({ type: 'buy', what: 'pack', index: 0 })}
        />
        <div className="shop-services">
          <button
            type="button"
            className="btn"
            data-testid="btn-reroll"
            disabled={money < reroll}
            onClick={() => dispatch({ type: 'reroll' })}
          >
            Reroll curios ${reroll}
          </button>
          <button
            type="button"
            className="btn"
            data-testid="btn-burn"
            disabled={shop.burned || money < SHOP.burnPrice}
            onClick={() => setBurning(true)}
          >
            {shop.burned ? 'Burned this visit' : `Burn a kind $${SHOP.burnPrice}`}
          </button>
        </div>
      </section>

      <button
        type="button"
        className="btn primary shop-leave"
        data-testid="btn-leave"
        disabled={shop.open !== undefined}
        onClick={() => dispatch({ type: 'leave' })}
      >
        On to {['', 'South', 'West', 'North'][run.roundIndex + 1] ?? 'the next wind'}
      </button>

      {shop.open && (
        <Sheet
          title={`${PACKS[shop.open.pack].name} pack: choose one`}
          onClose={() => dispatch({ type: 'pack', pick: null })}
          testId="sheet-pack"
        >
          <div className="offers pack">
            {shop.open.offers.map((o, i) => {
              const s = offerSummary(o);
              return (
                <OfferCard
                  key={i}
                  glyph={
                    o.type === 'page' ? (
                      <Glyph char={SET_GLYPH[o.set]} />
                    ) : (
                      <span className="mini-tiles">
                        {s.kinds.slice(0, 4).map((k, j) => (
                          <TileView key={j} tile={{ id: -1 - j, kind: k }} theme={theme} />
                        ))}
                      </span>
                    )
                  }
                  name={s.name}
                  text={s.text}
                  price="Take"
                  testId={`pack-offer-${i}`}
                  onClick={() => dispatch({ type: 'pack', pick: i })}
                />
              );
            })}
          </div>
          <button
            type="button"
            className="btn ghost"
            data-testid="btn-pack-skip"
            onClick={() => dispatch({ type: 'pack', pick: null })}
          >
            Skip (no refund)
          </button>
        </Sheet>
      )}

      {burning && (
        <Sheet
          title="Burn a kind: every copy leaves your set"
          onClose={() => setBurning(false)}
          testId="sheet-burn"
        >
          <div className="picker-grid">
            {burnable.map(({ tile, n }) => (
              <button
                key={tile.kind}
                type="button"
                className="picker-tile"
                data-testid={`burn-${tile.kind}`}
                aria-label={`${kindName(tile.kind)}, ${n} copies`}
                onClick={() => {
                  dispatch({ type: 'burn', kind: tile.kind });
                  setBurning(false);
                }}
              >
                <TileView tile={tile} theme={theme} />
                <span className="stack-count">{n}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
