import { useEffect, useMemo, useRef, useState } from 'react';
import { SET_TYPES } from '@/content/sets';
import { WIND_NAMES } from '@/content/rules';
import { type Advice, advise } from '@/engine/advice';
import { dragonGoals } from '@/engine/goals';
import {
  finishProblem,
  freeWallSlots,
  needsRefill,
  nextTiles,
  preview,
  previewUpgrade,
  upgrades,
  usableDiscards,
} from '@/engine/round';
import type { RunAction, RunEvent, RunState } from '@/engine/runTypes';
import { findSets, playProblem } from '@/engine/sets';
import { kindName, sortByRank, sortTiles } from '@/engine/tiles';
import { TileView } from '@/ui/art/Tile';
import { PlayerBar } from './PlayerBar';
import { useFlip } from './useFlip';
import { hostFor } from '@/content/hosts';
import { armouredIds, discardProblem, swapProblem } from '@/engine/twists';
import { wallSlots } from '@/engine/wall';
import { updateSettings, useStore, useTheme } from '@/ui/state/store';
import { STAGE_W, useStage } from './stageSize';
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
  const handSort = useStore((s) => s.settings.handSort);
  const hand = useMemo(
    () => (round ? (handSort === 'rank' ? sortByRank(round.hand) : sortTiles(round.hand)) : []),
    [round, handSort],
  );
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
  // the Full hint level outlines the guide's pick
  const hinted = useMemo(() => {
    if (!round || hints !== 'full' || round.phase !== 'play') return new Set<number>();
    const a = advise(round);
    return new Set(a && 'ids' in a ? a.ids : a?.type === 'upgrade' ? [a.tileId] : []);
  }, [round, hints]);
  // tiles new to the hand since the last render deal in from the pile, one after another
  const seen = useRef<Set<number> | null>(null);
  const fresh = useMemo(() => {
    const ids = new Set(round?.hand.map((t) => t.id) ?? []);
    const before = seen.current;
    seen.current = ids;
    return before ? [...ids].filter((id) => !before.has(id)) : [];
  }, [round?.hand]);
  if (!round) return null;
  const host = hostFor(run.roundIndex, run.storm);
  const twistState = round.twist;
  const burning = new Set(twistState?.burning ?? []);
  const armoured = new Set(armouredIds(round));
  const showBanner =
    twistState !== null && !bannerSeen && round.turns === 0 && round.table.length === 0;

  const live = selected.filter((id) => round.hand.some((t) => t.id === id));
  const done = round.phase === 'done';
  const pv = preview(round, live);
  const problem = live.length
    ? playProblem(round.hand, live, usableDiscards(round), round.rules.maxSets)
    : 'Pick tiles.';
  const refilling = needsRefill(round);
  const canPlay = !done && !refilling && problem === null;
  const canDiscard =
    !done &&
    !refilling &&
    round.discardsLeft > 0 &&
    live.length >= 1 &&
    live.length <= round.rules.maxDiscard &&
    discardProblem(round, live) === null;
  const nowScore = pv.now.total;
  const gain = pv.withSelected ? pv.withSelected.total - nowScore : null;
  const ups = upgrades(round);
  const up = !done && !refilling ? (ups.find((u) => live.includes(u.tileId)) ?? ups[0]) : undefined;
  const upPreview = up ? previewUpgrade(round, up.setIndex, up.tileId) : null;
  const canBank = !done && finishProblem(round) === null;
  const target = run.target;
  const pct = Math.min(100, (nowScore / Math.max(1, target)) * 100);
  const pile = round.stacks[0]?.length ?? 0;
  const next = nextTiles(round);
  const swap = twistState?.twist.id === 'swaps' && twistState.swapsLeft > 0;
  const swapId = live.length === 1 ? live[0] : undefined;
  const canSwap = swap && !done && swapId !== undefined && swapProblem(round, swapId) === null;

  // The hand is two rows; tiles take the width they can, and shrink on a short stage.
  // The brick wall: this wind's side, its slots placed in half-tile steps.
  const wall = round.wall;
  const slots = wall ? wallSlots(round.rules.wallRows, round.rules.wallWidth) : [];
  const free = new Set(freeWallSlots(round));
  // the wall runs edge to edge (past the side padding) so its tiles stay 44px on a 360px phone
  const cell = wall ? STAGE_W / round.rules.wallWidth : 0;
  // The hand is one row while it fits (the wall), else two; tiles take the width they can and
  // shrink on a short stage.
  const hc =
    wall && round.rules.handSize <= 8 ? round.rules.handSize : Math.ceil(round.rules.handSize / 2);
  const handRows = Math.ceil(round.rules.handSize / hc);
  const byWidth = Math.floor((STAGE_W - 24 - 6 * (hc - 1)) / hc) - 2;
  const extras =
    (goals.length > 0 ? 24 : 0) + (pv.warnings.length > 0 ? 18 : 0) + (canBank ? 38 : 0);
  const fixed = (wall ? 300 : 470) + extras;
  const rowsTall = (handRows + (wall ? round.rules.wallRows : 0)) * 1.4;
  const byHeight = Math.floor((stage.h - fixed) / rowsTall);
  const tw = Math.max(wall ? 32 : 40, Math.min(64, byWidth, byHeight));
  const wtw = wall ? Math.max(32, Math.min(Math.floor(cell) - 4, tw + 2)) : 0;
  const rowH = Math.round((wtw * 4) / 3) + 2;

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

      {wall && (
        <section
          className="brick-wall"
          aria-label={`The ${WIND_NAMES[run.roundIndex]} wall`}
          data-testid="wall"
          style={{ height: round.rules.wallRows * rowH, ['--tw' as string]: `${wtw}px` }}
        >
          {slots.map((slot, i) => {
            const t = wall[i];
            if (!t) return null;
            const isFree = free.has(i);
            const canTake = isFree && !done && round.hand.length < round.rules.handSize;
            return (
              <button
                key={t.id}
                type="button"
                className={`brick${isFree ? ' free' : ''}${advice?.type === 'draw' && advice.slot === i ? ' advised' : ''}`}
                data-testid={`brick-${i}`}
                data-free={isFree}
                disabled={!canTake}
                aria-label={`${kindName(t.kind)}${isFree ? '' : ', under others'}`}
                style={{ left: (slot.x * cell) / 2, top: slot.row * rowH, width: cell }}
                onClick={() => dispatch({ type: 'round', action: { type: 'take', slot: i } })}
              >
                <TileView tile={t} theme={theme} className={burning.has(t.id) ? 'burning' : ''} />
              </button>
            );
          })}
        </section>
      )}

      <section className="table" aria-label="Your table" data-testid="table">
        {wall && (
          <span className="wall-pile" data-testid="pile" data-count={pile}>
            {pile} in the pile
          </span>
        )}
        {round.table.length === 0 && <p className="table-empty">Play sets here.</p>}
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
                ? 'Take'
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
              : refilling
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

      {(!wall || next.length > 0 || swap) && (
        <section className="pile-row" aria-label="The pile">
          {!wall && (
            <span className="pile" data-testid="pile" data-count={pile}>
              <span className="pile-back" aria-hidden />
              <span>
                <b>{pile}</b> in the pile
              </span>
            </span>
          )}
          {next.length > 0 && (
            <span className="pile-next" data-testid="pile-next" aria-label="Next from the pile">
              {next.map((t) => (
                <TileView key={t.id} tile={t} theme={theme} />
              ))}
            </span>
          )}
          {swap && (
            <button
              type="button"
              className="swap-btn"
              data-testid="btn-swap"
              disabled={!canSwap}
              onClick={() => {
                if (swapId === undefined) return;
                dispatch({ type: 'round', action: { type: 'swap', id: swapId } });
                setSelected([]);
              }}
            >
              {swapId === undefined ? 'Pick a tile to swap' : 'Swap it'}
            </button>
          )}
        </section>
      )}

      <section
        className="hand"
        aria-label="Your hand"
        data-testid="hand"
        style={{ ['--hc' as string]: hc }}
      >
        {hand.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`hand-tile${live.includes(t.id) ? ' selected' : ''}${handGlow.has(t.id) ? ' glow' : ''}${fresh.includes(t.id) ? ' fresh' : ''}${hinted.has(t.id) ? ' hinted' : ''}`}
            style={fresh.includes(t.id) ? { ['--deal' as string]: fresh.indexOf(t.id) } : undefined}
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
        ) : wall && refilling ? (
          <button
            type="button"
            className="btn"
            data-testid="btn-auto"
            disabled={done}
            onClick={() => dispatch({ type: 'auto' })}
          >
            Auto
          </button>
        ) : live.length > 0 ? (
          <button
            type="button"
            className="btn"
            data-testid="btn-clear"
            disabled={done}
            onClick={() => setSelected([])}
          >
            Clear
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            data-testid="btn-sort"
            aria-label={`Sort the hand by ${handSort === 'suit' ? 'number' : 'suit'}`}
            disabled={done}
            onClick={() => updateSettings({ handSort: handSort === 'suit' ? 'rank' : 'suit' })}
          >
            {handSort === 'suit' ? 'By 1-9' : 'By suit'}
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
