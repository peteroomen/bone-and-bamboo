import type { RunEvent } from '@/engine/run';
import { au, currentVolumes, setVolumes, stats, unlockAudio } from './core';
import { haptics } from './haptics';
import { sfx } from './sfx';

import { currentScene } from './music';

export { currentScene, setScene } from './music';

function sceneLabel(): string {
  const s = currentScene();
  return s ? (s.kind === 'round' ? `round${s.wind ?? 0}` : s.kind) : 'none';
}
export { setVolumes, unlockAudio, sfx, haptics };

declare global {
  interface Window {
    /** For the end-to-end tests: whether the audio context runs, and how much has been scheduled. */
    __bbAudio?: () => {
      state: string;
      sounds: number;
      notes: number;
      volumes: ReturnType<typeof currentVolumes>;
    };
  }
}

/** Expose the test hook (the state of the context and the counters). */
export function installAudioDebug(): void {
  window.__bbAudio = () => ({
    state: au.ctx?.state ?? 'none',
    sounds: stats.sounds,
    notes: stats.notes,
    scene: sceneLabel(),
    volumes: currentVolumes(),
  });
}

/** The sounds and buzzes for what the engine just did (the dice themselves knock as they land). */
export function playEvents(events: readonly RunEvent[]): void {
  for (const e of events) {
    if (e.type === 'money') {
      if (e.delta > 0) sfx.coin();
      continue;
    }
    if (e.type === 'bought' || e.type === 'level' || e.type === 'tool') {
      sfx.tock();
      continue;
    }
    if (e.type !== 'round') continue;
    const ev = e.event;
    switch (ev.type) {
      case 'take':
        if (ev.set.kind === 'kong') sfx.kong();
        else sfx.play(ev.set.tiles.length);
        haptics.play();
        break;
      case 'hold':
        sfx.pick();
        break;
      case 'return':
        sfx.discard(ev.set.tiles.length);
        haptics.discard();
        break;
      case 'crack':
      case 'blank':
        sfx.burn();
        break;
      case 'end':
        if (ev.won) sfx.bank();
        else sfx.lose();
        break;
      default:
        break;
    }
  }
}
