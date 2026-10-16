/**
 * App state: the screen, settings and the current run, in a tiny external store read with
 * useSyncExternalStore. Every run action goes through `dispatch`: the engine returns the new
 * state and its events; the events go to the 3D table and the sound (which animate them) and the
 * run is saved (plain JSON), so a reload resumes exactly where you were.
 */
import { useSyncExternalStore } from 'react';
import type { PatternId } from '@/content/patterns';
import { type RunAction, type RunEvent, type RunState, newRun, runReducer } from '@/engine/run';
import type { ThemeId } from '@/ui/art/tiles';

export type Screen = 'title' | 'game';
export type Speed = 'normal' | 'fast' | 'instant';

export interface Settings {
  speed: Speed;
  colourway: ThemeId;
  /** Show the guide's hints: odds, the glow on dice to hold, the target's missing tiles. */
  hints: boolean;
  sfx: number;
  music: number;
  ambience: number;
  haptics: boolean;
  introSeen: boolean;
}

export type Sheet =
  | { kind: 'book' }
  | { kind: 'settings' }
  | { kind: 'die'; dieId: number }
  | { kind: 'charm'; id: string }
  | { kind: 'help' }
  | { kind: 'rack'; index: number }
  | { kind: 'tool'; slot: number }
  | null;

/** A charm being used: pick a die (and then a face, or a die to copy). */
export type CharmMode =
  | { kind: 'tip'; dieId?: number }
  | { kind: 'flip' }
  | { kind: 'fan' }
  | { kind: 'mirror'; dieId?: number }
  | null;

export interface AppState {
  screen: Screen;
  settings: Settings;
  run: RunState | null;
  /** The hand the player is aiming for this hand (guidance only), or null for the guide's pick. */
  target: PatternId | null;
  sheet: Sheet;
  charmMode: CharmMode;
  /** Animations still playing: the HUD waits for 0. */
  busy: number;
  /** Bumped by each dispatch, so views can tell a new event batch. */
  tick: number;
}

export const DEFAULT_SETTINGS: Settings = {
  speed: 'normal',
  colourway: 'theatre',
  hints: true,
  sfx: 0.8,
  music: 0.4,
  ambience: 0.4,
  haptics: true,
  introSeen: false,
};

export const KEYS = {
  settings: 'bb.dice.settings.v1',
  run: 'bb.dice.run.v1',
  dev: 'bb.dev.v1',
};

/** For tests and tuning: a fixed seed and targets for the next run. */
export interface DevOverrides {
  seed?: number;
  targets?: number[];
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
    // storage can be full or blocked (private mode); the game still runs
  }
}

function loadRun(): RunState | null {
  try {
    const raw = localStorage.getItem(KEYS.run);
    if (!raw) return null;
    const run = JSON.parse(raw) as RunState;
    if (!run.targets || run.phase === 'over' || run.phase === 'won') return null;
    return run;
  } catch {
    return null;
  }
}

let state: AppState = {
  screen: 'title',
  settings: load(KEYS.settings, DEFAULT_SETTINGS),
  run: loadRun(),
  target: null,
  sheet: null,
  charmMode: null,
  busy: 0,
  tick: 0,
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

type EventListener = (events: readonly RunEvent[], before: RunState, after: RunState) => void;
const eventListeners = new Set<EventListener>();

/** Hear every batch of engine events (the table animates them, the sound plays them). */
export function onEvents(l: EventListener): () => void {
  eventListeners.add(l);
  return () => eventListeners.delete(l);
}

/** Apply a run action. Returns the problem instead if the engine refuses it. */
export function dispatch(action: RunAction): string | null {
  const run = state.run;
  if (!run) return 'No run.';
  let result;
  try {
    result = runReducer(run, action);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  const patch: Partial<AppState> = { run: result.state, tick: state.tick + 1 };
  // a finished hand or a new round clears the player's target
  if (result.events.some((e) => e.type === 'round' && e.event.type === 'mahjong'))
    patch.target = null;
  if (result.events.some((e) => e.type === 'phase')) {
    patch.target = null;
    patch.charmMode = null;
  }
  setState(patch);
  for (const l of eventListeners) l(result.events, run, result.state);
  return null;
}

export function startRun(seed?: number): void {
  const dev = devOverrides();
  const s = seed ?? dev.seed ?? Math.floor(Math.random() * 1e9);
  const run = newRun({ seed: s, ...(dev.targets ? { targets: dev.targets } : {}) });
  setState({
    run,
    screen: 'game',
    target: null,
    sheet: null,
    charmMode: null,
    tick: state.tick + 1,
  });
}

export function abandonRun(): void {
  setState({ run: null, screen: 'title', sheet: null, charmMode: null });
}

/** Count an animation in, and out when it is done. */
export function busyStart(): void {
  setState((s) => ({ busy: s.busy + 1 }));
}
export function busyEnd(): void {
  setState((s) => ({ busy: Math.max(0, s.busy - 1) }));
}

export function speedFactorOf(speed: Speed): number {
  return speed === 'instant' ? 0 : speed === 'fast' ? 0.55 : 1;
}

export function speedFactor(): number {
  return speedFactorOf(state.settings.speed);
}

export function useTheme(): ThemeId {
  return useStore((s) => s.settings.colourway);
}
