import { GameScreen } from '@/ui/game/GameScreen';
import { Title } from '@/ui/screens/Title';
import { setState, useStore } from '@/ui/state/store';

export function App() {
  const screen = useStore((s) => s.screen);
  const run = useStore((s) => s.run);
  if (screen === 'game' && run)
    return <GameScreen onExit={() => setState({ screen: 'title', run: null })} />;
  return <Title />;
}
