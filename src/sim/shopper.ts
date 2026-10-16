import { CHARMS, CHARM_SLOTS } from '@/content/charms';
import { TOOLS } from '@/content/tools';
import type { SuitedSuit, TileKind } from '@/content/tiles';
import type { Die } from '@/engine/dice';
import type { Rng } from '@/engine/rng';
import { cupSize } from '@/engine/round';
import { type RunAction, type RunState, runProblem } from '@/engine/run';
import { isHonour, isSuited, rankOf, suitOf } from '@/engine/tiles';
import type { ToolArg } from '@/engine/tools';

/**
 * Simulator shoppers. `smart` follows one plain plan: make the dice one suit (the suit most of
 * them already lean to), buy the charms that score, and keep money for interest when nothing is
 * worth it. `casual` buys whatever it can afford, at random. Neither looks at hidden state.
 */
export type Shopper = 'smart' | 'casual' | 'none';

const CHARM_VALUE: Record<string, number> = {
  thumb: 8,
  mirror: 9,
  fan: 5,
  shell: 6,
  bead: 2,
  redString: 6,
  secondCup: 10,
  hourglass: 6,
  inkStone: 1,
  magpie: 2,
  almanac: 1,
  goldToad: 4,
  luckyKnot: 6,
  coinString: 5,
  abacus: 6,
  nest: 4,
  bambooGrove: 7,
  coinPurse: 3,
  scroll: 3,
  moonGate: 3,
  windChime: 1,
  bellHall: 5,
  riceBowl: 6,
  stoneLion: 5,
  greatBell: 2,
  twinCranes: 7,
};

export function mainSuit(dice: readonly Die[]): SuitedSuit {
  const n: Record<SuitedSuit, number> = { p: 0, s: 0, m: 0 };
  for (const d of dice)
    for (const f of d.faces) if (f.kind && isSuited(f.kind)) n[suitOf(f.kind) as SuitedSuit]++;
  return (Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 's') as SuitedSuit;
}

/** How well a die suits a one-suit cup: the share of its faces in that suit (honours count half). */
export function dieFit(d: Die, suit: SuitedSuit): number {
  let v = 0;
  for (const f of d.faces) {
    if (!f.kind) continue;
    if (isSuited(f.kind) && suitOf(f.kind) === suit) v += 1 + (f.weight ?? 1) * 0.1;
    else if (isHonour(f.kind)) v += 0.3;
  }
  return v / d.faces.length;
}

function weakestDie(dice: readonly Die[], suit: SuitedSuit): Die | undefined {
  return dice.slice().sort((a, b) => dieFit(a, suit) - dieFit(b, suit))[0];
}

/** A face to work on with a tool, and what to pass it. */
function toolTarget(
  run: RunState,
  toolId: string,
): { dieId: number; face: number; arg?: ToolArg } | null {
  const suit = mainSuit(run.dice);
  const op = TOOLS[toolId]?.op.type;
  for (const d of run.dice) {
    for (let i = 0; i < d.faces.length; i++) {
      const f = d.faces[i];
      const k = f?.kind as TileKind | null;
      if (op === 'brush' && k && isSuited(k) && suitOf(k) !== suit)
        return { dieId: d.id, face: i, arg: { suit } };
      if (op === 'chisel' && (!k || (isSuited(k) && suitOf(k) !== suit)))
        return { dieId: d.id, face: i, arg: { kind: `${suit}5` } };
    }
  }
  if (op === 'lead' || op === 'enhance') {
    // the middle of the main suit on the die that fits best
    const best = run.dice.slice().sort((a, b) => dieFit(b, suit) - dieFit(a, suit))[0];
    if (!best) return null;
    const i = best.faces.findIndex(
      (f) =>
        f.kind &&
        isSuited(f.kind) &&
        suitOf(f.kind) === suit &&
        rankOf(f.kind) >= 4 &&
        rankOf(f.kind) <= 6 &&
        !f.enh &&
        (f.weight ?? 1) < 3,
    );
    if (i >= 0) return { dieId: best.id, face: i };
  }
  return null;
}

