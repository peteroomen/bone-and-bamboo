import { useEffect, useMemo, useState } from 'react';
import { CHASE, PATTERNS } from '@/content/handChase';
import {
  chaseAdvice,
  chasePlan,
  chaseReduce,
  chaseTarget,
  handOptions,
  improvingTiles,
  newChase,
  selectedHand,
  type ChaseAction,
  type ChaseState,
} from '@/engine/handChase';
import { kindName, sortTiles } from '@/engine/tiles';
import { TileView } from '@/ui/art/Tile';
import { setScene, sfx } from '@/ui/audio/audio';
import { useTheme, useStore, updateSettings } from '@/ui/state/store';
import '@/ui/styles/hand-chase.css';

const KEY = 'bb.hand-chase.v1';
const WINDS = ['East', 'South', 'West', 'North'];
interface Session {
  seed: number;
  actions: ChaseAction[];
  state: ChaseState;
}
function load(): Session | null {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null') as {
      version?: number;
      seed?: number;
      actions?: ChaseAction[];
    } | null;
    if (
      !data ||
      data.version !== 1 ||
      !Number.isInteger(data.seed) ||
      !Array.isArray(data.actions) ||
      data.actions.length > 200
    )
      return null;
    let state = newChase(data.seed!);
    for (const a of data.actions) {
      const result = chaseReduce(state, a);
      if (result.error) return null;
      state = result.state;
    }
    return { seed: data.seed!, actions: data.actions, state };
  } catch {
    return null;
  }
}

