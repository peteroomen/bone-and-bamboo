import { useLayoutEffect, useRef } from 'react';
import { CHARMS } from '@/content/charms';
import { PATTERN_BY_ID } from '@/content/patterns';
import { hostOf } from '@/content/hosts';
import type { Advice, Plan, TakeOption } from '@/engine/advice';
import { neighbours } from '@/engine/dice';
import { type RoundState, actionProblem, dieOf, hasCharm } from '@/engine/round';
import type { RunState } from '@/engine/run';
import { roundsOf } from '@/engine/run';
import { kindName } from '@/engine/tiles';
import { TileView } from '@/ui/art/Tile';
import { charmSvg } from '@/ui/art/icons';
import type { ThemeId } from '@/ui/art/tiles';
import { type CharmMode, dispatch, setState, useStore } from '@/ui/state/store';
import { GuideFace } from './GuideFace';

const fmt = (n: number) => n.toLocaleString('en-GB');

const SET_NAME = { pair: 'Pair', chow: 'Chow', pong: 'Pong', kong: 'Kong' } as const;

/** The charms that are used by tapping them, and what they do. */
const ACTIVE: Record<
  string,
  {
    mode: Exclude<CharmMode, null>['kind'];
    use: 'thumb' | 'shell' | 'fan' | 'mirror';
    prompt: string;
  }
> = {
  thumb: { mode: 'tip', use: 'thumb', prompt: 'Thumb: tap a die to tip it.' },
  shell: { mode: 'flip', use: 'shell', prompt: 'Oracle Shell: tap a die to turn it over.' },
  fan: { mode: 'fan', use: 'fan', prompt: 'Paper Fan: tap a die to roll it again for free.' },
  mirror: { mode: 'mirror', use: 'mirror', prompt: 'Mirror: tap the die that will copy.' },
};

function charmUsable(round: RoundState, id: string): boolean {
  const a = ACTIVE[id];
  if (!a || round.over) return false;
  return (
    hasCharm(round.charms, a.use) &&
    !round.uses[a.use] &&
    round.cup.some((c) => c.face !== null && !c.spent)
  );
}

