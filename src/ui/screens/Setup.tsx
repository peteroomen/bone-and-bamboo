import { useState } from 'react';
import { TILE_SETS } from '@/content/tilesets';
import { LANTERNS } from '@/content/targets';
import { lanternReached, tileSetCondition, tileSetUnlocked } from '@/engine/profile';
import { newRun } from '@/engine/run';
import { DRAW, DRAW_MODES } from '@/content/rules';
import { allUnlocked, devOverrides, setState, updateSettings, useStore } from '@/ui/state/store';
import { ScreenFrame } from './ScreenFrame';

/** Choose a tile set and a lantern, then begin. */
export function Setup() {
  const profile = useStore((s) => s.profile);
  const draw = useStore((s) => s.settings.draw);
  const all = allUnlocked();
  const [tileSet, setTileSet] = useState('boneBamboo');
  const reached = all ? LANTERNS.length : lanternReached(profile, tileSet);
  const [lantern, setLantern] = useState(1);
  const level = Math.min(lantern, reached);

  const start = () => {
    const dev = devOverrides();
    const seed = dev.seed ?? Math.floor(Math.random() * 2 ** 32);
    setState({
      run: newRun({
        seed,
        tileSet,
        lantern: level,
        draw: dev.draw ?? draw,
        ...(dev.targets ? { targets: dev.targets } : {}),
      }),
      screen: 'game',
    });
  };

  return (
    <ScreenFrame title="New run" testId="setup">
      <section>
        <h3>Your tiles come from</h3>
        <div className="choices lanterns">
          {DRAW_MODES.map((d) => (
            <button
              key={d}
              type="button"
              className={`choice${draw === d ? ' on' : ''}`}
              data-testid={`draw-${d}`}
              aria-pressed={draw === d}
              onClick={() => updateSettings({ draw: d })}
            >
              <b>{DRAW[d].name}</b>
              <span>{DRAW[d].text}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>Tile set</h3>
        <div className="choices">
          {TILE_SETS.map((t) => {
            const open = all || tileSetUnlocked(profile, t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`choice${tileSet === t.id ? ' on' : ''}${open ? '' : ' locked'}`}
                data-testid={`set-${t.id}`}
                disabled={!open}
                aria-pressed={tileSet === t.id}
                onClick={() => setTileSet(t.id)}
              >
                <b>{t.name}</b>
                <span>{open ? t.text : `Locked: ${tileSetCondition(t.id)}`}</span>
              </button>
            );
          })}
        </div>
      </section>
      <section>
        <h3>Lantern</h3>
        <div className="choices lanterns">
          {LANTERNS.map((l) => {
            const open = l.level <= reached;
            return (
              <button
                key={l.level}
                type="button"
                className={`choice${level === l.level ? ' on' : ''}${open ? '' : ' locked'}`}
                data-testid={`lantern-${l.level}`}
                disabled={!open}
                aria-pressed={level === l.level}
                onClick={() => setLantern(l.level)}
              >
                <b>{l.level}</b>
                <span>{open ? l.text : 'Win to light it'}</span>
              </button>
            );
          })}
        </div>
      </section>
      <button type="button" className="btn primary" data-testid="btn-start" onClick={start}>
        Begin
      </button>
    </ScreenFrame>
  );
}
