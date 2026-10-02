import { SEASON_NAMES, WIND_NAMES } from '@/content/rules';
import { hostFor } from '@/content/hosts';
import { targetFor } from '@/engine/run';
import type { RunState } from '@/engine/runTypes';
import { Portrait } from './Portrait';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** Before each round: choose the wind's folk spirit or its great beast. */
export function HostView({ run, choose }: { run: RunState; choose: (beast: boolean) => void }) {
  return (
    <div className="host" data-testid="host">
      <h2>
        {WIND_NAMES[run.roundIndex]} <span>{SEASON_NAMES[run.roundIndex]}</span>
      </h2>
      <p className="host-sub">Choose your host for round {run.roundIndex + 1} of 4.</p>
      {[false, true].map((beast) => {
        const h = hostFor(run.roundIndex, beast);
        return (
          <button
            key={h.id}
            type="button"
            className="host-card"
            data-testid={beast ? 'host-beast' : 'host-folk'}
            onClick={() => choose(beast)}
          >
            <Portrait name={h.name} colour={h.colour} size={64} />
            <span className="host-text">
              <b>
                {h.name}: {h.title}
              </b>
              <span>{h.twistText}</span>
              <i>
                Target {fmt(targetFor(run.lantern, run.roundIndex, beast, run.targets))}
                {beast ? ' · bigger gift' : ''}
              </i>
            </span>
          </button>
        );
      })}
    </div>
  );
}