export function TopBar({
  run,
  round,
  theme,
  onHeight,
}: {
  run: RunState;
  round: RoundState;
  theme: ThemeId;
  onHeight: (h: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => onHeight(el.getBoundingClientRect().bottom));
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight]);
  const host = hostOf(round.wind);
  const mode = useStore((s) => s.charmMode);
  const progress = Math.min(1, round.score / Math.max(1, round.target));
  return (
    <div className="hud-top" ref={ref}>
      <div className="bar">
        <button
          type="button"
          className="host-chip"
          onClick={() => setState({ sheet: { kind: 'help' } })}
          aria-label={`${host.name} wind, round ${round.index + 1}`}
        >
          <TileView kind={`w${round.wind}`} theme={theme} />
          <span className="host-text">
            <b>{host.name}</b>
            <small>
              {round.host ? host.twist.name : `Round ${round.index + 1}/${roundsOf(run)}`}
            </small>
          </span>
        </button>
        <div className="plaque" data-testid="score">
          <div className="plaque-score">
            <span className="big">{fmt(round.score)}</span>
            <span className="of">/ {fmt(round.target)}</span>
          </div>
          <div className="plaque-bar">
            <i style={{ width: `${progress * 100}%` }} className={progress >= 1 ? 'done' : ''} />
          </div>
        </div>
        <div className="purse" aria-label="money">
          <span className="coin">$</span>
          {run.money}
        </div>
      </div>
      <div className="charm-row">
        {run.charms.map((id) => {
          const c = CHARMS[id];
          const usable = charmUsable(round, id);
          const active = mode && ACTIVE[id]?.mode === mode.kind;
          return (
            <button
              type="button"
              key={id}
              className={`charm ${usable ? 'usable' : ''} ${active ? 'active' : ''} rarity-${c?.rarity}`}
              aria-label={c?.name}
              onClick={() => {
                const a = ACTIVE[id];
                if (a && usable) setState({ charmMode: active ? null : { kind: a.mode } });
                else setState({ sheet: { kind: 'charm', id } });
              }}
              dangerouslySetInnerHTML={{ __html: charmSvg(id, theme) }}
            />
          );
        })}
        {Array.from({ length: Math.max(0, 5 - run.charms.length) }, (_, i) => (
          <span key={`e${i}`} className="charm empty" />
        ))}
        {round.host ? (
          <button
            type="button"
            className="twist-badge"
            onClick={() => setState({ sheet: { kind: 'help' } })}
          >
            {host.twist.name}: {host.twist.text}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function BottomBar({
  round,
  theme,
  advice,
  plan,
  takes,
  fits,
  onHeight,
  onToast,
}: {
  round: RoundState;
  theme: ThemeId;
  advice: Advice | null;
  plan: Plan | null;
  takes: readonly TakeOption[];
  fits: (t: TakeOption) => boolean;
  onHeight: (h: number) => void;
  onToast: (s: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      onHeight(window.innerHeight - el.getBoundingClientRect().top),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight]);
  const busy = useStore((s) => s.busy) > 0;
  const target = useStore((s) => s.target);
  const hints = useStore((s) => s.settings.hints);
  const mode = useStore((s) => s.charmMode);
  const act = (a: Parameters<typeof dispatch>[0]) => {
    if (busy) return;
    const p = dispatch(a);
    if (p) onToast(p);
  };
  const rollProblem = actionProblem(round, { type: 'roll' });
  const beaten = round.score >= round.target;
  const firstRoll = round.cup.every((c) => c.face === null);
  const sorted = takes.slice().sort((a, b) => Number(fits(b)) - Number(fits(a)));
  const suggested = advice?.action.type === 'take' ? advice.action.dieIds.join(',') : '';
  const aim = target
    ? PATTERN_BY_ID[target].name
    : plan
      ? `${PATTERN_BY_ID[plan.pattern].name}`
      : 'Any hand';

  let modeBar: React.ReactNode = null;
  if (mode) {
    let prompt = Object.values(ACTIVE).find((a) => a.mode === mode.kind)?.prompt ?? '';
    let faces: React.ReactNode = null;
    if (mode.kind === 'tip' && mode.dieId !== undefined) {
      const c = round.cup.find((x) => x.dieId === mode.dieId);
      const die = dieOf(round, mode.dieId);
      if (c && die && c.face !== null) {
        prompt = 'Tip it onto which face?';
        faces = (
          <div className="face-pick">
            {neighbours(die.shape, c.face).map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => {
                  setState({ charmMode: null });
                  act({ type: 'round', action: { type: 'tip', dieId: c.dieId, face: f } });
                }}
              >
                <TileView kind={die.faces[f]?.kind ?? null} enh={die.faces[f]?.enh} theme={theme} />
              </button>
            ))}
          </div>
        );
      }
    }
    if (mode.kind === 'mirror' && mode.dieId !== undefined) prompt = 'Now tap the die to copy.';
    modeBar = (
      <div className="mode-bar">
        <span>{prompt}</span>
        {faces}
        <button
          type="button"
          className="btn small ghost"
          onClick={() => setState({ charmMode: null })}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="hud-bottom" ref={ref}>
      {modeBar}
      {!mode && hints && advice?.reason ? (
        <div className="guide-line">
          <GuideFace mood={beaten ? 'happy' : 'point'} />
          <span>{advice.reason}</span>
        </div>
      ) : null}
      {!mode && sorted.length > 0 ? (
        <div className="take-row" role="group" aria-label="Sets you can take">
          {sorted.slice(0, 4).map((t) => (
            <button
              type="button"
              key={t.dieIds.join(',')}
              className={`take ${fits(t) ? 'fits' : ''} ${hints && suggested === t.dieIds.join(',') ? 'suggested' : ''}`}
              disabled={busy}
              onClick={() => act({ type: 'round', action: { type: 'take', dieIds: t.dieIds } })}
              aria-label={`Take ${t.upgrade !== null ? 'kong' : t.kind}: ${t.kinds.map(kindName).join(', ')}`}
            >
              <span className="take-tiles">
                {t.kinds.map((k, i) => (
                  <TileView key={i} kind={k} theme={theme} />
                ))}
              </span>
              <span className="take-label">{t.upgrade !== null ? 'Kong!' : SET_NAME[t.kind]}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="actions">
        <button
          type="button"
          className="btn aim"
          onClick={() => setState({ sheet: { kind: 'book' } })}
        >
          <small>{target ? 'Aiming for' : 'Hands'}</small>
          <span>{aim}</span>
        </button>
        <button
          type="button"
          className="btn roll"
          data-testid="roll"
          disabled={busy || !!rollProblem || !!mode}
          onClick={() => act({ type: 'round', action: { type: 'roll' } })}
        >
          <span>{firstRoll ? 'Throw' : 'Roll'}</span>
          <small>
            {round.rollsLeft} {round.rollsLeft === 1 ? 'roll' : 'rolls'} left
          </small>
        </button>
        <button
          type="button"
          className={`btn end ${beaten ? 'bank' : ''}`}
          data-testid="end"
          disabled={busy || !!mode || (!beaten && round.rollsLeft > 0)}
          onClick={() => act({ type: 'round', action: { type: 'end' } })}
        >
          <small>{beaten ? 'Target beaten' : round.rollsLeft > 0 ? 'Bank' : 'Out of rolls'}</small>
          <span>{beaten ? 'Bank' : round.rollsLeft > 0 ? 'at target' : 'End round'}</span>
        </button>
      </div>
    </div>
  );
}
