/**
 * App-level state: which screen, settings and the current run. A tiny external store read with
 * useSyncExternalStore. The run is saved after every action (plain JSON), so a reload resumes
 * exactly where you were.
 */
import { useSyncExternalStore } from 'react';
import type { ColourwayId } from '@/content/colourways';
import {
  DEFAULT_PROFILE,
  type Profile,
  migrateProfile,
  unlockedColourways,
} from '@/engine/profile';
import type { RunState } from '@/engine/runTypes';
import type { ThemeId } from '@/ui/art/tiles';

export { DEFAULT_PROFILE };
export type { Profile };

export type Screen = 'title' | 'setup' | 'game' | 'collection' | 'settings';
export type Speed = 'normal' | 'fast' | 'instant';
/** Help drawn on tiles: off; tiles that make a set glow; also wall tiles that would complete one. */
export type HintLevel = 'off' | 'sets' | 'full';

export interface Settings {
  speed: Speed;
  /** The tile colourway, until the art style trial decides. */
  colourway: ThemeId;
  hints: HintLevel;
  sfx: number;
  music: number;
  /** The soundscape under the music. */
  ambience: number;
  haptics: boolean;
  /** The introduction has been shown once (it can always be replayed from Help). */
  introSeen: boolean;
}

export interface AppState {
  screen: Screen;
  settings: Settings;
  profile: Profile;
  run: RunState | null;
}

export const DEFAULT_SETTINGS: Settings = {
  speed: 'normal',
  colourway: 'theatre',
  hints: 'sets',
  sfx: 0.8,
  music: 0.5,
  ambience: 0.5,
  haptics: true,
  introSeen: false,
};

export const KEYS = {
  settings: 'bb.settings.v1',
  profile: 'bb.profile.v1',
  run: 'bb.run.v1',
  dev: 'bb.dev.v1',
};

/** Options for the next new run, for tests and tuning: a fixed seed, targets, tile set, lantern. */
export interface DevOverrides {
  seed?: number;
  targets?: number[];
  tileSet?: string;
  lantern?: number;
  /** Unlock every colourway, tile set and lantern (for tests and screenshots; never on by default). */
  unlockAll?: boolean;
}

export function devOverrides(): DevOverrides {
  try {
    return JSON.parse(localStorage.getItem(KEYS.dev) ?? '{}') as DevOverrides;
  } catch {
    return {};
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return typeof fallback === 'object' && fallback !== null ? { ...fallback, ...parsed } : parsed;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); the game still runs.
  }
}

function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(KEYS.run);
    if (!raw) return null;
    const run = JSON.parse(raw) as RunState;
    if (run.version !== 1 || run.phase === 'over' || run.phase === 'won') return null;
    return run;
  } catch {
    return null;
  }
}

let state: AppState = {
  screen: 'title',
  settings: load(KEYS.settings, DEFAULT_SETTINGS),
  profile: migrateProfile(load<Partial<Profile>>(KEYS.profile, {})),
  run: loadRun(),
};

const listeners = new Set<() => void>();

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  const next = typeof patch === 'function' ? patch(state) : patch;
  const prev = state;
  state = { ...state, ...next };
  if (next.settings && next.settings !== prev.settings) save(KEYS.settings, state.settings);
  if (next.profile && next.profile !== prev.profile) save(KEYS.profile, state.profile);
  if ('run' in next && next.run !== prev.run) save(KEYS.run, state.run);
  for (const l of listeners) l();
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(state),
  );
}

export function updateProfile(patch: Partial<Profile>): void {
  setState((s) => ({ profile: { ...s.profile, ...patch } }));
}

export function updateSettings(patch: Partial<Settings>): void {
  setState((s) => ({ settings: { ...s.settings, ...patch } }));
}

/**
 * Animation timing multiplier for a speed setting. Timings in the code are written at 'normal'.
 * 'instant' skips animation waits entirely.
 */
export function speedFactorOf(speed: Speed): number {
  return speed === 'instant' ? 0 : speed === 'fast' ? 0.5 : 1;
}

export function speedFactor(): number {
  return speedFactorOf(state.settings.speed);
}

/** Every colourway, tile set and lantern is open (the development flag). */
export function allUnlocked(): boolean {
  return devOverrides().unlockAll === true;
}

/** The colourway in use: the chosen one if it is unlocked, else the first. */
export function effectiveColourway(settings: Settings, profile: Profile): ColourwayId {
  const open = unlockedColourways(profile, allUnlocked());
  return open.includes(settings.colourway) ? settings.colourway : 'theatre';
}

export function useTheme(): ThemeId {
  const settings = useStore((s) => s.settings);
  const profile = useStore((s) => s.profile);
  return effectiveColourway(settings, profile);
}

export function updateProfileWith(fn: (p: Profile) => Profile): void {
  setState((s) => {
    const next = fn(s.profile);
    return next === s.profile ? {} : { profile: next };
  });
}

/** Replaces settings, profile and the current run with a transferred save. */
export function replaceSave(data: Pick<AppState, 'settings' | 'profile' | 'run'>): void {
  setState({ ...data, screen: 'title' });
}

export function resetProgress(): void {
  setState({ profile: { ...DEFAULT_PROFILE }, run: null, screen: 'title' });
}
