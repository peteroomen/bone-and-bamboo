import { useEffect, useMemo, useRef, useState } from 'react';
import { SET_TYPES } from '@/content/sets';
import { WIND_NAMES } from '@/content/rules';
import { type Advice, advise } from '@/engine/advice';
import { dragonGoals } from '@/engine/goals';
import { finishProblem, needsRefill, preview, previewUpgrade, upgrades } from '@/engine/round';
import type { RunAction, RunEvent, RunState } from '@/engine/runTypes';
import { findSets, playProblem } from '@/engine/sets';
import { kindName, sortTiles } from '@/engine/tiles';
import { viewStack, visibleTiles } from '@/engine/wall';
import { TileView } from '@/ui/art/Tile';
import { PlayerBar } from './PlayerBar';
import { useFlip } from './useFlip';
import { hostFor } from '@/content/hosts';
import { armouredIds, discardProblem, takeProblem } from '@/engine/twists';
import { updateSettings, useStore, useTheme } from '@/ui/state/store';
import { useStage } from './stageSize';
import { GuideBubble } from './GuideBubble';
import { TipLayer } from './TipLayer';
import { dueTip } from './tips';
import { HelpSheet } from './HelpSheet';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');
const signed = (n: number) => (n < 0 ? `−${fmt(-n)}` : `+${fmt(n)}`);

