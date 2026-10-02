import { getState } from '@/ui/state/store';

/** Short buzzes for plays and the score, when the device and the setting allow. */
export function haptic(pattern: number | number[]): void {
  if (!getState().settings.haptics) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // a browser without vibration: nothing to do
  }
}

export const haptics = {
  take: () => haptic(8),
  play: () => haptic([14, 30, 14]),
  discard: () => haptic(10),
  win: () => haptic([30, 40, 30, 40, 60]),
  lose: () => haptic(120),
};
