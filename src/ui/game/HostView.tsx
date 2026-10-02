import { hostFor } from '@/content/hosts';
import { SEASON_NAMES, WIND_NAMES } from '@/content/rules';
import { targetFor } from '@/engine/run';
import type { RunState } from '@/engine/runTypes';
import { TileView } from '@/ui/art/Tile';
import { useStore } from '@/ui/state/store';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** Before each round: the wind tile hosts it. Choose how it blows, calm or storm. */
export function HostView({ run, choose }: { run: RunState; choose: (storm: boolean) => void }) {
  const theme = useStore((s) => s.settings.colourway);
  const tile = hostFor(run.roundIndex, false).tile;
  return (
    <div className="host" data-testid="host">
      <div className="host-head">
        <span className="host-tile" aria-hidden>
          <TileView tile={{ id: -100 - run.roundIndex, kind: tile }} theme={theme} />
        </span>
        <div>
          <h2>{WIND_NAMES[run.roundIndex]} wind</h2>
          <p className="host-sub">
            {SEASON_NAMES[run.roundIndex]} · round {run.roundIndex + 1} of 4. How will it blow?
          </p>
        </div>
      </div>
      {(run.guided && run.roundIndex === 0 ? [false] : [false, true]).map((storm) => {
        const h = hostFor(run.roundIndex, storm);
        const plain = run.guided && run.roundIndex === 0;
        return (
          <button
            key={h.id}
            type="button"
            className={`host-card${storm ? ' storm' : ''}`}
            data-testid={storm ? 'host-storm' : 'host-calm'}
            onClick={() => choose(storm)}
          >
            <span className="host-text">
              <b>{storm ? 'Storm' : 'Calm'}</b>
              <i>
                Target {fmt(targetFor(run.lantern, run.roundIndex, storm, run.targets))}
                {storm ? ' · a bigger gift' : ''}
              </i>
              <span className="host-twist">{plain ? 'A plain round' : h.title}</span>
              <span className="muted" data-testid="twist-text">
                {plain ? 'No twist in your first round: just you and the wall.' : h.twistText}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
