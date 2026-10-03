import { useEffect, useRef, useState } from 'react';
import { FACTORY, MACHINES, type GateSuit, type MachineId } from '@/content/factory';
import {
  accepts,
  canAuto,
  factoryReduce,
  newFactory,
  type FactoryAction,
  type FactoryState,
} from '@/engine/factory';
import { kindName, type Tile } from '@/engine/tiles';
import { TileView } from '@/ui/art/Tile';
import { sfx } from '@/ui/audio/audio';
import { useTheme, useStore, updateSettings } from '@/ui/state/store';
import '@/ui/styles/factory.css';

const KEY = 'bb.factory.v1';
interface Session {
  seed: number;
  actions: FactoryAction[];
  state: FactoryState;
}
function fresh(seed: number): Session {
  return { seed, actions: [], state: newFactory(seed) };
}
function load(): Session {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
    if (
      data &&
      Number.isInteger(data.seed) &&
      Array.isArray(data.actions) &&
      data.actions.length < 2000
    ) {
      let state = newFactory(data.seed);
      for (const action of data.actions) {
        const result = factoryReduce(state, action);
        if (result.error) return fresh(24);
        state = result.state;
      }
      return { seed: data.seed, actions: data.actions, state };
    }
  } catch {
    /* Storage is optional for this toy. */
  }
  return fresh(24);
}

