import { COLOURWAYS, type ColourwayId } from '@/content/colourways';
import { DRAGON_IDS } from '@/content/dragons';
import { HOSTS } from '@/content/hosts';
import { LANTERNS } from '@/content/targets';
import { TILE_SETS } from '@/content/tilesets';
import type { RunState } from './runTypes';

/**
 * What the player has done across runs: the records, what they have met, and from those what is
 * unlocked (tile sets, lanterns and colourways). Plain JSON; saved beside the settings.
 */
export interface Profile {
  /** The guided first run has been played. */
  guidedDone: boolean;
  runsPlayed: number;
  runsWon: number;
  bestRound: number;
  /** Total of the four rounds of the best won run. */
  bestRun: number;
  /** The best single set's points (chips × mult). */
  bigSet: number;
  /** Storm hosts whose rounds you have beaten (the great storms you have calmed). */
  stormsBeaten: string[];
  hostsMet: string[];
  dragonsSeen: string[];
  dragonsOwned: string[];
  /** Tile sets you have won a run with. */
  tileSetWins: string[];
  /** The highest lantern lit for each tile set. */
  lanterns: Record<string, number>;
}

export const DEFAULT_PROFILE: Profile = {
  guidedDone: false,
  runsPlayed: 0,
  runsWon: 0,
  bestRound: 0,
  bestRun: 0,
  bigSet: 0,
  stormsBeaten: [],
  hostsMet: [],
  dragonsSeen: [],
  dragonsOwned: [],
  tileSetWins: [],
  lanterns: {},
};

export type Unlock =
  | { readonly kind: 'tileSet'; readonly id: string; readonly name: string }
  | { readonly kind: 'lantern'; readonly tileSet: string; readonly level: number }
  | { readonly kind: 'colourway'; readonly id: ColourwayId; readonly name: string };

const STORM_IDS = HOSTS.filter((h) => h.storm).map((h) => h.id);
/** Storm hosts you must have beaten for Jade Court. */
export const JADE_COURT_STORMS = 3;

export function tileSetUnlocked(p: Profile, id: string): boolean {
  const def = TILE_SETS.find((t) => t.id === id);
  if (!def) return false;
  switch (def.unlock.kind) {
    case 'start':
      return true;
    case 'win':
      return p.runsWon >= 1;
    case 'hosts':
      return p.stormsBeaten.length >= def.unlock.n;
  }
}

export function tileSetCondition(id: string): string {
  const def = TILE_SETS.find((t) => t.id === id);
  if (!def) return '';
  switch (def.unlock.kind) {
    case 'start':
      return 'From the start';
    case 'win':
      return 'Win a run';
    case 'hosts':
      return `Beat ${def.unlock.n} different storms`;
  }
}

export function colourwayUnlocked(p: Profile, id: ColourwayId): boolean {
  const def = COLOURWAYS.find((c) => c.id === id);
  if (!def) return false;
  switch (def.unlock.kind) {
    case 'start':
      return true;
    case 'win':
      return p.runsWon >= 1;
    case 'storms':
      return STORM_IDS.every((h) => p.stormsBeaten.includes(h));
  }
}

export function unlockedColourways(p: Profile, all = false): ColourwayId[] {
  return COLOURWAYS.filter((c) => all || colourwayUnlocked(p, c.id)).map((c) => c.id);
}

/** The highest lantern you may start a tile set at. */
export function lanternReached(p: Profile, tileSet: string): number {
  return Math.max(1, Math.min(LANTERNS.length, p.lanterns[tileSet] ?? 1));
}

function snapshot(p: Profile) {
  return {
    sets: TILE_SETS.filter((t) => tileSetUnlocked(p, t.id)).map((t) => t.id),
    colourways: unlockedColourways(p),
    lanterns: { ...p.lanterns },
  };
}

const union = (a: readonly string[], b: readonly string[]) => [...new Set([...a, ...b])];

/** Fold a finished run into the profile; returns the new profile and what it unlocked. */
export function foldRun(p: Profile, run: RunState): { profile: Profile; unlocks: Unlock[] } {
  const won = run.phase === 'won';
  const before = snapshot(p);
  const total = run.scores.reduce((a, b) => a + b, 0);
  const next: Profile = {
    ...p,
    runsPlayed: p.runsPlayed + 1,
    runsWon: p.runsWon + (won ? 1 : 0),
    bestRound: Math.max(p.bestRound, run.stats.bestRound),
    bestRun: won ? Math.max(p.bestRun, total) : p.bestRun,
    bigSet: Math.max(p.bigSet, run.stats.bigSet),
    stormsBeaten: union(
      p.stormsBeaten,
      run.hostsBeaten.filter((h) => STORM_IDS.includes(h)),
    ),
    hostsMet: union(p.hostsMet, run.hostIds),
    dragonsSeen: union(p.dragonsSeen, run.dragons),
    dragonsOwned: union(p.dragonsOwned, run.dragons),
    tileSetWins: won ? union(p.tileSetWins, [run.tileSet]) : p.tileSetWins,
    lanterns: won
      ? {
          ...p.lanterns,
          [run.tileSet]: Math.min(
            LANTERNS.length,
            Math.max(p.lanterns[run.tileSet] ?? 1, run.lantern + 1),
          ),
        }
      : p.lanterns,
  };
  const after = snapshot(next);
  const unlocks: Unlock[] = [];
  for (const id of after.sets.filter((s) => !before.sets.includes(s)))
    unlocks.push({ kind: 'tileSet', id, name: TILE_SETS.find((t) => t.id === id)?.name ?? id });
  for (const id of after.colourways.filter((c) => !before.colourways.includes(c)))
    unlocks.push({ kind: 'colourway', id, name: COLOURWAYS.find((c) => c.id === id)?.name ?? id });
  for (const [tileSet, level] of Object.entries(after.lanterns))
    if (level > (before.lanterns[tileSet] ?? 1)) unlocks.push({ kind: 'lantern', tileSet, level });
  return { profile: next, unlocks };
}

/** What you have seen of the dragons and hosts so far in this run (the teahouse, the gift, your row). */
export function noteRun(p: Profile, run: RunState): Profile {
  const seen = new Set(p.dragonsSeen);
  const owned = new Set(p.dragonsOwned);
  for (const o of run.shop?.dragons ?? []) seen.add(o.item);
  for (const id of run.gift?.offers ?? []) seen.add(id);
  for (const id of run.dragons) {
    seen.add(id);
    owned.add(id);
  }
  const met = new Set([...p.hostsMet, ...run.hostIds]);
  if (
    seen.size === p.dragonsSeen.length &&
    owned.size === p.dragonsOwned.length &&
    met.size === p.hostsMet.length
  )
    return p;
  return {
    ...p,
    dragonsSeen: [...seen].filter((id) => DRAGON_IDS.includes(id)),
    dragonsOwned: [...owned].filter((id) => DRAGON_IDS.includes(id)),
    hostsMet: [...met],
  };
}

/** Fill in anything a saved profile lacks (older versions, hand-edited saves). */
export function migrateProfile(saved: Partial<Profile> | null | undefined): Profile {
  return { ...DEFAULT_PROFILE, ...saved, lanterns: { ...(saved?.lanterns ?? {}) } };
}
