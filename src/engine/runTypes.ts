import type { FortuneId } from '@/content/fortunes';
import type { PackId } from '@/content/packs';
import type { SetKind } from '@/content/sets';
import type { SuitedSuit, TileKind } from '@/content/tiles';
import type { Policy } from './ai';
import type { RoundAction, RoundEvent, RoundState } from './round';
import type { Levels } from './scoring';
import type { Tile } from './tiles';

export type RunPhase = 'host' | 'round' | 'payout' | 'gift' | 'shop' | 'over' | 'won';

export interface ShopItem<T> {
  readonly item: T;
  readonly price: number;
  readonly sold: boolean;
}

export type PackOffer =
  | { readonly type: 'tiles'; readonly kinds: readonly TileKind[] }
  | { readonly type: 'page'; readonly set: SetKind };

export interface OpenPack {
  readonly pack: PackId;
  readonly offers: readonly PackOffer[];
}

export interface ShopState {
  readonly dragons: readonly ShopItem<string>[];
  readonly almanac: readonly ShopItem<SetKind>[];
  readonly fortunes: readonly ShopItem<FortuneId>[];
  readonly pack: ShopItem<PackId>;
  /** The pack being opened, if any. */
  readonly open?: OpenPack;
  readonly rerolls: number;
  readonly burned: boolean;
}

export interface GiftState {
  readonly offers: readonly string[];
  /** Money the gift came with (the great storm's $5), already paid. */
  readonly bonus: number;
}

export interface Payout {
  readonly reward: number;
  readonly discards: number;
  readonly interest: number;
  readonly income: number;
  readonly gold: number;
  readonly total: number;
}

export interface RunStats {
  /** Best single set's score contribution is not tracked; the best round score is. */
  readonly bestRound: number;
  readonly roundsWon: number;
  /** The best single set's points (its chips × its mult). */
  readonly bigSet: number;
}

export interface RunState {
  readonly version: 1;
  readonly seed: number;
  /** Shop and pack randomness. */
  readonly rng: number;
  readonly tileSet: string;
  readonly lantern: number;
  /** The base targets for the four rounds (lantern 1). */
  readonly targets: readonly number[];
  /** Which packs the teahouse may sell (the simulator trims it to match the Python prototype). */
  readonly packPool: readonly PackId[];
  /** Every physical tile in your set. */
  readonly tiles: readonly Tile[];
  readonly nextTileId: number;
  readonly money: number;
  readonly dragons: readonly string[];
  readonly fortunes: readonly FortuneId[];
  readonly levels: Levels;
  /** 0-3: East, South, West, North. */
  readonly roundIndex: number;
  readonly phase: RunPhase;
  /** The host chosen for the current round. */
  readonly hostId: string | null;
  readonly storm: boolean;
  readonly target: number;
  readonly round: RoundState | null;
  readonly payout: Payout | null;
  readonly gift: GiftState | null;
  readonly shop: ShopState | null;
  /** Score of each round played so far. */
  readonly scores: readonly number[];
  readonly stats: RunStats;
  /** The first-run lesson: a fixed seed, a plain East round and the guide's tips. */
  /** The host chosen for each round so far. */
  readonly hostIds: readonly string[];
  /** The hosts whose rounds you have beaten this run. */
  readonly hostsBeaten: readonly string[];
  /** The run has been folded into the profile (it is done once). */
  readonly recorded: boolean;
  readonly guided: boolean;
  /** The guide's tips already shown this run. */
  readonly tipsSeen: readonly string[];
}

export interface FortuneArgs {
  readonly tileIds: readonly number[];
  readonly suit?: SuitedSuit;
}

export type RunAction =
  | { readonly type: 'chooseHost'; readonly storm: boolean }
  | { readonly type: 'round'; readonly action: RoundAction }
  | { readonly type: 'auto'; readonly policy?: Policy }
  | { readonly type: 'continue' }
  | { readonly type: 'gift'; readonly pick: number | null; readonly replace?: number }
  | {
      readonly type: 'buy';
      readonly what: 'dragon' | 'almanac' | 'fortune' | 'pack';
      readonly index: number;
    }
  | { readonly type: 'pack'; readonly pick: number | null }
  | { readonly type: 'reroll' }
  | { readonly type: 'burn'; readonly kind: TileKind }
  | { readonly type: 'sell'; readonly index: number }
  | {
      readonly type: 'fortune';
      readonly index: number;
      readonly args: FortuneArgs;
    }
  | { readonly type: 'leave' }
  /** The guide's tip has been read. */
  | { readonly type: 'tip'; readonly id: string }
  /** The finished run has been written to the profile. */
  | { readonly type: 'record' };

export type RunEvent =
  | { readonly type: 'round'; readonly event: RoundEvent }
  | { readonly type: 'phase'; readonly phase: RunPhase }
  | { readonly type: 'money'; readonly delta: number }
  | { readonly type: 'illegal'; readonly reason: string };
