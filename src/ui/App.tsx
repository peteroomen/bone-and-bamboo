import { GameScreen } from '@/ui/game/GameScreen';
import { Collection } from '@/ui/screens/Collection';
import { SettingsScreen } from '@/ui/screens/SettingsScreen';
import { Setup } from '@/ui/screens/Setup';
import { Title } from '@/ui/screens/Title';
import { setState, useStore } from '@/ui/state/store';

export function App() {
  const screen = useStore((s) => s.screen);
  const run = useStore((s) => s.run);
  if (screen === 'game' && run)
    return <GameScreen onExit={() => setState({ screen: 'title', run: null })} />;
  if (screen === 'setup') return <Setup />;
  if (screen === 'collection') return <Collection />;
  if (screen === 'settings') return <SettingsScreen />;
  return <Title />;
}
