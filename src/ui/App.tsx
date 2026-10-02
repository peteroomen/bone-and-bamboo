import { useEffect } from 'react';
import { GameScreen } from '@/ui/game/GameScreen';
import { installAudioDebug, setScene, setVolumes, sfx, unlockAudio } from '@/ui/audio/audio';
import { Collection } from '@/ui/screens/Collection';
import { SettingsScreen } from '@/ui/screens/SettingsScreen';
import { Setup } from '@/ui/screens/Setup';
import { Title } from '@/ui/screens/Title';
import { setState, useStore } from '@/ui/state/store';

export function App() {
  const screen = useStore((s) => s.screen);
  const run = useStore((s) => s.run);
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    installAudioDebug();
  }, []);

  // Instant speed switches every CSS animation and transition off.
  useEffect(() => {
    document.documentElement.dataset.speed = settings.speed;
  }, [settings.speed]);

  useEffect(() => {
    setVolumes(settings.sfx, settings.music, settings.ambience);
  }, [settings.sfx, settings.music, settings.ambience]);

  // Every button knocks like a small block of wood; a hand tile clacks. One listener for all.
  // The first touch also wakes the audio (browsers need a gesture).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      unlockAudio();
      const b = (e.target as HTMLElement | null)?.closest('button');
      if (!b || b.disabled || b.hasAttribute('data-quiet')) return;
      if (b.classList.contains('hand-tile')) sfx.pick();
      else sfx.tock();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  // the score under each screen: a wind's mode in a round, a calm one in the teahouse
  const phase = run?.phase;
  const wind = run?.roundIndex ?? 0;
  useEffect(() => {
    if (screen !== 'game' || !phase) setScene({ kind: 'title' });
    else if (phase === 'shop' || phase === 'gift') setScene({ kind: 'shop' });
    else if (phase === 'over') setScene({ kind: 'over' });
    else if (phase === 'won') setScene({ kind: 'won' });
    else setScene({ kind: 'round', wind });
  }, [screen, phase, wind]);

  if (screen === 'game' && run)
    return <GameScreen onExit={() => setState({ screen: 'title', run: null })} />;
  if (screen === 'setup') return <Setup />;
  if (screen === 'collection') return <Collection />;
  if (screen === 'settings') return <SettingsScreen />;
  return <Title />;
}
