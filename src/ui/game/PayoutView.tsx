import { WIND_NAMES } from '@/content/rules';
import type { RunState } from '@/engine/runTypes';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** The round is won: what you scored and what you were paid. */
export function PayoutView({ run, onContinue }: { run: RunState; onContinue: () => void }) {
  const p = run.payout;
  const score = run.scores[run.scores.length - 1] ?? 0;
  if (!p) return null;
  const rows: [string, number][] = [
    ['Reward', p.reward],
    ['Unused discards', p.discards],
    ['Interest', p.interest],
    ['Curios', p.income],
    ['Gold tiles', p.gold],
  ];
  return (
    <div className="payout" data-testid="payout">
      <h2>{WIND_NAMES[run.roundIndex]} is won</h2>
      <p className="payout-score">
        <b>{fmt(score)}</b> <span>against {fmt(run.target)}</span>
      </p>
      <ul className="payout-rows">
        {rows
          .filter(([, n]) => n > 0)
          .map(([label, n]) => (
            <li key={label}>
              <span>{label}</span>
              <b>+${n}</b>
            </li>
          ))}
        <li className="total">
          <span>Total</span>
          <b>+${p.total}</b>
        </li>
      </ul>
      <p className="muted">You now hold ${run.money}.</p>
      <button
        type="button"
        className="btn primary"
        data-testid="btn-payout-continue"
        onClick={onContinue}
      >
        Continue
      </button>
    </div>
  );
}
