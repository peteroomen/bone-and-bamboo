import type { ReactNode } from 'react';
import { CHARMS } from '@/content/charms';
import { hostOf } from '@/content/hosts';
import { PATTERNS, PATTERN_BY_ID, CHICKEN } from '@/content/patterns';
import { SHAPES } from '@/content/shapes';
import { type Plan, plansFor } from '@/engine/advice';
import { faceOdds } from '@/engine/dice';
import type { RoundState } from '@/engine/round';
import type { RunState } from '@/engine/run';
import { kindName } from '@/engine/tiles';
import { TileView } from '@/ui/art/Tile';
import { charmSvg } from '@/ui/art/icons';
import type { ThemeId } from '@/ui/art/tiles';
import { setVolumes } from '@/ui/audio/audio';
import { abandonRun, dispatch, setState, updateSettings, useStore } from '@/ui/state/store';
import { GuideFace } from './GuideFace';

export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="btn small ghost" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

const close = () => setState({ sheet: null });
const fmt = (n: number) => n.toLocaleString('en-GB');

function xOf(run: RunState, id: (typeof PATTERNS)[number]['id']): string {
  const p = PATTERN_BY_ID[id];
  const lv = run.levels[id] ?? 0;
  if (id === 'chicken')
    return `+${CHICKEN.chips + lv * CHICKEN.levelChips} chips, +${CHICKEN.mult + lv * CHICKEN.levelMult} mult`;
  return `×${Math.round((p.xmult + lv * p.step) * 100) / 100}`;
}

/** Every hand, how close you are to it, and the choice of one to aim for. */
export function HandBook({
  run,
  round,
  theme,
}: {
  run: RunState;
  round: RoundState | null;
  theme: ThemeId;
}) {
  const target = useStore((s) => s.target);
  const plans = round ? plansFor(round) : null;
  const rows = PATTERNS.map((p) => ({ p, plan: plans?.get(p.id) ?? null }));
  if (plans)
    rows.sort((a, b) => (a.plan ? a.plan.estRolls : 1e9) - (b.plan ? b.plan.estRolls : 1e9));
  return (
    <Sheet title="Hands" onClose={close}>
      <p className="sheet-note">
        Every finished hand is four sets and a pair (or seven pairs). It scores the Chicken hand
        plus every pattern it fits, and patterns multiply.
        {round
          ? ' Pick one to aim for: the rack shows what is missing and the guide plays towards it.'
          : ''}
      </p>
      {round ? (
        <button
          type="button"
          className={`book-row guide-pick ${target === null ? 'chosen' : ''}`}
          onClick={() => {
            setState({ target: null, sheet: null });
          }}
        >
          <GuideFace mood="think" />
          <span>Let the guide choose the best hand for your dice.</span>
        </button>
      ) : null}
      {rows.map(({ p, plan }) => (
        <BookRow
          key={p.id}
          run={run}
          id={p.id}
          plan={plan}
          theme={theme}
          live={!!round}
          chosen={target === p.id}
          rollsLeft={round?.rollsLeft ?? 0}
        />
      ))}
    </Sheet>
  );
}

