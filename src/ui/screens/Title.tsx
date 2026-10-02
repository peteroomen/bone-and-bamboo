import { newRun } from '@/engine/run';
import { devOverrides, setState, useStore } from '@/ui/state/store';
import { Viewport } from '@/ui/game/Viewport';

export function Title() {
  const run = useStore((s) => s.run);
  const theme = useStore((s) => s.settings.colourway);
  const start = () => {
    const dev = devOverrides();
    const seed = dev.seed ?? Math.floor(Math.random() * 2 ** 32);
    setState({
      run: newRun({
        seed,
        ...(dev.targets ? { targets: dev.targets } : {}),
        ...(dev.tileSet ? { tileSet: dev.tileSet } : {}),
        ...(dev.lantern ? { lantern: dev.lantern } : {}),
      }),
      screen: 'game',
    });
  };
  return (
    <Viewport theme={theme}>
      {() => (
        <main className="title" data-testid="title">
          <div className="title-mark" aria-hidden>
            <span className="title-tile">條</span>
          </div>
          <h1 className="title-name">Bone &amp; Bamboo</h1>
          <p className="title-sub">Four winds. Four hosts. One wall.</p>
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
              onClick={start}
            >
              New run
            </button>
          </div>
        </main>
      )}
    </Viewport>
  );
}
