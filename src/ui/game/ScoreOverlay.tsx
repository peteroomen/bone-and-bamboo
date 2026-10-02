import { useEffect, useState } from 'react';
import { CURIOS } from '@/content/curios';
import { SET_TYPES } from '@/content/sets';
import type { PlayedSet, ScoreResult, ScoreStep } from '@/engine/scoring';
import { kindName } from '@/engine/tiles';
import { speedFactor } from '@/ui/state/store';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');
const STEP_MS = 520;

/** A set in a few words: "Chow 2-4 Bamboo", "Pong 9 Characters", "Three Dragons". */
function setLabel(set: PlayedSet): string {
  const name = SET_TYPES[set.kind].name;
  const first = set.tiles[0];
  if (!first || set.kind === 'dragons' || set.kind === 'winds') return name;
  const kind = (k: string) => kindName(k).replace(/^\d /, '');
  if (set.kind === 'chow') {
    const ranks = set.tiles.map((t) => Number(t.kind.slice(1)));
    return `${name} ${Math.min(...ranks)}-${Math.max(...ranks)} ${kind(first.kind)}`;
  }
  const n = isSuitedKind(first.kind)
    ? `${first.kind.slice(1)} ${kind(first.kind)}`
    : kind(first.kind);
  return `${name} ${n}`;
}

const isSuitedKind = (k: string) => 'psm'.includes(k.charAt(0));

function stepLabel(step: ScoreStep, table: readonly PlayedSet[]): string {
  if (step.type === 'set') {
    const set = table[step.index];
    return set ? setLabel(set) : SET_TYPES[step.kind].name;
  }
  if (step.type === 'curio') return CURIOS[step.id]?.name ?? step.id;
  return 'The host';
}

function stepDetail(step: ScoreStep): string {
  if (step.type === 'set') {
    const chips = step.setChips + step.levelChips + step.tileChips + step.enhChips;
    const mult = step.setMult + step.levelMult + step.enhMult + step.twistMult;
    const bits = [`+${fmt(chips)} chips`];
    if (mult) bits.push(`+${fmt(mult)} mult`);
    if (step.enhX !== 1) bits.push(`×${step.enhX}`);
    return bits.join('  ');
  }
  if (step.type === 'curio') {
    const bits: string[] = [];
    if (step.addChips) bits.push(`+${fmt(step.addChips)} chips`);
    if (step.addMult) bits.push(`+${fmt(step.addMult)} mult`);
    if (step.x !== 1) bits.push(`×${step.x}`);
    return bits.join('  ');
  }
  const bits: string[] = [];
  if (step.x !== 1) bits.push(`×${step.x}`);
  if (step.penalty) bits.push(`−${fmt(step.penalty)}`);
  return bits.join('  ');
}

/**
 * The scoring count-up: the table's sets then the curios, one step at a time, chips × mult
 * building up to the score. Everything shown comes from the engine's score steps.
 */
export function ScoreOverlay({
  table,
  score,
  target,
  onDone,
}: {
  table: readonly PlayedSet[];
  score: ScoreResult;
  target: number;
  onDone: () => void;
}) {
  const steps = score.steps;
  const instant = speedFactor() === 0;
  const [shown, setShown] = useState(instant ? steps.length : 0);
  const finished = shown >= steps.length;

  useEffect(() => {
    if (finished) return;
    const t = setTimeout(() => setShown((n) => n + 1), STEP_MS * speedFactor());
    return () => clearTimeout(t);
  }, [shown, finished]);

  const last = shown > 0 ? steps[shown - 1] : undefined;
  const chips = last ? last.chips : 0;
  const mult = last ? last.mult : 0;
  const x = last ? (last.type === 'set' ? last.x : last.xTotal) : 1;
  const won = score.total >= target;

  return (
    <div className="overlay" role="dialog" aria-label="Scoring" data-testid="score-overlay">
      <div className="score-card">
        <h2>Scoring</h2>
        <ol className="score-steps">
          {steps.slice(0, shown).map((s, i) => (
            <li key={i}>
              <span>{stepLabel(s, table)}</span>
              <i>{stepDetail(s)}</i>
            </li>
          ))}
        </ol>
        <div className="score-sum" data-testid="score-sum">
          <span className="chips">{fmt(chips)}</span>
          <span>×</span>
          <span className="mult">{fmt(mult)}</span>
          {x !== 1 && (
            <>
              <span>×</span>
              <span className="mult">{x}</span>
            </>
          )}
        </div>
        {finished ? (
          <div className="score-end">
            <div className="score-total" data-testid="score-total">
              {fmt(score.total)}
            </div>
            <div className={`score-verdict ${won ? 'won' : 'lost'}`}>
              {won ? `Beats the target of ${fmt(target)}` : `Short of the target of ${fmt(target)}`}
            </div>
            <button
              type="button"
              className="btn primary"
              data-testid="btn-score-continue"
              onClick={onDone}
            >
              Continue
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn ghost"
            data-testid="btn-score-skip"
            onClick={() => setShown(steps.length)}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