function BookRow({
  run,
  id,
  plan,
  theme,
  live,
  chosen,
  rollsLeft,
}: {
  run: RunState;
  id: (typeof PATTERNS)[number]['id'];
  plan: Plan | null;
  theme: ThemeId;
  live: boolean;
  chosen: boolean;
  rollsLeft: number;
}) {
  const p = PATTERN_BY_ID[id];
  const level = run.levels[id] ?? 0;
  let status: ReactNode = null;
  if (live) {
    if (!plan) status = <span className="status no">Your dice can’t make this yet.</span>;
    else if (plan.missing.length === 0) status = <span className="status yes">Ready.</span>;
    else {
      const est = Math.ceil(plan.estRolls);
      status = (
        <span className={`status ${est <= rollsLeft ? 'yes' : 'far'}`}>
          {plan.missing.length} {plan.missing.length === 1 ? 'set' : 'sets'} to go · about {est}{' '}
          rolls · scores about {fmt(plan.score)}
        </span>
      );
    }
  }
  return (
    <button
      type="button"
      className={`book-row ${chosen ? 'chosen' : ''} ${live && !plan ? 'off' : ''}`}
      disabled={live && !plan}
      onClick={() => {
        if (live && plan) setState({ target: id, sheet: null });
      }}
    >
      <span className="book-head">
        <b>{p.name}</b>
        {level ? <span className="level">Lv {level + 1}</span> : null}
        <span className="x">{xOf(run, id)}</span>
      </span>
      <span className="book-text">{p.text}</span>
      <span className="book-example">
        {p.example.map((set, i) => (
          <span className="book-set" key={i}>
            {set.map((k, j) => (
              <TileView key={j} kind={k} theme={theme} />
            ))}
          </span>
        ))}
      </span>
      {status}
      {live && plan && plan.missing.length > 0 ? (
        <span className="book-missing">
          Still to take:
          {plan.missing.map((m, i) => (
            <span className="book-set" key={i}>
              {m.tiles.map((k, j) => (
                <TileView key={j} kind={k} theme={theme} ghost />
              ))}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}

/** A die's faces and the chance of each. */
export function DieSheet({
  round,
  run,
  dieId,
  theme,
}: {
  round: RoundState | null;
  run: RunState;
  dieId: number;
  theme: ThemeId;
}) {
  const die = (round?.dice ?? run.dice).find((d) => d.id === dieId);
  if (!die) return null;
  const odds = faceOdds(die);
  return (
    <Sheet title={die.name} onClose={close}>
      <p className="sheet-note">
        {SHAPES[die.shape].name}. {SHAPES[die.shape].text} Flowers and seasons go to your shelf and
        the die rolls again.
      </p>
      <div className="die-faces">
        {die.faces.map((f, i) => (
          <div className="die-face" key={i}>
            <TileView kind={f.kind} enh={f.enh} theme={theme} />
            <span>{f.kind ? kindName(f.kind) : 'Blank'}</span>
            <small>
              {Math.round((odds[i] ?? 0) * 100)}%
              {f.weight && f.weight > 1 ? ` · lead ×${f.weight}` : ''}
            </small>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export function CharmSheet({ id, theme, run }: { id: string; theme: ThemeId; run: RunState }) {
  const c = CHARMS[id];
  if (!c) return null;
  const canSell = run.phase === 'shop' || run.phase === 'gift';
  return (
    <Sheet title={c.name} onClose={close}>
      <div className="charm-detail">
        <span
          className={`charm big rarity-${c.rarity}`}
          dangerouslySetInnerHTML={{ __html: charmSvg(id, theme) }}
        />
        <div>
          <p>{c.text}</p>
          <p className="muted">{c.rarity[0]?.toUpperCase() + c.rarity.slice(1)} charm.</p>
        </div>
      </div>
      {canSell ? (
        <button
          type="button"
          className="btn"
          onClick={() => {
            dispatch({ type: 'sellCharm', id });
            close();
          }}
        >
          Sell
        </button>
      ) : null}
    </Sheet>
  );
}

export function RackSheet({
  round,
  index,
  theme,
}: {
  round: RoundState;
  index: number;
  theme: ThemeId;
}) {
  const set = round.rack[index];
  if (!set) return null;
  return (
    <Sheet title="Send it back?" onClose={close}>
      <div className="book-set big">
        {set.tiles.map((t, j) => (
          <TileView key={j} kind={t.kind} enh={t.enh} theme={theme} />
        ))}
      </div>
      <p className="sheet-note">
        A return takes this set off your rack, to change your plan. You have {round.returnsLeft}{' '}
        {round.returnsLeft === 1 ? 'return' : 'returns'} left this round; each one you keep pays $1.
      </p>
      <div className="row">
        <button
          type="button"
          className="btn"
          disabled={round.returnsLeft <= 0}
          onClick={() => {
            dispatch({ type: 'round', action: { type: 'return', index } });
            close();
          }}
        >
          Send it back
        </button>
        <button type="button" className="btn ghost" onClick={close}>
          Keep it
        </button>
      </div>
    </Sheet>
  );
}

export function HelpSheet({ round }: { round: RoundState | null }) {
  const host = round ? hostOf(round.wind) : null;
  return (
    <Sheet title="How to play" onClose={close}>
      {host && round?.host ? (
        <p className="twist-note">
          <b>
            {host.name}: {host.twist.name}.
          </b>{' '}
          {host.twist.text}
        </p>
      ) : null}
      <ol className="rules">
        <li>Roll your dice. Every face is a tile.</li>
        <li>
          Tap a die to hold it; the rest roll again. Every roll in the round counts, so spend them
          well.
        </li>
        <li>
          When the dice show a set (a pair, a chow of three in a row, a pong of three alike, a kong
          of four), take it onto your rack. Those dice roll again next time.
        </li>
        <li>
          Four sets and a pair finish a hand: Mahjong! It scores, and your rack clears for the next
          hand.
        </li>
        <li>
          Patterns multiply the score: all pongs, one suit, a straight, the dragons. Aim for one in
          the hand book.
        </li>
        <li>
          Beat the target before your rolls run out. Bank early and every roll you keep pays $1.
        </li>
        <li>
          Flowers and seasons go to your shelf for a bonus, and the die rolls again. The round’s own
          season counts double.
        </li>
      </ol>
      <p className="sheet-note">
        Hold a die down to see all its faces. Tap a set on your rack to send it back.
      </p>
    </Sheet>
  );
}

export function SettingsSheet() {
  const settings = useStore((s) => s.settings);
  const inRun = useStore((s) => !!s.run);
  const set = (p: Partial<typeof settings>) => {
    updateSettings(p);
    const next = { ...settings, ...p };
    setVolumes(next.sfx, next.music, next.ambience);
  };
  return (
    <Sheet title="Settings" onClose={close}>
      <label className="setting">
        <span>Speed</span>
        <select
          value={settings.speed}
          onChange={(e) => set({ speed: e.target.value as typeof settings.speed })}
        >
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
          <option value="instant">Instant (no animation)</option>
        </select>
      </label>
      <label className="setting">
        <span>Guide’s hints</span>
        <input
          type="checkbox"
          checked={settings.hints}
          onChange={(e) => set({ hints: e.target.checked })}
        />
      </label>
      <label className="setting">
        <span>Colourway</span>
        <select
          value={settings.colourway}
          onChange={(e) => set({ colourway: e.target.value as typeof settings.colourway })}
        >
          <option value="theatre">Shadow theatre</option>
          <option value="porcelain">Porcelain</option>
          <option value="papercut">Papercut</option>
        </select>
      </label>
      <label className="setting">
        <span>Sound</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.sfx}
          onChange={(e) => set({ sfx: Number(e.target.value) })}
        />
      </label>
      <label className="setting">
        <span>Music</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.music}
          onChange={(e) => set({ music: Number(e.target.value) })}
        />
      </label>
      <label className="setting">
        <span>Haptics</span>
        <input
          type="checkbox"
          checked={settings.haptics}
          onChange={(e) => set({ haptics: e.target.checked })}
        />
      </label>
      {inRun ? (
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            if (window.confirm('Give up this run?')) abandonRun();
          }}
        >
          Give up this run
        </button>
      ) : null}
    </Sheet>
  );
}
