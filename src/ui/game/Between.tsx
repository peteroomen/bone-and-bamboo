import { useState } from 'react';
import { CHARMS, CHARM_SLOTS, charmPrice } from '@/content/charms';
import { hostOf } from '@/content/hosts';
import { PATTERN_BY_ID } from '@/content/patterns';
import { RULES } from '@/content/rules';
import { SHAPES } from '@/content/shapes';
import { TOOLS } from '@/content/tools';
import { ALL_KINDS, BONUS_KINDS, SUITED, type SuitedSuit, type TileKind } from '@/content/tiles';
import type { Die } from '@/engine/dice';
import { cupSize } from '@/engine/round';
import {
  type RunAction,
  type RunState,
  isHostRound,
  rerollPrice,
  runProblem,
  windOf,
} from '@/engine/run';
import { kindName, rankOf, suitOf } from '@/engine/tiles';
import type { ToolArg } from '@/engine/tools';
import { toolProblem } from '@/engine/tools';
import { TileView } from '@/ui/art/Tile';
import { charmSvg } from '@/ui/art/icons';
import type { ThemeId } from '@/ui/art/tiles';
import { dispatch, setState } from '@/ui/state/store';
import { Sheet } from './Sheets';

const SHAPE_MARK: Record<Die['shape'], string> = { long: '▭', d6: '◻', d8: '◇', d12: '⬠' };

