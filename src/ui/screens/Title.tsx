import { TileView } from '@/ui/art/Tile';
import { setScene, unlockAudio } from '@/ui/audio/audio';
import { setState, startRun, useStore } from '@/ui/state/store';
import { GuideFace } from '@/ui/game/GuideFace';
import { HelpSheet, SettingsSheet } from '@/ui/game/Sheets';
import { useEffect } from 'react';

/** The title: continue, a new run, how to play, settings. */
export function Title() {
  const run = useStore((s) => s.run);
  const theme = useStore((s) => s.settings.colourway);
  const sheet = useStore((s) => s.sheet);
  useEffect(() => setScene({ kind: 'title' }), []);
  return (
    <div className="title-screen" onPointerDown={unlockAudio}>
      <div className="title-dice" aria-hidden>
        {['s1', 'd1', 'w1', 'p5'].map((k, i) => (
          <span key={k} className={`title-die d${i}`}>
            <TileView kind={k} theme={theme} />
          </span>
        ))}
      </div>
      <h1 className="logo">
        <span>Bone</span>
        <span className="amp">&amp;</span>
        <span>Bamboo</span>
      </h1>
      <p className="tagline">
        Mahjong with dice. Roll, hold, take your sets, and beat the four winds.
      </p>
      <div className="title-buttons">
        {run ? (
          <button
            type="button"
            className="btn big"
            onClick={() => setState({ screen: 'game' })}
            data-testid="continue"
          >
            Continue
          </button>
        ) : null}
        <button
          type="button"
          className={`btn ${run ? '' : 'big'}`}
          data-testid="new-run"
          onClick={() => {
            if (run && !window.confirm('Start again? Your run in progress will be lost.')) return;
            startRun();
          }}
        >
          New run
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setState({ sheet: { kind: 'help' } })}
        >
          How to play
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setState({ sheet: { kind: 'settings' } })}
        >
          Settings
        </button>
      </div>
      <GuideFace mood="idle" className="title-guide" />
      {sheet?.kind === 'help' ? <HelpSheet round={null} /> : null}
      {sheet?.kind === 'settings' ? <SettingsSheet /> : null}
    </div>
  );
}