export function HandChaseView() {
  const theme = useTheme();
  const volume = useStore((s) => s.settings.sfx);
  const [session, setSession] = useState<Session | null>(load);
  const [selected, setSelected] = useState<number[]>([]);
  const [help, setHelp] = useState(false);
  const [message, setMessage] = useState('Keep useful tiles. Exchange the rest.');
  const [confirmRestart, setConfirmRestart] = useState(false);
  const s = session?.state;
  const rack = useMemo(() => sortTiles(s?.rack ?? []), [s?.rack]);
  const options = useMemo(() => handOptions(rack, s?.levels), [rack, s?.levels]);
  const plan = useMemo(() => chasePlan(rack), [rack]);
  const picked = rack.filter((t) => selected.includes(t.id));
  const score = useMemo(() => selectedHand(picked, s?.levels), [picked, s?.levels]);
  const waits = useMemo(
    () => (s && !options.some((o) => o.complete) ? improvingTiles(s) : []),
    [s, options],
  );
  const pairCount = new Set(
    rack.filter((t) => rack.filter((x) => x.kind === t.kind).length >= 2).map((t) => t.kind),
  ).size;
  useEffect(() => {
    if (!session) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ version: 1, seed: session.seed, actions: session.actions }),
      );
    } catch {
      /* The game still works without storage. */
    }
  }, [session]);
  useEffect(() => {
    if (!help && !confirmRestart) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHelp(false);
        setConfirmRestart(false);
      }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(
        document.querySelectorAll<HTMLButtonElement>('.chase-modal button:not(:disabled)'),
      );
      const first = buttons[0];
      const last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [help, confirmRestart]);
  const wind = s?.wind;
  const phase = s?.phase;
  useEffect(() => {
    window.scrollTo(0, 0);
    setScene(
      wind !== undefined
        ? { kind: phase === 'won' ? 'won' : phase === 'lost' ? 'over' : 'round', wind }
        : { kind: 'title' },
    );
  }, [wind, phase]);
  const start = (seed = crypto.getRandomValues(new Uint32Array(1))[0]!) => {
    setSession({ seed, actions: [], state: newChase(seed) });
    setSelected([]);
    setMessage('Keep useful tiles. Exchange the rest.');
    setConfirmRestart(false);
  };
  const act = (action: ChaseAction) => {
    if (!session) return;
    const r = chaseReduce(session.state, action);
    if (r.error) {
      setMessage(r.error);
      return;
    }
    setSession({ ...session, actions: [...session.actions, action], state: r.state });
    setSelected([]);
    if (action.type === 'play') {
      const last = r.state.history.at(-1)!;
      setMessage(`${last.name}: +${last.total.toLocaleString()} points`);
      if (last.complete) sfx.win();
      else sfx.play(last.ids.length);
    } else if (action.type === 'exchange') {
      sfx.discard(action.ids.length);
      setMessage('New tiles drawn. Your kept tiles stay.');
    } else {
      sfx.bank();
      setMessage('A fresh pile. Your pattern upgrades carry over.');
    }
  };
  const suggest = () => {
    if (!s) return;
    const a = chaseAdvice(s);
    if (a.type === 'bank') {
      setMessage('Target reached. Bank this wind to choose an upgrade.');
      return;
    }
    if ('ids' in a) setSelected([...a.ids]);
    setMessage(
      a.type === 'exchange'
        ? `Suggested exchange: keep the useful groups for ${plan.label}. This is a suggestion, not a promise.`
        : 'This is your highest-scoring hand now. You can keep chasing instead.',
    );
  };
  const small = score && !score.complete;
  return (
    <main className="chase" data-theme={theme} data-testid="hand-chase">
      <header className="chase-header">
        <div>
          <span className="chase-kicker">BONE &amp; BAMBOO · PLAYTEST</span>
          <h1>{s ? `${WINDS[s.wind]} wind` : 'Chase a hand'}</h1>
        </div>
        <nav>
          <button onClick={() => setHelp(true)}>Hands</button>
          <button
            aria-label={volume ? 'Mute audio' : 'Unmute audio'}
            onClick={() =>
              updateSettings({
                sfx: volume ? 0 : 0.8,
                music: volume ? 0 : 0.5,
                ambience: volume ? 0 : 0.5,
              })
            }
          >
            {volume ? 'Sound on' : 'Sound off'}
          </button>
        </nav>
      </header>
      {!s ? (
        <section className="chase-intro">
          <div className="chase-demo">
            {['p2', 'p3', 'p4', 's7', 's7'].map((kind, id) => (
              <TileView key={id} tile={{ kind, id }} theme={theme} />
            ))}
          </div>
          <h2>One more tile could change everything.</h2>
          <p>
            Keep a rack of 16 tiles. Exchange up to five at a time. Build{' '}
            <strong>four melds and a pair</strong>, or chase <strong>Seven Pairs</strong>.
          </p>
          <p>
            Each wind gives you <strong>{CHASE.plays} scoring plays</strong> and{' '}
            <strong>{CHASE.exchanges} exchanges</strong>. Small sets are a fallback. Complete hands
            are the prize.
          </p>
          <button className="chase-primary" onClick={() => start()}>
            Start a run
          </button>
          <p className="chase-note">
            124 tiles · numbered suits + winds · random pile
            <br />
            No dragon tiles or passive modifiers in this playtest.
          </p>
        </section>
      ) : (
        <>
          <section className="chase-hud" aria-label="Round progress">
            <div>
              <small>POINTS / TARGET</small>
              <strong data-testid="chase-points">
                {s.points.toLocaleString()} <span>/ {chaseTarget(s).toLocaleString()}</span>
              </strong>
              <progress value={Math.min(s.points, chaseTarget(s))} max={chaseTarget(s)} />
            </div>
            <div>
              <b>{s.plays}</b>
              <small>plays</small>
            </div>
            <div>
              <b>{s.exchanges}</b>
              <small>exchanges</small>
            </div>
            <div>
              <b>{s.pile.length}</b>
              <small>in pile</small>
            </div>
          </section>
          {s.phase === 'play' ? (
            <>
              <section className="chase-goal" aria-label="Hand progress">
                {options.some((o) => o.complete) ? (
                  <>
                    <strong className="chase-ready">Complete hand ready</strong>
                    <button
                      onClick={() => {
                        setSelected([...options[0]!.ids]);
                        setMessage('Complete hand selected. Check its score, then play.');
                      }}
                    >
                      Select hand · {options[0]!.total.toLocaleString()}
                    </button>
                  </>
                ) : (
                  <>
                    <strong>
                      {plan.label === 'Seven Pairs'
                        ? `Seven Pairs · ${pairCount}/7 pairs`
                        : `${plan.melds}/4 melds · ${plan.pairs ? 'pair held' : 'pair needed'} · ${plan.partials} near-melds`}
                    </strong>
                    <span>
                      {plan.label !== 'Seven Pairs'
                        ? `Or Seven Pairs: ${pairCount}/7`
                        : 'Seven different pairs make a complete hand.'}
                    </span>
                  </>
                )}
                <div className="chase-waits">
                  {waits.length ? (
                    <>
                      <span>Completes a hand:</span>
                      {waits.slice(0, 5).map((w) => (
                        <span
                          key={w.kind}
                          title={`${kindName(w.kind)}: ${w.copies} copies remain unseen`}
                        >
                          <TileView theme={theme} tile={{ kind: w.kind, id: -1 }} />×{w.copies}
                        </span>
                      ))}
                      {waits.length > 5 && <span>+{waits.length - 5} kinds</span>}
                    </>
                  ) : (
                    <span>
                      {options[0]?.complete
                        ? 'Choose your payoff, or keep improving.'
                        : 'Keep matching tiles and near-runs. “Suggest” can help.'}
                    </span>
                  )}
                </div>
              </section>
              <section className="chase-rack" aria-label="Your rack">
                {rack.map((t) => (
                  <button
                    key={t.id}
                    className={`hand-tile ${selected.includes(t.id) ? 'is-picked' : ''}`}
                    aria-label={kindName(t.kind)}
                    aria-pressed={selected.includes(t.id)}
                    data-tile-id={t.id}
                    onClick={() =>
                      setSelected((old) =>
                        old.includes(t.id) ? old.filter((id) => id !== t.id) : [...old, t.id],
                      )
                    }
                  >
                    <TileView tile={t} theme={theme} />
                  </button>
                ))}
              </section>
              <section className="chase-selection" aria-live="polite">
                <strong>
                  {score
                    ? `${score.total.toLocaleString()} points · ${score.name}`
                    : selected.length
                      ? `${selected.length} selected · not a scoring hand`
                      : 'Choose tiles to score or exchange'}
                </strong>
                <span>
                  {score
                    ? `${score.chips} chips × ${score.mult} mult${small ? ' · uses one of your scoring plays' : ''}`
                    : 'A meld is a chow (123) or matching triple/quad.'}
                </span>
              </section>
              <div className="chase-actions">
                <button
                  disabled={!score}
                  className="chase-primary"
                  onClick={() => act({ type: 'play', ids: selected })}
                >
                  {small ? 'Play small hand' : 'Play hand'}
                </button>
                <button
                  disabled={
                    !selected.length ||
                    selected.length > CHASE.exchangeSize ||
                    !s.exchanges ||
                    !s.pile.length
                  }
                  onClick={() => act({ type: 'exchange', ids: selected })}
                >
                  Exchange {selected.length || ''}
                </button>
                <button onClick={suggest}>Suggest</button>
                <button disabled={!selected.length} onClick={() => setSelected([])}>
                  Clear
                </button>
              </div>
              <p className="chase-message" role="status">
                {message}
              </p>
              {s.points >= chaseTarget(s) && (
                <button className="chase-bank" onClick={() => act({ type: 'bank' })}>
                  Target reached · bank {WINDS[s.wind]} →
                </button>
              )}
              {!s.exchanges && !options.length && (
                <p className="chase-error">
                  No scoring hand or exchanges left. Try this deal again with a different plan.
                </p>
              )}
            </>
          ) : (
            <section className="chase-result">
              <h2>
                {s.phase === 'upgrade'
                  ? `${WINDS[s.wind]} cleared`
                  : s.phase === 'won'
                    ? 'Four winds, well played.'
                    : 'The wind got away.'}
              </h2>
              <p>
                {s.points.toLocaleString()} points · {s.history.filter((h) => h.complete).length}{' '}
                complete hands this wind
              </p>
              {s.phase === 'upgrade' ? (
                <>
                  <p>
                    Choose +{CHASE.upgradeMult} mult for every complete hand, or +
                    {CHASE.specialistUpgradeMult} for a specialist pattern. Then face{' '}
                    {WINDS[s.wind + 1]}.
                  </p>
                  <div className="chase-upgrades">
                    {PATTERNS.map((p) => (
                      <button key={p.id} onClick={() => act({ type: 'upgrade', pattern: p.id })}>
                        <strong>{p.name}</strong>
                        <span>{p.id === 'complete' ? 'Every complete hand' : p.rule}</span>
                        <small>
                          +{p.id === 'complete' ? CHASE.upgradeMult : CHASE.specialistUpgradeMult}{' '}
                          mult · level {(s.levels[p.id] ?? 0) + 1}
                        </small>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p>
                    {s.phase === 'lost'
                      ? 'Small sets spend your plays. Try keeping those tiles for a complete hand.'
                      : 'Which hand was worth waiting for? Try a new deal and a different pattern.'}
                  </p>
                  <button className="chase-primary" onClick={() => start()}>
                    New run
                  </button>
                  <button onClick={() => start(s.seed)}>Replay same deal</button>
                </>
              )}
            </section>
          )}
          {s.history.length > 0 && (
            <details className="chase-history">
              <summary>Scored hands · {s.history.length}</summary>
              {s.history.map((h, i) => (
                <p key={i}>
                  {h.name} <b>+{h.total.toLocaleString()}</b>
                </p>
              ))}
            </details>
          )}
          <footer>
            <span>Deal {s.seed} · saved automatically</span>
            <button onClick={() => setConfirmRestart(true)}>Restart</button>
          </footer>
        </>
      )}
      {help && (
        <div className="chase-modal" role="dialog" aria-modal="true" aria-label="Hand book">
          <div>
            <header>
              <h2>Hands worth chasing</h2>
              <button autoFocus onClick={() => setHelp(false)}>
                Close
              </button>
            </header>
            <p>
              Play a complete hand all at once. Unplayed tiles stay in your rack. Each hand scores
              separately and adds to your round points.
            </p>
            <p>
              <strong>Four melds + one pair</strong> normally uses 14 tiles. Each kong adds one
              extra tile: 15 with one kong, 16 with two. Different winds cannot form a chow.
            </p>
            <p>
              Complete hand: {CHASE.completeChips} + tile chips, multiplied by {CHASE.completeMult}{' '}
              + pattern bonuses. Matching bonuses stack. Small hands score flat points: pair 20,
              chow 35, pong 70, kong 150.
            </p>
            {PATTERNS.map((p) => (
              <p key={p.id}>
                <strong>
                  {p.name}
                  {p.mult ? ` · +${p.mult} mult` : ''}
                </strong>
                <br />
                {p.rule}
              </p>
            ))}
            <p>
              “Copies left” counts tiles you have not seen, not where they are. Suggestions never
              inspect the pile order.
            </p>
            <button onClick={() => setHelp(false)}>Back to the rack</button>
          </div>
        </div>
      )}
      {confirmRestart && (
        <div className="chase-modal" role="dialog" aria-modal="true" aria-label="Restart run">
          <div>
            <h2>Start again?</h2>
            <p>This replaces the current playtest run.</p>
            <button autoFocus onClick={() => setConfirmRestart(false)}>
              Keep playing
            </button>
            <button onClick={() => start(s?.seed)}>Replay this deal</button>
            <button onClick={() => start()}>New random deal</button>
          </div>
        </div>
      )}
    </main>
  );
}