/** A die as a strip of its faces. */
export function DieCard({
  die,
  theme,
  onFace,
  pickedFace,
  compact = false,
}: {
  die: Die;
  theme: ThemeId;
  onFace?: (i: number) => void;
  pickedFace?: number | null;
  compact?: boolean;
}) {
  return (
    <div className={`die-card ${compact ? 'compact' : ''}`}>
      <div className="die-card-head">
        <span className="shape-mark" aria-hidden>
          {SHAPE_MARK[die.shape]}
        </span>
        <b>{die.name}</b>
        <small>{SHAPES[die.shape].faces} faces</small>
      </div>
      <div className="die-card-faces">
        {die.faces.map((f, i) =>
          onFace ? (
            <button
              type="button"
              key={i}
              className={`face-btn ${pickedFace === i ? 'picked' : ''}`}
              onClick={() => onFace(i)}
              aria-label={f.kind ? kindName(f.kind) : 'Blank'}
            >
              <TileView kind={f.kind} enh={f.enh} theme={theme} />
              {f.weight && f.weight > 1 ? <i className="lead">×{f.weight}</i> : null}
            </button>
          ) : (
            <span key={i} className="face-btn">
              <TileView kind={f.kind} enh={f.enh} theme={theme} />
              {f.weight && f.weight > 1 ? <i className="lead">×{f.weight}</i> : null}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

export function Cashout({ run }: { run: RunState }) {
  const lines = run.cashout ?? [];
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const last = run.history[run.history.length - 1];
  return (
    <div className="panel-screen">
      <div className="panel">
        <h2 className="panel-title">Round won</h2>
        {last ? (
          <p className="panel-sub">
            {last.score.toLocaleString('en-GB')} against {last.target.toLocaleString('en-GB')} ·{' '}
            {last.hands} {last.hands === 1 ? 'hand' : 'hands'}
          </p>
        ) : null}
        <ul className="cash-lines">
          {lines.map((l, i) => (
            <li key={i}>
              <span>{l.label}</span>
              <b>${l.amount}</b>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn big"
          onClick={() => dispatch({ type: 'collect' })}
          data-testid="collect"
        >
          Collect ${total}
        </button>
      </div>
    </div>
  );
}

function ReplacePicker({
  run,
  theme,
  onPick,
  onCancel,
}: {
  run: RunState;
  theme: ThemeId;
  onPick: (dieId: number) => void;
  onCancel: () => void;
}) {
  return (
    <Sheet title="Your cup is full" onClose={onCancel}>
      <p className="sheet-note">Choose a die to give up for the new one.</p>
      {run.dice.map((d) => (
        <button type="button" key={d.id} className="pick-die" onClick={() => onPick(d.id)}>
          <DieCard die={d} theme={theme} compact />
        </button>
      ))}
    </Sheet>
  );
}

export function Gift({ run, theme }: { run: RunState; theme: ThemeId }) {
  const [pending, setPending] = useState<number | null>(null);
  const host = hostOf(windOf(run.round));
  const full = run.dice.length >= cupSize(run.charms);
  return (
    <div className="panel-screen">
      <div className="panel">
        <h2 className="panel-title">{host.name}’s gift</h2>
        <p className="panel-sub">
          Choose a die to keep{full ? ' (your cup is full: one die goes)' : ''}.
        </p>
        <div className="offer-list">
          {(run.gift ?? []).map((d, i) => (
            <button
              type="button"
              key={i}
              className="offer"
              onClick={() => (full ? setPending(i) : dispatch({ type: 'pickGift', index: i }))}
            >
              <DieCard die={d} theme={theme} />
            </button>
          ))}
        </div>
        <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'skipGift' })}>
          No thanks
        </button>
      </div>
      {pending !== null ? (
        <ReplacePicker
          run={run}
          theme={theme}
          onCancel={() => setPending(null)}
          onPick={(id) => {
            dispatch({ type: 'pickGift', index: pending, replace: id });
            setPending(null);
          }}
        />
      ) : null}
    </div>
  );
}

export function Shop({
  run,
  theme,
  onToast,
}: {
  run: RunState;
  theme: ThemeId;
  onToast: (s: string) => void;
}) {
  const shop = run.shop;
  const [pendingDie, setPendingDie] = useState<number | null>(null);
  const [pendingCharm, setPendingCharm] = useState<number | null>(null);
  if (!shop) return null;
  const act = (a: RunAction) => {
    const p = dispatch(a);
    if (p) onToast(p);
  };
  const full = run.dice.length >= cupSize(run.charms);
  const next = run.round + 1;
  const nextHost = isHostRound(next);
  return (
    <div className="panel-screen shop">
      <div className="panel wide">
        <div className="shop-head">
          <h2 className="panel-title">The teahouse</h2>
          <span className="purse">
            <span className="coin">$</span>
            {run.money}
          </span>
        </div>
        <section>
          <h3>Charms</h3>
          <div className="shelf-row">
            {shop.charms.map((o, i) => {
              const c = CHARMS[o.item];
              return (
                <button
                  type="button"
                  key={i}
                  className={`ware ${o.sold ? 'sold' : ''}`}
                  disabled={o.sold || run.money < o.price}
                  onClick={() => {
                    if (run.charms.length >= CHARM_SLOTS) setPendingCharm(i);
                    else act({ type: 'buyCharm', index: i });
                  }}
                >
                  <span
                    className={`charm rarity-${c?.rarity}`}
                    dangerouslySetInnerHTML={{ __html: charmSvg(o.item, theme) }}
                  />
                  <span className="ware-text">
                    <b>{c?.name}</b>
                    <small>{c?.text}</small>
                  </span>
                  <span className="price">{o.sold ? 'Sold' : `$${o.price}`}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h3>Dice</h3>
          <div className="shelf-row dice">
            {shop.dice.map((o, i) => (
              <button
                type="button"
                key={i}
                className={`ware die-ware ${o.sold ? 'sold' : ''}`}
                disabled={o.sold || run.money < o.price}
                onClick={() => (full ? setPendingDie(i) : act({ type: 'buyDie', index: i }))}
              >
                <DieCard die={o.item} theme={theme} compact />
                <span className="price">{o.sold ? 'Sold' : `$${o.price}`}</span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <h3>Tools and pages</h3>
          <div className="shelf-row">
            {shop.tools.map((o, i) => {
              const t = TOOLS[o.item];
              return (
                <button
                  type="button"
                  key={i}
                  className={`ware ${o.sold ? 'sold' : ''}`}
                  disabled={o.sold || run.money < o.price || run.tools.length >= 2}
                  onClick={() => act({ type: 'buyTool', index: i })}
                >
                  <span className="tool-mark">{t?.name.charAt(0)}</span>
                  <span className="ware-text">
                    <b>{t?.name}</b>
                    <small>{t?.text}</small>
                  </span>
                  <span className="price">{o.sold ? 'Sold' : `$${o.price}`}</span>
                </button>
              );
            })}
            {shop.pages.map((o, i) => {
              const p = PATTERN_BY_ID[o.item];
              const lv = (run.levels[o.item] ?? 0) + 1;
              return (
                <button
                  type="button"
                  key={`p${i}`}
                  className={`ware ${o.sold ? 'sold' : ''}`}
                  disabled={o.sold || run.money < o.price}
                  onClick={() => act({ type: 'buyPage', index: i })}
                >
                  <span className="tool-mark page">頁</span>
                  <span className="ware-text">
                    <b>Hand page: {p.name}</b>
                    <small>
                      Level {lv} → {lv + 1}:{' '}
                      {o.item === 'chicken' ? '+15 chips, +1 mult' : `+${p.step} on its ×mult`}
                    </small>
                  </span>
                  <span className="price">{o.sold ? 'Sold' : `$${o.price}`}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section>
          <h3>
            Your cup ({run.dice.length}/{cupSize(run.charms)})
          </h3>
          <div className="cup-list">
            {run.dice.map((d, i) => (
              <div className="cup-item" key={d.id}>
                <DieCard die={d} theme={theme} compact />
                <div className="cup-actions">
                  <button
                    type="button"
                    className="btn tiny ghost"
                    disabled={i === 0}
                    onClick={() => act({ type: 'moveDie', dieId: d.id, to: i - 1 })}
                    aria-label="Move left"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    className="btn tiny ghost"
                    disabled={!!runProblem(run, { type: 'sellDie', dieId: d.id })}
                    onClick={() => act({ type: 'sellDie', dieId: d.id })}
                  >
                    Sell ${RULES.shop.dieSell}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {run.tools.length ? (
            <div className="pocket">
              <span>Your pocket:</span>
              {run.tools.map((id, slot) => (
                <button
                  type="button"
                  key={slot}
                  className="btn small"
                  onClick={() => setState({ sheet: { kind: 'tool', slot } })}
                >
                  Use {TOOLS[id]?.name}
                </button>
              ))}
            </div>
          ) : null}
          <div className="pocket">
            <span>Your charms:</span>
            {run.charms.length === 0 ? <small className="muted">none yet</small> : null}
            {run.charms.map((id) => (
              <button
                type="button"
                key={id}
                className={`charm rarity-${CHARMS[id]?.rarity}`}
                aria-label={CHARMS[id]?.name}
                onClick={() => setState({ sheet: { kind: 'charm', id } })}
                dangerouslySetInnerHTML={{ __html: charmSvg(id, theme) }}
              />
            ))}
          </div>
        </section>
        <div className="shop-foot">
          <button
            type="button"
            className="btn ghost"
            disabled={run.money < rerollPrice(run)}
            onClick={() => act({ type: 'reroll' })}
          >
            Reroll ${rerollPrice(run)}
          </button>
          <button
            type="button"
            className="btn big"
            data-testid="next"
            onClick={() => act({ type: 'next' })}
          >
            {nextHost ? `Meet ${hostOf(windOf(next)).name}` : `Round ${next + 1}`} ·{' '}
            {run.targets[next]?.toLocaleString('en-GB')}
          </button>
        </div>
      </div>
      {pendingDie !== null ? (
        <ReplacePicker
          run={run}
          theme={theme}
          onCancel={() => setPendingDie(null)}
          onPick={(id) => {
            act({ type: 'buyDie', index: pendingDie, replace: id });
            setPendingDie(null);
          }}
        />
      ) : null}
      {pendingCharm !== null ? (
        <Sheet title="Your charm slots are full" onClose={() => setPendingCharm(null)}>
          <p className="sheet-note">Choose a charm to give up.</p>
          <div className="shelf-row">
            {run.charms.map((id) => (
              <button
                type="button"
                key={id}
                className="ware"
                onClick={() => {
                  act({ type: 'buyCharm', index: pendingCharm, replace: id });
                  setPendingCharm(null);
                }}
              >
                <span
                  className={`charm rarity-${CHARMS[id]?.rarity}`}
                  dangerouslySetInnerHTML={{ __html: charmSvg(id, theme) }}
                />
                <span className="ware-text">
                  <b>{CHARMS[id]?.name}</b>
                  <small>sells for ${Math.floor(charmPrice(id) / 2)}</small>
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

/** Use a tool: pick a die and a face (and whatever else the tool needs). */
export function ToolSheet({
  run,
  slot,
  theme,
  onToast,
}: {
  run: RunState;
  slot: number;
  theme: ThemeId;
  onToast: (s: string) => void;
}) {
  const id = run.tools[slot];
  const tool = id ? TOOLS[id] : undefined;
  const [pick, setPick] = useState<{ dieId: number; face: number } | null>(null);
  const [src, setSrc] = useState<{ dieId: number; face: number } | null>(null);
  if (!id || !tool) return null;
  const close = () => setState({ sheet: null });
  const apply = (arg?: ToolArg) => {
    if (!pick) return;
    const problem = toolProblem(id, run.dice, pick.dieId, pick.face, arg);
    if (problem) {
      onToast(problem);
      return;
    }
    dispatch({
      type: 'useTool',
      slot,
      dieId: pick.dieId,
      face: pick.face,
      ...(arg ? { arg } : {}),
    });
    close();
  };
  const face = pick ? run.dice.find((d) => d.id === pick.dieId)?.faces[pick.face] : undefined;
  const op = tool.op.type;
  let choose: React.ReactNode = null;
  if (pick && face) {
    if (op === 'chisel') {
      choose = (
        <div className="kind-grid">
          {ALL_KINDS.filter((k) => !BONUS_KINDS.includes(k)).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => apply({ kind: k })}
              aria-label={kindName(k)}
            >
              <TileView kind={k} theme={theme} />
            </button>
          ))}
        </div>
      );
    } else if (op === 'brush') {
      choose = (
        <div className="row">
          {SUITED.filter((s) => face.kind && suitOf(face.kind) !== s).map((s: SuitedSuit) => (
            <button type="button" key={s} className="btn" onClick={() => apply({ suit: s })}>
              <TileView
                kind={`${s}${face.kind ? rankOf(face.kind) : 1}` as TileKind}
                theme={theme}
              />
            </button>
          ))}
        </div>
      );
    } else if (op === 'nudge') {
      choose = (
        <div className="row">
          <button type="button" className="btn" onClick={() => apply({ step: -1 })}>
            Down one
          </button>
          <button type="button" className="btn" onClick={() => apply({ step: 1 })}>
            Up one
          </button>
        </div>
      );
    } else if (op === 'rubbing') {
      choose = (
        <>
          <p className="sheet-note">Now pick the face to copy onto it.</p>
          {run.dice.map((d) => (
            <DieCard
              key={d.id}
              die={d}
              theme={theme}
              compact
              pickedFace={src?.dieId === d.id ? src.face : null}
              onFace={(f) => {
                setSrc({ dieId: d.id, face: f });
                const problem = toolProblem(id, run.dice, pick.dieId, pick.face, {
                  fromDieId: d.id,
                  fromFace: f,
                });
                if (problem) onToast(problem);
                else {
                  dispatch({
                    type: 'useTool',
                    slot,
                    dieId: pick.dieId,
                    face: pick.face,
                    arg: { fromDieId: d.id, fromFace: f },
                  });
                  close();
                }
              }}
            />
          ))}
        </>
      );
    } else {
      choose = (
        <button type="button" className="btn big" onClick={() => apply()}>
          Use {tool.name}
        </button>
      );
    }
  }
  return (
    <Sheet title={tool.name} onClose={close}>
      <p className="sheet-note">{tool.text}</p>
      {!pick ? <p className="sheet-note">Pick a face on one of your dice.</p> : null}
      {!pick || op !== 'rubbing'
        ? run.dice.map((d) => (
            <DieCard
              key={d.id}
              die={d}
              theme={theme}
              compact
              pickedFace={pick?.dieId === d.id ? pick.face : null}
              onFace={(f) => setPick({ dieId: d.id, face: f })}
            />
          ))
        : null}
      {choose}
    </Sheet>
  );
}
