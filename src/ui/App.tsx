import { useEffect } from 'react';
import { installAudioDebug, setVolumes, unlockAudio } from '@/ui/audio/audio';
import { GameScreen } from '@/ui/game/GameScreen';
import { Title } from '@/ui/screens/Title';
import { installTestHooks } from '@/ui/state/testHooks';
import { getState, useStore } from '@/ui/state/store';

export function App() {
  const screen = useStore((s) => s.screen);
  const theme = useStore((s) => s.settings.colourway);
  useEffect(() => {
    const s = getState().settings;
    setVolumes(s.sfx, s.music, s.ambience);
    installAudioDebug();
    installTestHooks();
    const wake = () => unlockAudio();
    window.addEventListener('pointerdown', wake, { once: true });
    return () => window.removeEventListener('pointerdown', wake);
  }, []);
  return (
    <div className="app" data-theme={theme}>
      {screen === 'game' ? <GameScreen /> : <Title />}
    </div>
  );
}
