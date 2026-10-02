import { newRun } from '@/engine/run';
import { GUIDED_SEED } from '@/content/guide';
import { devOverrides, getState, setState, useStore, useTheme } from '@/ui/state/store';
import { Guide } from '@/ui/game/GuideBubble';
import { Viewport } from '@/ui/game/Viewport';

export function Title() {
  const run = useStore((s) => s.run);
  const theme = useTheme();
  const profile = useStore((s) => s.profile);
  const start = () => {
    const dev = devOverrides();
    // A new profile gets the guided first run: a fixed seed, a plain East round and tips.
    const guided = !getState().profile.guidedDone;
    const seed = guided ? GUIDED_SEED : (dev.seed ?? Math.floor(Math.random() * 2 ** 32));
    setState({
      run: newRun({
        seed,
        guided,
        ...(dev.targets ? { targets: dev.targets } : {}),
        ...(dev.tileSet ? { tileSet: dev.tileSet } : {}),
        ...(dev.lantern ? { lantern: dev.lantern } : {}),
      }),
      screen: 'game',
    });
  };
  // After the guided first run, a new run begins at the setup screen (tile set and lantern).
  const newRunPressed = () => (profile.guidedDone ? setState({ screen: 'setup' }) : start());
  return (
    <Viewport theme={theme}>
      {() => (
        <main className="title" data-testid="title">
          <Guide mood="happy" size={110} />
          <h1 className="title-name">Bone &amp; Bamboo</h1>
          <p className="title-sub">Four winds. Four hosts. One hand.</p>
          <div className="title-buttons">
            {run && (
              <button
                type="button"
                className="btn primary"
                data-testid="btn-continue"
                onClick={() => setState({ screen: 'game' })}
              >
                Continue
              </button>
            )}
            <button
              type="button"
              className={`btn${run ? '' : ' primary'}`}
              data-testid="btn-new"
              onClick={newRunPressed}
            >
              New run
            </button>
            <button
              type="button"
              className="btn"
              data-testid="btn-collection"
              onClick={() => setState({ screen: 'collection' })}
            >
              Collection
            </button>
            <button
              type="button"
              className="btn"
              data-testid="btn-settings"
              onClick={() => setState({ screen: 'settings' })}
            >
              Settings
            </button>
          </div>
        </main>
      )}
    </Viewport>
  );
}
