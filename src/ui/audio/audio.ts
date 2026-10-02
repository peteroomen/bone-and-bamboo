import type { RunEvent, RunState } from '@/engine/runTypes';
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

/** The sounds and buzzes for what the engine just did. */
export function playEvents(events: readonly RunEvent[], _run?: RunState): void {
  let drew = false;
  for (const e of events) {
    if (e.type === 'money') {
      if (e.delta > 0) sfx.coin();
      continue;
    }
    if (e.type !== 'round') continue;
    const ev = e.event;
    switch (ev.type) {
      case 'draw':
        // a refill is many draws at once: one clack for the lot
        if (!drew) {
          sfx.take();
          haptics.take();
        }
        drew = true;
        break;
      case 'play':
        sfx.play(ev.tiles.length);
        haptics.play();
        break;
      case 'discard':
        sfx.discard(ev.tiles.length);
        haptics.discard();
        break;
      case 'upgrade':
        sfx.kong();
        haptics.play();
        break;
      case 'finish':
        sfx.bank();
        break;
      case 'swap':
        sfx.swap();
        break;
      case 'burn':
        sfx.burn();
        break;
      case 'tide':
        sfx.swap();
        break;
      default:
        break;
    }
  }
}