export function FactoryView() {
  const theme = useTheme();
  const volume = useStore((s) => s.settings.sfx);
  const [session, setSession] = useState<Session>(load);
  const [selected, setSelected] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [help, setHelp] = useState(false);
  const [reset, setReset] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const s = session.state;
  const previousSound = useRef({ cursor: s.cursor, score: s.score });
  useEffect(() => {
    if (s.score > previousSound.current.score) sfx.coin();
    else if (s.cursor > previousSound.current.cursor) sfx.take();
    previousSound.current = { cursor: s.cursor, score: s.score };
  }, [s.cursor, s.score]);
  const head = s.supply[s.cursor];
  const chosen = s.tray.find((t) => t.id === selected) ?? head;
  const routeable = canAuto(s);
  const tile = (t: Tile) => <TileView tile={t} theme={theme} />;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ seed: session.seed, actions: session.actions }));
    } catch {
      /* Continue playing if storage is unavailable. */
    }
  }, [session]);
  useEffect(() => {
    if (help || reset) dialog.current?.showModal();
    else dialog.current?.close();
  }, [help, reset]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSession((previous) => {
        if (!canAuto(previous.state)) return previous;
        const action: FactoryAction = { type: 'step' };
        return {
          ...previous,
          actions: [...previous.actions, action],
          state: factoryReduce(previous.state, action).state,
        };
      });
    }, FACTORY.autoMs);
    return () => window.clearInterval(timer);
  }, [running]);
  // A blocked gate stops the clock; manual routing never silently resumes it.
  useEffect(() => {
    if (!running || routeable) return;
    const timer = window.setTimeout(() => setRunning(false), 0);
    return () => window.clearTimeout(timer);
  }, [running, routeable]);

  function act(action: FactoryAction) {
    setRunning(false);
    const result = factoryReduce(s, action);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError('');
    setSelected(null);
    setSession({ ...session, actions: [...session.actions, action], state: result.state });
  }
  function configure(target: MachineId, suit: GateSuit, enabled = s.gate.enabled) {
    act({ type: 'gate', target, suit, enabled });
  }
  function restart() {
    setRunning(false);
    setSelected(null);
    setError('');
    setReset(false);
    setSession(fresh((s.seed + 1) >>> 0));
  }
  const remaining = s.supply.length - s.cursor;
  const totalSets = Object.values(s.made).reduce((a, b) => a + b, 0);

  return (
    <main className="factory" data-running={running}>
      <header className="factory-header">
        <div>
          <span className="factory-eyebrow">BONE & BAMBOO · TOY No. 01</span>
          <h1>
            The tile works<span aria-hidden="true"> ⚙</span>
          </h1>
        </div>
        <div className="factory-tools">
          <button
            onClick={() => {
              setRunning(false);
              setHelp(true);
            }}
            aria-label="How to play"
          >
            ?
          </button>
          <button
            aria-label={volume ? 'Mute sound' : 'Enable sound'}
            onClick={() => updateSettings({ sfx: volume ? 0 : 0.65, music: 0, ambience: 0 })}
          >
            {volume ? '♪' : '♫'}
          </button>
        </div>
      </header>
      <div className="factory-meters">
        <div>
          <span>SCORE</span>
          <strong data-testid="factory-score">{String(s.score).padStart(5, '0')}</strong>
        </div>
        <div>
          <span>BRASS TO SPEND</span>
          <strong data-testid="factory-brass">
            {s.brass}
            <small> ◉</small>
          </strong>
        </div>
        <div>
          <span>SETS SHIPPED</span>
          <strong>{totalSets}</strong>
        </div>
      </div>
      <section className="factory-order" aria-label="Current order">
        <span>{s.orderDone ? '✓ ORDER SHIPPED' : 'ORDER 01'}</span>
        <b>Make two runs</b>
        <span>{Math.min(s.made.run, 2)}/2 · +60 score, +30 brass</span>
      </section>
      <div className="factory-status" role="status">
        {error || s.message}
      </div>
      {s.finished ? (
        <section className="factory-finished">
          <span className="factory-eyebrow">TOOLS DOWN. NICE WORK.</span>
          <h2>A little factory, {s.score} points.</h2>
          <p>
            {totalSets} sets shipped · {s.recycled.length} tiles recycled ·{' '}
            {s.tray.length + Object.values(s.machines).flat().length} tiles left on the bench.
          </p>
          <p>Did fitting the gate make you want to build a better route?</p>
          <button onClick={restart}>Open another crate →</button>
        </section>
      ) : (
        <>
          <section className="factory-belt-section" aria-label="Conveyor">
            <div className="factory-section-label">
              <b>01 / INCOMING</b>
              <span>{remaining} tiles left · bamboo & dots 1–6</span>
            </div>
            <div className="factory-belt">
              <span className="factory-roller" aria-hidden="true">
                ✣
              </span>
              <div className="factory-feed" key={s.cursor}>
                {s.supply.slice(s.cursor, s.cursor + 5).map((t, i) => (
                  <div className={`factory-belt-slot ${i === 0 ? 'is-front' : ''}`} key={t.id}>
                    {i === 0 ? (
                      <button
                        className="factory-tile-button"
                        aria-label={`Front tile: ${kindName(t.kind)}`}
                        aria-pressed={chosen?.id === t.id}
                        onClick={() => {
                          setSelected(null);
                          setRunning(false);
                        }}
                      >
                        {tile(t)}
                      </button>
                    ) : (
                      tile(t)
                    )}
                    <small>{i === 0 ? 'PICK UP' : `NEXT ${i}`}</small>
                  </div>
                ))}
                {!head && <p>Crate empty. Use your held tiles, then finish the shift.</p>}
              </div>
              <span className="factory-roller" aria-hidden="true">
                ✣
              </span>
            </div>
            <div className="factory-source">
              <span>
                {chosen ? (
                  <>
                    Routing <b>{kindName(chosen.kind)}</b>
                    {chosen.id !== head?.id ? ' from tray' : ''}
                  </>
                ) : (
                  'No tile selected'
                )}
              </span>
              <div>
                <button
                  disabled={!head || chosen?.id !== head.id || s.tray.length >= FACTORY.traySize}
                  onClick={() => head && act({ type: 'hold', source: head.id })}
                >
                  Hold ↓
                </button>
                <button
                  disabled={!chosen}
                  onClick={() => chosen && act({ type: 'recycle', source: chosen.id })}
                >
                  Recycle +1 ◉
                </button>
              </div>
            </div>
          </section>
          <section className="factory-machines" aria-label="Machines">
            {MACHINES.map((m, i) => {
              const held = s.machines[m.id];
              const fits = !!chosen && accepts(m.id, held, chosen);
              const active = s.gate.bought && s.gate.enabled && s.gate.target === m.id;
              return (
                <article
                  className={`factory-machine machine-${m.id}`}
                  key={m.id}
                  data-ready={fits}
                  data-gate={active}
                >
                  <div className="factory-machine-heading">
                    <span aria-hidden="true" className="factory-gear">
                      ⚙
                    </span>
                    <span>0{i + 1}</span>
                    <b>+{m.score}</b>
                  </div>
                  <h2>{m.name}</h2>
                  <p>
                    {held.length
                      ? m.id !== 'run'
                        ? `Needs ${kindName(held[0]!.kind)}`
                        : held.length === 2
                          ? `Needs ${Array.from({ length: 6 }, (_, r) => ({
                              id: -1,
                              kind: `${held[0]!.kind[0]}${r + 1}`,
                            }))
                              .filter((t) => accepts('run', held, t))
                              .map((t) => kindName(t.kind))
                              .join(' or ')}`
                          : m.rule
                      : m.rule}
                  </p>
                  <div className="factory-sockets">
                    {Array.from({ length: m.capacity }, (_, j) =>
                      held[j] ? (
                        <button
                          key={j}
                          className="factory-tile-button"
                          aria-label={`Return ${kindName(held[j]!.kind)} from ${m.short} to tray`}
                          disabled={s.tray.length >= FACTORY.traySize}
                          onClick={() => act({ type: 'recover', machine: m.id, tile: held[j]!.id })}
                        >
                          {tile(held[j]!)}
                        </button>
                      ) : (
                        <span key={j} className="factory-empty-socket">
                          {j + 1}
                        </span>
                      ),
                    )}
                  </div>
                  <button
                    className="factory-feed-button"
                    disabled={!fits}
                    onClick={() =>
                      chosen && act({ type: 'route', source: chosen.id, machine: m.id })
                    }
                  >
                    {fits ? `Feed ${m.short} ↓` : 'Doesn’t fit'}
                  </button>
                  <span className="factory-machine-foot">
                    {active ? '● GATE CONNECTED' : `${s.made[m.id]} SETS SHIPPED`}
                  </span>
                </article>
              );
            })}
          </section>
          <div className="factory-lower">
            <section className="factory-tray" aria-label="Holding tray">
              <div className="factory-section-label">
                <b>02 / HOLDING TRAY</b>
                <span>{s.tray.length}/3</span>
              </div>
              <div className="factory-tray-slots">
                {Array.from({ length: FACTORY.traySize }, (_, i) =>
                  s.tray[i] ? (
                    <button
                      className="factory-tile-button"
                      key={i}
                      aria-label={`Held tile: ${kindName(s.tray[i]!.kind)}`}
                      aria-pressed={chosen?.id === s.tray[i]!.id}
                      onClick={() => {
                        setSelected(s.tray[i]!.id);
                        setRunning(false);
                      }}
                    >
                      {tile(s.tray[i]!)}
                    </button>
                  ) : (
                    <span key={i} className="factory-empty-socket">
                      +
                    </span>
                  ),
                )}
                <p>
                  Tap a held tile to use it.
                  <br />
                  Tap a loaded tile to take it back.
                </p>
              </div>
            </section>
            <section className="factory-gate" aria-label="Sorting gate">
              <div className="factory-section-label">
                <b>03 / BRASS SORTING GATE</b>
                <span aria-hidden="true">⚙</span>
              </div>
              {!s.gate.bought ? (
                <div className="factory-buy">
                  <p>
                    Your first bit of automation.
                    <br />
                    Send matching tiles to one machine.
                  </p>
                  <button
                    disabled={s.brass < FACTORY.gateCost}
                    onClick={() => act({ type: 'buy' })}
                  >
                    Fit gate · {FACTORY.gateCost} ◉
                  </button>
                </div>
              ) : (
                <>
                  <div className="factory-gate-settings">
                    <label>
                      Send
                      <select
                        aria-label="Gate suit"
                        value={s.gate.suit}
                        onChange={(e) => configure(s.gate.target, e.target.value as GateSuit)}
                      >
                        <option value="both">Both suits</option>
                        <option value="s">Bamboo</option>
                        <option value="p">Dots</option>
                      </select>
                    </label>
                    <span>→</span>
                    <label>
                      Into
                      <select
                        aria-label="Gate destination"
                        value={s.gate.target}
                        onChange={(e) => configure(e.target.value as MachineId, s.gate.suit)}
                      >
                        {MACHINES.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="factory-auto">
                    <button
                      aria-pressed={s.gate.enabled}
                      onClick={() => configure(s.gate.target, s.gate.suit, !s.gate.enabled)}
                    >
                      {s.gate.enabled ? 'Gate on' : 'Gate off'}
                    </button>
                    <button disabled={!routeable || running} onClick={() => act({ type: 'step' })}>
                      Step ▷
                    </button>
                    <button
                      className="factory-auto-button"
                      disabled={!routeable && !running}
                      onClick={() => {
                        setSelected(null);
                        setRunning(!running);
                      }}
                    >
                      {running ? 'Pause Ⅱ' : 'Auto ▶'}
                    </button>
                  </div>
                  <small>
                    {running
                      ? 'Belt turning…'
                      : routeable
                        ? 'Ready. Watch your gate do the sorting.'
                        : !head
                          ? 'Crate empty.'
                          : 'Stopped: this tile needs your hand.'}
                  </small>
                </>
              )}
            </section>
          </div>
          {s.last && (
            <section
              className="factory-output"
              aria-label="Last shipped set"
              key={s.last.tiles[0]!.id}
            >
              <span className="factory-stamp">SHIPPED ✓</span>
              <div>
                {s.last.tiles.map((t) => (
                  <span key={t.id}>{tile(t)}</span>
                ))}
              </div>
              <b>+{s.last.score}</b>
            </section>
          )}
          {!remaining && (
            <button className="factory-finish" onClick={() => act({ type: 'finish' })}>
              Finish shift · keep {s.score} points →
            </button>
          )}
        </>
      )}
      <footer className="factory-footer">
        <span>TABLETOP PROTOTYPE · NO RUSH, NO FAIL STATE</span>
        <button
          onClick={() => {
            setRunning(false);
            setReset(true);
          }}
        >
          New crate
        </button>
      </footer>
      <dialog
        ref={dialog}
        className="factory-dialog"
        onCancel={() => {
          setHelp(false);
          setReset(false);
        }}
        onClick={(e) => {
          if (e.target === dialog.current) {
            setHelp(false);
            setReset(false);
          }
        }}
      >
        {reset ? (
          <>
            <h2>Open a fresh crate?</h2>
            <p>
              This clears your score, machines and gate. Your current shift is saved until you
              replace it.
            </p>
            <button onClick={restart}>Start fresh</button>
            <button onClick={() => setReset(false)}>Keep playing</button>
          </>
        ) : (
          <>
            <span className="factory-eyebrow">A LITTLE WOODEN TILE FACTORY</span>
            <h2>Pick. Place. Clack.</h2>
            <p>
              The front tile is selected. Feed it into a machine to build a pair, triple or run.
              Finished sets ship automatically and earn score and brass.
            </p>
            <ol>
              <li>Start with the two bamboo 2s in the Pair press.</li>
              <li>Send bamboo 3, 4 and 5 into the Run loom.</li>
              <li>Fit the 40-brass gate. Choose which suit goes where.</li>
              <li>Press Auto. It pauses whenever a tile doesn’t fit.</li>
            </ol>
            <p>
              Hold awkward tiles in the tray. Tap a tile inside a machine to take it back. Recycle
              anything you don’t want for 1 brass.
            </p>
            <p>
              This starter crate has bamboo and dots 1–6, supplied in friendly batches. No clock, no
              losing. Your shift saves automatically.
            </p>
            <button onClick={() => setHelp(false)}>Back to the bench</button>
          </>
        )}
      </dialog>
    </main>
  );
}
