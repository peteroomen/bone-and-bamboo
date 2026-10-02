import { useMemo, useRef, useState } from 'react';
import { SET_TYPES } from '@/content/sets';
import { SEASON_NAMES, WIND_NAMES } from '@/content/rules';
import { chooseMove } from '@/engine/ai';
import { needsRefill, preview } from '@/engine/round';
import type { RunAction, RunEvent, RunState } from '@/engine/runTypes';
import { playProblem } from '@/engine/sets';
import { kindName, sortTiles } from '@/engine/tiles';
import { viewStack } from '@/engine/wall';
import { TileView } from '@/ui/art/Tile';
import { PlayerBar } from './PlayerBar';
import { useFlip } from './useFlip';
import { useStore } from '@/ui/state/store';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

export function RoundView({
  run,
  dispatch,
}: {
  run: RunState;
  dispatch: (a: RunAction) => RunEvent[];
}) {
  const round = run.round;
  const theme = useStore((s) => s.settings.colourway);
  const [selected, setSelected] = useState<readonly number[]>([]);
  const root = useRef<HTMLDivElement>(null);
  useFlip(root);
  const hand = useMemo(() => (round ? sortTiles(round.hand) : []), [round]);
  if (!round) return null;

  const live = selected.filter((id) => round.hand.some((t) => t.id === id));
  const refill = needsRefill(round);
  const done = round.phase === 'done';
  const pv = preview(round, live);
  const problem = live.length ? playProblem(round.hand, live, round.discardsLeft) : 'Pick tiles.';
  const canPlay = !done && !refill && problem === null;
  const canDiscard =
    !done &&
    !refill &&
    round.discardsLeft > 0 &&
    live.length >= 1 &&
    live.length <= round.rules.maxDiscard;
  const nowScore = pv.now.total;
  const gain = pv.withSelected ? pv.withSelected.total - nowScore : null;
  const target = run.target;
  const pct = Math.min(100, (nowScore / Math.max(1, target)) * 100);
  const cols = Math.ceil(round.stacks.length / 2);

  const toggle = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const play = () => {
    dispatch({ type: 'round', action: { type: 'play', ids: live } });
    setSelected([]);
  };
  const discard = () => {
    dispatch({ type: 'round', action: { type: 'discard', ids: live } });
    setSelected([]);
  };
  const ask = () => {
    const m = chooseMove(round);
    if (m) setSelected(m.ids);
  };

  return (
    <div className="round" ref={root} data-testid="round" data-theme={theme}>
      <header className="hud">
        <div className="hud-wind">
          <b>{WIND_NAMES[run.roundIndex]}</b>
          <span>
            {SEASON_NAMES[run.roundIndex]} · {run.roundIndex + 1}/4
          </span>
        </div>
        <div className="hud-target" data-testid="target">
          <span>Target</span>
          <b>{fmt(target)}</b>
        </div>
        <div className="hud-counts">
          <span data-testid="plays">
            <b>{round.playsLeft}</b> plays
          </span>
          <span data-testid="discards">
            <b>{round.discardsLeft}</b> discards
          </span>
        </div>
      </header>

      <section className="wall" style={{ ['--cols' as string]: cols }} aria-label="The wall">
        {round.stacks.map((stack, i) => {
          const v = viewStack(stack, round.rules.peek);
          const canTake = !done && round.hand.length < round.rules.handSize && v.count > 0;
          return (
            <button
              key={i}
              type="button"
              className="stack"
              data-testid={`stack-${i}`}
              data-count={v.count}
              disabled={!canTake}
              onClick={() => dispatch({ type: 'round', action: { type: 'take', stack: i } })}
              aria-label={
                v.top
                  ? `Stack ${i + 1}, ${v.count} tiles, top ${kindName(v.top.kind)}`
                  : `Stack ${i + 1}, empty`
              }
              style={{ ['--peek' as string]: round.rules.peek }}
            >
              {v.count === 0 && <span className="stack-empty" />}
              {v.under
                .map((t, j) => ({ t, j }))
                .reverse()
                .map(({ t, j }) => (
                  <TileView
                    key={t.id}
                    tile={t}
                    theme={theme}
                    className="stack-tile under"
                    style={{ top: `calc(var(--strip) * ${round.rules.peek - 1 - j})` }}
                  />
                ))}
              {v.top && (
                <TileView
                  tile={v.top}
                  theme={theme}
                  className="stack-tile top"
                  style={{ top: `calc(var(--strip) * ${round.rules.peek})` }}
                />
              )}
              {v.count > 0 && <span className="stack-count">{v.count}</span>}
            </button>
          );
        })}
      </section>

      <section className="table" aria-label="Your table" data-testid="table">
        {round.table.length === 0 && <p className="table-empty">Play sets here.</p>}
        {round.table.map((set, i) => (
          <div className="set" key={i} data-testid={`set-${i}`}>
            <div className="set-tiles">
              {set.tiles.map((t) => (
                <TileView key={t.id} tile={t} theme={theme} className="table-tile" />
              ))}
            </div>
            <span className="set-name">{SET_TYPES[set.kind].name}</span>
          </div>
        ))}
      </section>

      <section className="preview" aria-live="polite">
        <div className="bar" aria-hidden>
          <div className="bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="preview-row">
          <span className="preview-now" data-testid="score-now">
            Table <b>{fmt(nowScore)}</b>
            <i>
              {fmt(pv.now.chips)} × {fmt(pv.now.mult)}
              {pv.now.x !== 1 ? ` × ${pv.now.x}` : ''}
            </i>
          </span>
          <span className="preview-add" data-testid="score-add">
            {gain !== null && pv.withSelected
              ? `+${fmt(gain)} → ${fmt(pv.withSelected.total)}`
              : refill
                ? 'Take tiles from the wall'
                : live.length
                  ? problem
                  : 'Pick tiles to play'}
          </span>
        </div>
      </section>

      <section
        className="hand"
        aria-label="Your hand"
        data-testid="hand"
        style={{ ['--hc' as string]: Math.ceil(round.rules.handSize / 2) }}
      >
        {hand.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`hand-tile${live.includes(t.id) ? ' selected' : ''}`}
            data-testid={`tile-${t.id}`}
            aria-pressed={live.includes(t.id)}
            aria-label={kindName(t.kind)}
            disabled={done}
            onClick={() => toggle(t.id)}
          >
            <TileView tile={t} theme={theme} />
          </button>
        ))}
        {Array.from({ length: Math.max(0, round.rules.handSize - hand.length) }, (_, i) => (
          <span key={`gap${i}`} className="hand-gap" aria-hidden />
        ))}
      </section>

      <PlayerBar run={run} dispatch={dispatch} />

      <footer className="actions">
        <button
          type="button"
          className="btn ghost"
          data-testid="btn-ask"
          onClick={ask}
          disabled={done || refill}
        >
          Ask
        </button>
        <button
          type="button"
          className="btn"
          data-testid="btn-auto"
          disabled={done || !refill}
          onClick={() => dispatch({ type: 'auto' })}
        >
          Auto
        </button>
        <button
          type="button"
          className="btn"
          data-testid="btn-discard"
          disabled={!canDiscard}
          onClick={discard}
        >
          Discard
        </button>
        <button
          type="button"
          className="btn primary"
          data-testid="btn-play"
          disabled={!canPlay}
          onClick={play}
        >
          Play
        </button>
      </footer>
    </div>
  );
}