/** The shopper's next action in the gift or the teahouse, or 'next' when it is done. */
export function shopStep(run: RunState, who: Shopper, rng: Rng): RunAction {
  const ok = (a: RunAction) => !runProblem(run, a);
  if (run.phase === 'gift') {
    const gift = run.gift ?? [];
    if (who === 'none') return { type: 'skipGift' };
    const suit = mainSuit(run.dice);
    const full = run.dice.length >= cupSize(run.charms);
    const weak = weakestDie(run.dice, suit);
    let bestI = -1;
    let bestV = full ? dieFit(weak as Die, suit) + 0.05 : 0;
    gift.forEach((g, i) => {
      const v = who === 'casual' ? rng.next() : dieFit(g, suit);
      if (v > bestV) {
        bestV = v;
        bestI = i;
      }
    });
    if (bestI < 0) return { type: 'skipGift' };
    return full
      ? { type: 'pickGift', index: bestI, replace: weak?.id as number }
      : { type: 'pickGift', index: bestI };
  }
  if (run.phase !== 'shop' || !run.shop) return { type: 'next' };
  if (who === 'none') return { type: 'next' };

  // use tools in the pocket first
  for (let slot = 0; slot < run.tools.length; slot++) {
    const t = toolTarget(run, run.tools[slot] as string);
    if (t) {
      const a: RunAction = { type: 'useTool', slot, ...t };
      if (ok(a)) return a;
    }
  }

  const shop = run.shop;
  if (who === 'casual') {
    const opts: RunAction[] = [];
    shop.charms.forEach((_, i) => opts.push({ type: 'buyCharm', index: i }));
    shop.tools.forEach((_, i) => opts.push({ type: 'buyTool', index: i }));
    shop.pages.forEach((_, i) => opts.push({ type: 'buyPage', index: i }));
    const legal = opts.filter(ok);
    if (legal.length > 0 && rng.next() < 0.7) return rng.pick(legal);
    return { type: 'next' };
  }

  const suit = mainSuit(run.dice);
  // keep a little for interest once the build is going
  const reserve = run.round >= 3 ? 5 : 0;
  const spend = (price: number) => run.money - price >= reserve;
  // charms
  let bestCharm = -1;
  let bestCharmV = 0;
  shop.charms.forEach((o, i) => {
    if (o.sold || o.price > run.money) return;
    let v = CHARM_VALUE[o.item] ?? 1;
    const fx = CHARMS[o.item]?.effect;
    if (fx?.type === 'chipsPerSuitTile') v = fx.suit === suit ? 7 : 1;
    if (v > bestCharmV) {
      bestCharmV = v;
      bestCharm = i;
    }
  });
  if (bestCharm >= 0) {
    const o = shop.charms[bestCharm];
    if (o && spend(o.price)) {
      if (run.charms.length < CHARM_SLOTS) return { type: 'buyCharm', index: bestCharm };
      const worst = run.charms
        .slice()
        .sort((a, b) => (CHARM_VALUE[a] ?? 1) - (CHARM_VALUE[b] ?? 1))[0];
      if (
        worst &&
        (CHARM_VALUE[worst] ?? 1) + 2 < bestCharmV &&
        CHARMS[worst]?.effect.type !== 'cup'
      )
        return { type: 'buyCharm', index: bestCharm, replace: worst };
    }
  }
  // dice that fit the suit better than the weakest one
  const full = run.dice.length >= cupSize(run.charms);
  const weak = weakestDie(run.dice, suit);
  for (let i = 0; i < shop.dice.length; i++) {
    const o = shop.dice[i];
    if (!o || o.sold || o.price > run.money) continue;
    const gain = dieFit(o.item, suit) - (full ? dieFit(weak as Die, suit) : 0);
    if (gain > 0.25 && spend(o.price)) {
      const a: RunAction = full
        ? { type: 'buyDie', index: i, replace: weak?.id as number }
        : { type: 'buyDie', index: i };
      if (ok(a)) return a;
    }
  }
  // tools that push the suit
  for (let i = 0; i < shop.tools.length; i++) {
    const o = shop.tools[i];
    if (!o || o.sold) continue;
    const useful = ['brush', 'chisel', 'lead', 'jadeLeaf', 'boneInlay', 'glaze'].includes(o.item);
    if (useful && toolTarget(run, o.item) && spend(o.price)) {
      const a: RunAction = { type: 'buyTool', index: i };
      if (ok(a)) return a;
    }
  }
  // pages for the hands it plays
  for (let i = 0; i < shop.pages.length; i++) {
    const o = shop.pages[i];
    if (!o || o.sold) continue;
    if (['chicken', 'fullFlush', 'allChows', 'allSimples'].includes(o.item) && spend(o.price)) {
      const a: RunAction = { type: 'buyPage', index: i };
      if (ok(a)) return a;
    }
  }
  return { type: 'next' };
}
