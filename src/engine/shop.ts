import { CURIO_IDS, CURIO_WEIGHT, CURIOS, curioPrice } from '@/content/curios';
import { FORTUNE_IDS, FORTUNE_PRICE } from '@/content/fortunes';
import { PACKS, PACK_CHOICES, type PackId } from '@/content/packs';
import { ALMANAC_POOL, ALMANAC_PRICE } from '@/content/sets';
import { SHOP } from '@/content/rules';
import { DRAGONS, HONOURS, WINDS, type TileKind } from '@/content/tiles';
import type { Rng } from './rng';
import type { OpenPack, PackOffer, RunState, ShopItem, ShopState } from './runTypes';
import { countKinds } from './tiles';

function item<T>(it: T, price: number): ShopItem<T> {
  return { item: it, price, sold: false };
}

/** Roll the curio offers: weighted by rarity, never one you own, no repeats. */
export function rollCurios(owned: readonly string[], rng: Rng): ShopItem<string>[] {
  const pool = CURIO_IDS.filter((id) => !owned.includes(id));
  const out: ShopItem<string>[] = [];
  while (out.length < SHOP.curios && pool.length > 0) {
    const id = rng.weighted(
      pool,
      (c) => CURIO_WEIGHT[(CURIOS[c] as { rarity: 'common' | 'uncommon' | 'rare' }).rarity],
    );
    pool.splice(pool.indexOf(id), 1);
    out.push(item(id, curioPrice(id)));
  }
  return out;
}

/** The offers a pack shows when opened. Empty if it has nothing to offer you. */
export function packOffers(pack: PackId, run: RunState, rng: Rng): PackOffer[] {
  switch (pack) {
    case 'fourth': {
      const counts = countKinds(run.tiles);
      const threes = [...counts].filter(([, n]) => n === 3).map(([k]) => k);
      const picks: TileKind[] = [];
      const pool = threes.slice();
      while (picks.length < PACK_CHOICES && pool.length > 0) {
        const k = rng.pick(pool);
        pool.splice(pool.indexOf(k), 1);
        picks.push(k);
      }
      return picks.map((k) => ({ type: 'tiles', kinds: [k] }));
    }
    case 'dragons':
      return [
        { type: 'tiles', kinds: DRAGONS },
        ...DRAGONS.map((d): PackOffer => ({ type: 'tiles', kinds: [d, d] })),
      ];
    case 'winds':
      return [
        { type: 'tiles', kinds: WINDS },
        ...WINDS.map((w): PackOffer => ({ type: 'tiles', kinds: [w, w] })),
      ];
    case 'honour': {
      const pool = HONOURS.slice();
      const out: PackOffer[] = [];
      while (out.length < PACK_CHOICES) {
        const h = rng.pick(pool);
        pool.splice(pool.indexOf(h), 1);
        out.push({ type: 'tiles', kinds: [h, h, h] });
      }
      return out;
    }
    case 'almanac': {
      const pool = ALMANAC_POOL.slice();
      const out: PackOffer[] = [];
      while (out.length < PACK_CHOICES && pool.length > 0) {
        const s = rng.pick(pool);
        pool.splice(pool.indexOf(s), 1);
        out.push({ type: 'page', set: s });
      }
      return out;
    }
  }
}

export function openPack(pack: PackId, run: RunState, rng: Rng): OpenPack {
  return { pack, offers: packOffers(pack, run, rng) };
}

/** Pick the visit's pack: any pack that has something to offer. */
function rollPack(run: RunState, rng: Rng): PackId {
  const options = run.packPool.slice();
  while (options.length > 1) {
    const p = rng.pick(options);
    if (packOffers(p, run, rng).length > 0) return p;
    options.splice(options.indexOf(p), 1);
  }
  return options[0] as PackId;
}

export function rollShop(run: RunState, rng: Rng): ShopState {
  const almanac = Array.from({ length: SHOP.almanac }, () =>
    item(rng.pick(ALMANAC_POOL), ALMANAC_PRICE),
  );
  const fortunes = rng
    .shuffle(FORTUNE_IDS)
    .slice(0, SHOP.fortunes)
    .map((f) => item(f, FORTUNE_PRICE));
  const pack = rollPack(run, rng);
  return {
    curios: rollCurios(run.curios, rng),
    almanac,
    fortunes,
    pack: item(pack, PACKS[pack].price),
    rerolls: 0,
    burned: false,
  };
}

export function rerollPrice(shop: ShopState): number {
  return SHOP.rerollBase + SHOP.rerollStep * shop.rerolls;
}

export function sellPrice(curioId: string): number {
  return Math.floor(curioPrice(curioId) * SHOP.sellFraction);
}
