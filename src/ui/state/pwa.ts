/**
 * Installing the game as an app, and whether it's ready to play offline. Chrome, Edge and Android
 * offer an install prompt (`beforeinstallprompt`), kept here for our own Install button; iOS
 * Safari has none, only Share → Add to Home Screen. The service worker precaches the whole game
 * before it activates, so an active worker means the game is on the device.
 */
import { useSyncExternalStore } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type OfflineStatus = 'unavailable' | 'preparing' | 'ready';

export interface PwaState {
  /** Running as an installed app (home screen or desktop window). */
  installed: boolean;
  /** The browser has an install prompt waiting for our button. */
  canPrompt: boolean;
  /** iOS or iPadOS: installed by hand from Safari's Share menu. */
  ios: boolean;
  offline: OfflineStatus;
}

let prompt: InstallPromptEvent | null = null;
let state: PwaState = {
  installed: false,
  canPrompt: false,
  ios: false,
  offline: 'unavailable',
};
const listeners = new Set<() => void>();

function set(patch: Partial<PwaState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function standalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Asks the browser not to clear our saves when space runs low. Quietly does nothing if refused. */
function keepSaves(): void {
  void navigator.storage?.persist?.().catch(() => false);
}

/** Call once at start-up, before anything renders; `worker` is whether a service worker is used. */
export function initPwa(worker: boolean): void {
  set({ installed: standalone(), ios: isIos() });
  if (state.installed) keepSaves();
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    prompt = e as InstallPromptEvent;
    set({ canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    prompt = null;
    set({ canPrompt: false, installed: true });
    keepSaves();
  });
  if (worker && 'serviceWorker' in navigator) {
    set({ offline: 'preparing' });
    void navigator.serviceWorker.ready.then(() => set({ offline: 'ready' }));
  }
}

/** Opens the browser's install prompt. Resolves true if the player installed. */
export async function promptInstall(): Promise<boolean> {
  const p = prompt;
  if (!p) return false;
  keepSaves();
  prompt = null;
  set({ canPrompt: false });
  await p.prompt();
  const { outcome } = await p.userChoice;
  return outcome === 'accepted';
}

/** Something to offer on the title: a waiting prompt, or iOS Safari before it's installed. */
export function canOfferInstall(s: PwaState): boolean {
  return !s.installed && (s.canPrompt || s.ios);
}

export function pwaState(): PwaState {
  return state;
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}
