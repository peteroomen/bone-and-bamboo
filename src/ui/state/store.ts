/**
 * App-level state: which screen, settings and the current run. A tiny external store read with
 * useSyncExternalStore. The run is saved after every action (plain JSON), so a reload resumes
 * exactly where you were.
 */
import { useSyncExternalStore } from 'react';
import type { RunState } from '@/engine/runTypes';
import type { ThemeId } from '@/ui/art/tiles';

export type Screen = 'title' | 'game';
export type Speed = 'normal' | 'fast' | 'instant';
/** Help drawn on tiles: off; tiles that make a set glow; also wall tiles that would complete one. */
export type HintLevel = 'off' | 'sets' | 'full';

export interface Settings {
  speed: Speed;
  /** The tile colourway, until the art style trial decides. */
  colourway: ThemeId;
  hints: HintLevel;
}

export interface AppState {
  screen: Screen;
  settings: Settings;
  run: RunState | null;
}

export const DEFAULT_SETTINGS: Settings = {
  speed: 'normal',
  colourway: 'theatre',
  hints: 'sets',
};

export const KEYS = { settings: 'bb.settings.v1', run: 'bb.run.v1', dev: 'bb.dev.v1' };

/** Options for the next new run, for tests and tuning: a fixed seed, targets, tile set, lantern. */
export interface DevOverrides {
  seed?: number;
  targets?: number[];
  tileSet?: string;
  lantern?: number;
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