export function RoundView({
  run,
  dispatch,
}: {
  run: RunState;
  dispatch: (a: RunAction) => RunEvent[];
}) {
  const round = run.round;
  const theme = useTheme();
  const hints = useStore((s) => s.settings.hints);
  const introSeen = useStore((s) => s.settings.introSeen);
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [help, setHelp] = useState<'intro' | 'sets' | null>(null);
  const [swapPick, setSwapPick] = useState<number | null | 'off'>('off');
  const [bannerSeen, setBannerSeen] = useState(false);
  // the first round of a new browser opens the introduction
  useEffect(() => {
    if (!introSeen) setHelp('intro');
  }, [introSeen]);
  // advice belongs to the position it was asked in
  const turnKey = round ? `${round.turns}:${round.hand.length}:${round.table.length}` : '';
  useEffect(() => setAdvice(null), [turnKey]);
  const root = useRef<HTMLDivElement>(null);
  const stage = useStage();
  useFlip(root);
  const hand = useMemo(() => (round ? sortTiles(round.hand) : []), [round]);
  const goals = useMemo(() => (round ? dragonGoals(round.table, round.dragons) : []), [round]);
  const handGlow = useMemo(() => {
    const glow = new Set<number>();
    if (!round || hints === 'off') return glow;
    for (const c of findSets(round.hand)) {
      for (const t of c.tiles) glow.add(t.id);
      if (c.kind === 'pair' || c.kind === 'pong' || c.kind === 'kong')
        for (const t of round.hand) if (t.kind === c.tiles[0]?.kind) glow.add(t.id);
    }
    return glow;
  }, [round, hints]);
  const wallGlow = useMemo(() => {
    const glow = new Set<number>();
    if (!round || hints !== 'full' || round.hand.length >= round.rules.handSize) return glow;
    for (const st of round.stacks)
      for (const t of visibleTiles(st, round.rules.peek))
        if (findSets([...round.hand, t]).some((c) => c.tiles.some((x) => x.id === t.id)))
          glow.add(t.id);
    return glow;
  }, [round, hints]);
  if (!round) return null;
  const host = hostFor(run.roundIndex, run.storm);
  const twistState = round.twist;
  const burning = new Set(twistState?.burning ?? []);
  const armoured = new Set(armouredIds(round));
  const showBanner =
    twistState !== null &&
    !bannerSeen &&
    round.turns === 0 &&
    round.hand.length === 0 &&
    round.table.length === 0;

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
    live.length <= round.rules.maxDiscard &&
    discardProblem(round, live) === null;
  const nowScore = pv.now.total;
  const gain = pv.withSelected ? pv.withSelected.total - nowScore : null;
  const ups = upgrades(round);
  const up = !refill && !done ? (ups.find((u) => live.includes(u.tileId)) ?? ups[0]) : undefined;
  const upPreview = up ? previewUpgrade(round, up.setIndex, up.tileId) : null;
  const canBank = !done && finishProblem(round) === null;
  const target = run.target;
  const pct = Math.min(100, (nowScore / Math.max(1, target)) * 100);
  const cols = Math.ceil(round.stacks.length / 2);

  // Tiles are sized to what is left of the stage after the fixed rows and the ones that are showing.
  const fixed =
    410 + (goals.length > 0 ? 24 : 0) + (pv.warnings.length > 0 ? 18 : 0) + (canBank ? 38 : 0);
  const tw = Math.max(40, Math.min(60, Math.floor((stage.h - fixed) / 5.4)));

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
  const upgrade = () => {
    if (!up) return;
    dispatch({ type: 'round', action: { type: 'upgrade', ...up } });
    setSelected([]);
  };
  const bank = () => dispatch({ type: 'round', action: { type: 'finish' } });
  const ask = () => {
    const a = advise(round);
    setAdvice(a);
    if (!a) return;
    if (a.type === 'play' || a.type === 'discard') setSelected(a.ids);
    else if (a.type === 'upgrade') setSelected([a.tileId]);
    else setSelected([]);
  };
  const closeHelp = () => {
    setHelp(null);
    if (!introSeen) updateSettings({ introSeen: true });
  };

  return (
    <div
      className="round"
      ref={root}
      data-testid="round"
      data-theme={theme}
      style={{
        ['--tw-round' as string]: `${tw}px`,
        ['--strip' as string]: `${Math.round(tw * 0.26)}px`,
      }}
    >
      <header className="hud">
        <div className="hud-wind">
          <button
            type="button"
            className="help-btn"
            data-testid="btn-help"
            aria-label="Help"
            onClick={() => setHelp('intro')}
          >
            ?
          </button>
          <span className="hud-wind-text">
            <b>{WIND_NAMES[run.roundIndex]}</b>
            <span>
              {twistState ? `${host.title} · ${run.storm ? 'Storm' : 'Calm'}` : 'A plain round'}
            </span>
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

      {goals.length > 0 && (
        <ul className="goals" data-testid="goals" aria-label="Dragon goals">
          {goals.map((g, i) => (
            <li key={`${g.id}${i}`} className={g.notYet ? 'not-yet' : g.active ? 'on' : 'off'}>
              <b>{g.name}</b> {g.notYet ? 'not yet' : g.progress}
            </li>
          ))}
        </ul>
      )}

      <section className="wall" style={{ ['--cols' as string]: cols }} aria-label="The wall">
        {round.stacks.map((stack, i) => {
          const v = viewStack(stack, round.rules.peek);
          const locked = takeProblem(round, i) !== null;
          const swapping = swapPick !== 'off';
          const canTake =
            !done && !locked && round.hand.length < round.rules.handSize && v.count > 0;
          return (
            <button
              key={i}
              type="button"
              className={`stack${advice?.type === 'draw' && advice.stack === i ? ' advised' : ''}${locked ? ' locked' : ''}${swapping && swapPick === i ? ' advised' : ''}`}
              data-testid={`stack-${i}`}
              data-count={v.count}
              disabled={swapping ? v.count === 0 : !canTake}
              onClick={() => {
                if (swapPick === 'off') {
                  dispatch({ type: 'round', action: { type: 'take', stack: i } });
                } else if (swapPick === null) {
                  setSwapPick(i);
                } else if (swapPick !== i) {
                  dispatch({ type: 'round', action: { type: 'swap', a: swapPick, b: i } });
                  setSwapPick('off');
                } else setSwapPick(null);
              }}
              aria-label={
                v.top
                  ? `Stack ${i + 1}, ${v.count} tiles, top ${kindName(v.top.kind)}${locked ? ', locked' : ''}`
                  : `Stack ${i + 1}, empty`
              }
              style={{ ['--peek' as string]: round.rules.peek }}
            >
              {v.count === 0 && <span className="stack-empty" />}
              {Array.from({ length: stackDepth(v.count) }, (_, k) => (
                <span
                  key={`d${k}`}
                  className="stack-depth"
                  aria-hidden
                  style={{
                    top: `calc(var(--strip) * ${round.rules.peek} + ${(stackDepth(v.count) - k) * DEPTH_STEP}px)`,
                  }}
                />
              ))}
              {v.under
                .map((t, j) => ({ t, j }))
                .reverse()
                .map(({ t, j }) => (
                  <TileView
                    key={t.id}
                    tile={t}
                    theme={theme}
                    className={`stack-tile under${wallGlow.has(t.id) ? ' hint-draw' : ''}${burning.has(t.id) ? ' burning' : ''}`}
                    style={{ top: `calc(var(--strip) * ${round.rules.peek - 1 - j})` }}
                  />
                ))}
              {v.top && (
                <TileView
                  tile={v.top}
                  theme={theme}
                  className={`stack-tile top${wallGlow.has(v.top.id) ? ' hint-draw' : ''}${burning.has(v.top.id) ? ' burning' : ''}`}
                  style={{ top: `calc(var(--strip) * ${round.rules.peek})` }}
                />
              )}
              {locked && (
                <span className="stack-lock" aria-hidden>
                  🔒
                </span>
              )}
              {v.count > 0 && <span className="stack-count">{v.count}</span>}
            </button>
          );
        })}
      </section>

      <section className="table" aria-label="Your table" data-testid="table">
        {round.table.length === 0 && <p className="table-empty">Play sets here.</p>}
        {twistState && twistState.twist.id === 'swaps' && twistState.swapsLeft > 0 && (
          <button
            type="button"
            className="swap-btn"
            data-testid="btn-swap"
            onClick={() => setSwapPick(swapPick === 'off' ? null : 'off')}
          >
            {swapPick === 'off' ? 'Swap two tops' : 'Cancel swap'}
          </button>
        )}
        {round.table.map((set, i) => (
          <div
            className={`set${advice?.type === 'upgrade' && advice.setIndex === i ? ' advised' : ''}`}
            key={i}
            data-testid={`set-${i}`}
          >
            <div className="set-tiles">
              {set.tiles.map((t) => (
                <TileView key={t.id} tile={t} theme={theme} className="table-tile" />
              ))}
            </div>
            <span className="set-name">{SET_TYPES[set.kind].name}</span>
          </div>
        ))}
        {advice && (
          <GuideBubble mood="think" testId="advice">
            <b>
              {advice.type === 'draw'
                ? 'Draw'
                : advice.type === 'play'
                  ? 'Play'
                  : advice.type === 'discard'
                    ? 'Discard'
                    : advice.type === 'upgrade'
                      ? 'Upgrade'
                      : 'Bank'}
              .
            </b>{' '}
            {advice.reason}
          </GuideBubble>
        )}
      </section>

      <section className="preview" aria-live="polite">
        {canBank ? (
          <button
            type="button"
            className={`bank${advice?.type === 'finish' ? ' advised' : ''}`}
            data-testid="btn-bank"
            onClick={bank}
          >
            Target beaten: bank {fmt(nowScore)}
          </button>
        ) : (
          <div className="bar" aria-hidden>
            <div className="bar-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
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
              ? `${signed(gain)} → ${fmt(pv.withSelected.total)}`
              : refill
                ? 'Take tiles from the wall'
                : live.length
                  ? problem
                  : 'Pick tiles to play'}
          </span>
        </div>
        {pv.warnings.length > 0 && (
          <p className="warn" data-testid="warn">
            Breaks {pv.warnings.join('; ')}
          </p>
        )}
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
            className={`hand-tile${live.includes(t.id) ? ' selected' : ''}${handGlow.has(t.id) ? ' glow' : ''}`}
            data-testid={`tile-${t.id}`}
            aria-pressed={live.includes(t.id)}
            aria-label={kindName(t.kind)}
            disabled={done}
            onClick={() => toggle(t.id)}
          >
            <TileView tile={t} theme={theme} className={burning.has(t.id) ? 'burning' : ''} />
            {armoured.has(t.id) && (
              <span className="badge armour" aria-label="armoured">
                ▣
              </span>
            )}
          </button>
        ))}
      </section>

      <PlayerBar run={run} dispatch={dispatch} />

      <footer className="actions">
        <button
          type="button"
          className="btn ghost"
          data-testid="btn-ask"
          onClick={ask}
          disabled={done}
        >
          Ask
        </button>
        {upPreview ? (
          <button
            type="button"
            className={`btn${advice?.type === 'upgrade' ? ' advised' : ''}`}
            data-testid="btn-upgrade"
            onClick={upgrade}
          >
            Kong {signed(upPreview.after.total - upPreview.now.total)}
            {upPreview.warnings.length ? ' ⚠' : ''}
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            data-testid="btn-auto"
            disabled={done || !refill}
            onClick={() => dispatch({ type: 'auto' })}
          >
            Auto
          </button>
        )}
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
      <TipLayer
        tip={
          help || showBanner ? null : dueTip(run, { valid: live.length > 0 && problem === null })
        }
        onRead={(id) => dispatch({ type: 'tip', id })}
      />
      {showBanner && (
        <div className="banner" role="status" data-testid="twist-banner">
          <b>
            {WIND_NAMES[run.roundIndex]} · {host.title}
          </b>
          <span>{host.twistText}</span>
          <button
            type="button"
            className="btn"
            data-testid="btn-banner-ok"
            onClick={() => setBannerSeen(true)}
          >
            Got it
          </button>
        </div>
      )}
      {help && (
        <HelpSheet onClose={closeHelp} start={help} levels={run.levels} owned={run.dragons} />
      )}
    </div>
  );
}

/** How many tile edges show under a stack's top: a full stack looks deep, a nearly empty one flat. */
const DEPTH_STEP = 3;
function stackDepth(count: number): number {
  return Math.min(3, Math.ceil(Math.max(0, count - 1) / 3));
}
