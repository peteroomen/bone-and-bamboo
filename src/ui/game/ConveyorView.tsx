import { useEffect, useRef, useState } from 'react';
import { CONVEYOR, DIRECTIONS, type Direction, type Recipe } from '@/content/conveyor';
import {
  conveyorReduce,
  entry,
  finished,
  newConveyor,
  turn,
  type ConveyorAction,
  type ConveyorState,
  type Track,
} from '@/engine/conveyor';
import { kindName, type Tile } from '@/engine/tiles';
import { TileView } from '@/ui/art/Tile';
import { sfx } from '@/ui/audio/audio';
import { useTheme, useStore, updateSettings } from '@/ui/state/store';
import '@/ui/styles/conveyor.css';

const KEY = 'bb.conveyor.v1';
const ARROWS: Record<Direction, string> = { E: '→', S: '↓', W: '←', N: '↑' };
const POINTS: Record<Direction, [number, number]> = {
  E: [100, 50],
  S: [50, 100],
  W: [0, 50],
  N: [50, 0],
};
type Tool = 'inspect' | 'straight' | 'left' | 'right' | 'gate' | 'erase';
const TOOLS: { id: Tool; icon: string; name: string }[] = [
  { id: 'inspect', icon: '↻', name: 'Select' },
  { id: 'straight', icon: '━', name: 'Straight' },
  { id: 'left', icon: '┛', name: 'Left bend' },
  { id: 'right', icon: '┓', name: 'Right bend' },
  { id: 'gate', icon: '⑂', name: 'Splitter' },
  { id: 'erase', icon: '×', name: 'Erase' },
];
interface Session {
  seed: number;
  actions: ConveyorAction[];
  state: ConveyorState;
}
function fresh(): Session {
  return { seed: 42, actions: [], state: newConveyor(42) };
}
function load(): Session {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
    if (
      data &&
      Number.isInteger(data.seed) &&
      Array.isArray(data.actions) &&
      data.actions.length < 15000
    ) {
      let state = newConveyor(data.seed);
      for (const a of data.actions) {
        const r = conveyorReduce(state, a);
        if (r.error) return fresh();
        state = r.state;
      }
      return { seed: data.seed, actions: data.actions, state };
    }
  } catch {
    /* The board works without storage. */
  }
  return fresh();
}
function BeltArt({ track }: { track: Track }) {
  const start = POINTS[entry(track)],
    end = POINTS[track.dir];
  const path = track.kind === 'corner' ? `M${start} Q50,50 ${end}` : `M${start} L${end}`;
  const branch = POINTS[turn(track.dir)];
  return (
    <>
      <path d={path} className="cv-rail" />
      <path d={path} className="cv-rubber" />
      <path d={path} className="cv-treads" />
      {track.kind === 'gate' && (
        <>
          <path d={`M50,50 L${branch}`} className="cv-rail" />
          <path d={`M50,50 L${branch}`} className="cv-rubber" />
          <path d={`M50,50 L${branch}`} className="cv-treads" />
          <rect x="33" y="33" width="34" height="34" rx="7" className="cv-brass" />
          <text x="50" y="56" textAnchor="middle" className="cv-gate-mark">
            {track.suit === 's' ? '竹' : '●'}
          </text>
        </>
      )}
      <path
        d="M73 42 L84 50 L73 58"
        className="cv-arrow"
        transform={`rotate(${DIRECTIONS.indexOf(track.dir) * 90} 50 50)`}
      />
      {track.kind === 'gate' && (
        <path
          d="M73 42 L84 50 L73 58"
          className="cv-branch-arrow"
          transform={`rotate(${DIRECTIONS.indexOf(turn(track.dir)) * 90} 50 50)`}
        />
      )}
    </>
  );
}

export function ConveyorView() {
  const theme = useTheme(),
    volume = useStore((s) => s.settings.sfx);
  const [session, setSession] = useState<Session>(load);
  const [playing, setPlaying] = useState(false),
    [tool, setTool] = useState<Tool>('inspect');
  const [direction, setDirection] = useState<Direction>('E');
  const [selected, setSelected] = useState<number | null>(null),
    [error, setError] = useState('');
  const [help, setHelp] = useState(false),
    [confirm, setConfirm] = useState<'clear' | 'starter' | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const s = session.state,
    done = finished(s),
    track = selected === null ? undefined : s.tracks[selected];
  const prev = useRef({ tick: s.tick, score: s.score });
  useEffect(() => {
    if (s.score > prev.current.score) sfx.coin();
    else if (s.tick > prev.current.tick) sfx.tock();
    prev.current = { tick: s.tick, score: s.score };
  }, [s.tick, s.score]);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ seed: session.seed, actions: session.actions }));
    } catch {
      /* Optional save. */
    }
  }, [session]);
  useEffect(() => {
    if (help || confirm) modal.current?.showModal();
    else modal.current?.close();
  }, [help, confirm]);
  useEffect(() => {
    if (!playing || done) return;
    const timer = window.setInterval(
      () =>
        setSession((previous) => {
          if (finished(previous.state)) return previous;
          const a: ConveyorAction = { type: 'tick' };
          return {
            ...previous,
            actions: [...previous.actions, a],
            state: conveyorReduce(previous.state, a).state,
          };
        }),
      CONVEYOR.beatMs,
    );
    const hide = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [playing, done]);
  const running = playing && !done;
  function act(a: ConveyorAction) {
    setPlaying(false);
    const result = conveyorReduce(s, a);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError('');
    setSession({ ...session, actions: [...session.actions, a], state: result.state });
  }
  function tap(cell: number) {
    setSelected(cell);
    setPlaying(false);
    setError('');
    if (cell === CONVEYOR.feeder || s.bays.some((b) => b.cell === cell)) return;
    if (tool === 'inspect') return;
    if (tool === 'erase') {
      act({ type: 'erase', cell });
      return;
    }
    const next: Track =
      tool === 'gate'
        ? { kind: 'gate', dir: direction, suit: 'p', rank: 0 }
        : tool === 'straight'
          ? { kind: 'straight', dir: direction }
          : { kind: 'corner', dir: direction, bend: tool === 'left' ? 'left' : 'right' };
    act({ type: 'place', cell, track: next });
  }
  function configure(change: Partial<Track>) {
    if (selected !== null && track)
      act({ type: 'place', cell: selected, track: { ...track, ...change } });
  }
  const overlay: {
    tile: Tile;
    cell: number;
    slot: number | null;
    count: number;
    group: boolean;
  }[] = [
    ...s.moving.map((t) => ({ tile: t.tile, cell: t.cell, slot: null, count: 1, group: false })),
    ...s.bays.flatMap((b) =>
      (b.tiles.length ? b.tiles : s.tick - b.flash < 2 ? b.last : []).map((tile, slot, all) => ({
        tile,
        cell: b.cell,
        slot,
        count: all.length,
        group: true,
      })),
    ),
  ];
  const selectedBay = s.bays.findIndex((b) => b.cell === selected);
  return (
    <main className="conveyor-toy" data-running={running}>
      <header className="cv-header">
        <div>
          <span className="cv-eyebrow">BONE & BAMBOO / EXPERIMENT 02</span>
          <h1>The little tile works</h1>
          <p>Build a route. Let the tiles do the travelling.</p>
        </div>
        <div className="cv-header-tools">
          <button
            aria-label="How conveyors work"
            onClick={() => {
              setPlaying(false);
              setHelp(true);
            }}
          >
            ?
          </button>
          <button
            aria-label={volume ? 'Mute sound' : 'Enable sound'}
            onClick={() => updateSettings({ sfx: volume ? 0 : 0.6, music: 0, ambience: 0 })}
          >
            {volume ? '♪' : '♫'}
          </button>
        </div>
      </header>
      <div className="cv-control-bar">
        <div className="cv-counter">
          <span>SCORE</span>
          <strong data-testid="conveyor-score">{String(s.score).padStart(4, '0')}</strong>
        </div>
        <div className="cv-transport">
          <button
            className="cv-play"
            onClick={() => {
              setError('');
              setPlaying(!running);
            }}
            disabled={done}
          >
            {running ? 'Pause Ⅱ' : 'Play ▶'}
          </button>
          <button disabled={done} onClick={() => act({ type: 'tick' })}>
            Step ▷
          </button>
          <button onClick={() => act({ type: 'rewind' })}>Rewind ↶</button>
        </div>
        <span className="cv-beat">
          BEAT {s.tick}
          <br />
          {s.supply.length - s.cursor} IN CRATE
        </span>
      </div>
      <div className="cv-status" role="status">
        {error || s.message}
      </div>
      <div className="cv-workbench">
        <div className="cv-main-column">
          <section className="cv-board-frame" aria-label="Conveyor board">
            <div className="cv-board-label">
              <span>01 / THE TABLETOP</span>
              <span>
                {running
                  ? '● BELTS TURNING'
                  : done
                    ? '✓ CRATE COMPLETE'
                    : 'Ⅱ PAUSED · TAP A SQUARE TO BUILD'}
              </span>
            </div>
            <div className="cv-board">
              <svg className="cv-paths" viewBox="0 0 700 600" aria-hidden="true">
                <defs>
                  <pattern id="cv-grid" width="100" height="100" patternUnits="userSpaceOnUse">
                    <path
                      d="M100 0 H0 V100"
                      fill="none"
                      stroke="#9f875c"
                      strokeOpacity=".3"
                      strokeWidth="1"
                    />
                    <circle cx="50" cy="50" r="2" fill="#bba987" />
                  </pattern>
                </defs>
                <rect width="700" height="600" fill="url(#cv-grid)" />
                {Object.entries(s.tracks).map(([cell, t]) => (
                  <g
                    key={cell}
                    transform={`translate(${(Number(cell) % 7) * 100},${Math.floor(Number(cell) / 7) * 100})`}
                  >
                    <BeltArt track={t} />
                  </g>
                ))}
                <g transform="translate(0,200)">
                  <rect
                    x="4"
                    y="12"
                    width="92"
                    height="76"
                    rx="10"
                    fill="#7e6041"
                    stroke="#58462d"
                    strokeWidth="3"
                  />
                  <path d="M40 50 H100" className="cv-rubber" />
                  <text x="12" y="30" className="cv-port-label">
                    FEED
                  </text>
                  <path d="M76 44 L84 50 L76 56" className="cv-arrow" />
                </g>
                {s.bays.map((b, i) => (
                  <g key={b.cell} transform={`translate(600,${Math.floor(b.cell / 7) * 100})`}>
                    <rect
                      x="3"
                      y="5"
                      width="92"
                      height="90"
                      rx="10"
                      fill={i === 0 ? '#406557' : '#566581'}
                      stroke="#e1d3b0"
                      strokeWidth="3"
                    />
                    <path d="M0 50 H20" stroke="#e1d3b0" strokeWidth="9" />
                    <text x="48" y="24" textAnchor="middle" className="cv-port-label">
                      BAY {i + 1}
                    </text>
                    <text x="49" y="84" textAnchor="middle" className="cv-port-label">
                      {b.recipe.toUpperCase()}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="cv-grid">
                {Array.from({ length: 42 }, (_, cell) => {
                  const t = s.tracks[cell];
                  const occupied = s.moving.find((m) => m.cell === cell);
                  const name =
                    cell === 14
                      ? 'Feeder'
                      : s.bays.some((b) => b.cell === cell)
                        ? `Bay ${s.bays.findIndex((b) => b.cell === cell) + 1}`
                        : t
                          ? `${t.kind} ${t.dir}`
                          : 'empty';
                  return (
                    <button
                      key={cell}
                      aria-label={`Row ${Math.floor(cell / 7) + 1}, column ${(cell % 7) + 1}: ${name}`}
                      aria-pressed={selected === cell}
                      className={`${selected === cell ? 'cv-selected' : ''} ${s.blocked.includes(cell) ? 'cv-blocked' : ''}`}
                      data-cell={cell}
                      onClick={() => tap(cell)}
                      title={occupied ? kindName(occupied.tile.kind) : name}
                    />
                  );
                })}
              </div>
              <div className="cv-tile-layer" aria-hidden="true">
                {overlay.map((item) => {
                  const x =
                      (((item.cell % 7) + 0.5) / 7) * 100 +
                      (item.group ? ((item.slot ?? 0) - (item.count - 1) / 2) * 2.1 : 0),
                    y = ((Math.floor(item.cell / 7) + 0.52) / 6) * 100;
                  return (
                    <div
                      className={`cv-moving-tile ${item.group ? 'cv-group-tile' : ''}`}
                      key={item.tile.id}
                      data-tile-id={item.tile.id}
                      data-tile-cell={item.cell}
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      <TileView tile={item.tile} theme={theme} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="cv-board-legend">
              <span>Grey arrows: straight through</span>
              <span>Gold arrow: matches the filter</span>
            </div>
          </section>
          <section className="cv-toolbox" aria-label="Belt pieces">
            <div className="cv-section-title">
              02 / YOUR WOODEN PIECES <span>Choose a piece, then tap the board.</span>
            </div>
            <div className="cv-pieces">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  aria-pressed={tool === t.id}
                  onClick={() => {
                    setTool(t.id);
                    setPlaying(false);
                    setError('');
                  }}
                >
                  <span aria-hidden="true">
                    {t.id === 'inspect' || t.id === 'erase' ? (
                      t.icon
                    ) : (
                      <svg viewBox="0 0 100 100" width="30" height="30">
                        <BeltArt
                          track={
                            t.id === 'gate'
                              ? { kind: 'gate', dir: direction, suit: 'p', rank: 0 }
                              : t.id === 'straight'
                                ? { kind: 'straight', dir: direction }
                                : {
                                    kind: 'corner',
                                    dir: direction,
                                    bend: t.id === 'left' ? 'left' : 'right',
                                  }
                          }
                        />
                      </svg>
                    )}
                  </span>
                  {t.name}
                </button>
              ))}
            </div>
            <div className="cv-direction">
              <span>Output direction</span>
              {DIRECTIONS.map((d) => (
                <button
                  key={d}
                  aria-label={`Build pointing ${d}`}
                  aria-pressed={direction === d}
                  onClick={() => {
                    setDirection(d);
                    setPlaying(false);
                  }}
                >
                  {ARROWS[d]}
                </button>
              ))}
              <span className="cv-direction-help">
                {tool === 'left' || tool === 'right'
                  ? `${tool === 'left' ? 'Left' : 'Right'} turn in the direction of travel.`
                  : 'New pieces point this way.'}
              </span>
            </div>
          </section>
          <section className="cv-inspector" aria-label="Selected piece">
            <div className="cv-section-title">03 / TINKER</div>
            {track ? (
              <>
                <div className="cv-selected-title">
                  <b>
                    {track.kind === 'gate'
                      ? 'Sorting junction'
                      : track.kind === 'corner'
                        ? `${track.bend === 'left' ? 'Left' : 'Right'} bend`
                        : 'Straight belt'}{' '}
                    · {ARROWS[track.dir]}
                  </b>
                  <button
                    onClick={() => selected !== null && act({ type: 'rotate', cell: selected })}
                  >
                    Rotate ↻
                  </button>
                  <button
                    onClick={() => selected !== null && act({ type: 'erase', cell: selected })}
                  >
                    Remove
                  </button>
                </div>
                {track.kind === 'gate' ? (
                  <div className="cv-filter">
                    <label>
                      Divert
                      <select
                        aria-label="Splitter suit"
                        value={track.suit}
                        onChange={(e) => configure({ suit: e.target.value as 's' | 'p' })}
                      >
                        <option value="p">Dots</option>
                        <option value="s">Bamboo</option>
                      </select>
                    </label>
                    <label>
                      Number
                      <select
                        aria-label="Splitter number"
                        value={track.rank ?? 0}
                        onChange={(e) => configure({ rank: Number(e.target.value) })}
                      >
                        <option value="0">Any number</option>
                        {Array.from({ length: 6 }, (_, i) => (
                          <option key={i} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>
                      Matches turn <b>{ARROWS[turn(track.dir)]}</b>
                      <br />
                      Other tiles continue <b>{ARROWS[track.dir]}</b>
                    </p>
                  </div>
                ) : (
                  <p>
                    Tiles enter from {ARROWS[entry(track)]} and leave towards {ARROWS[track.dir]}.
                    Rotate to connect the next piece.
                  </p>
                )}
              </>
            ) : selectedBay >= 0 ? (
              <p>
                Bay {selectedBay + 1} collects tiles entering from its left. Change its recipe below
                when empty.
              </p>
            ) : selected === 14 ? (
              <p>The feeder releases one tile every two beats. It waits if the line is full.</p>
            ) : (
              <p>
                Choose <b>Select</b>, then tap a belt to rotate it or inspect the splitter. To move
                the splitter, erase it and place it elsewhere.
              </p>
            )}
          </section>
        </div>
        <aside className="cv-side-column">
          <section className="cv-crate">
            <div className="cv-section-title">THE NEXT TILES</div>
            <div className="cv-upcoming">
              {s.supply.slice(s.cursor, s.cursor + 5).map((t) => (
                <TileView key={t.id} tile={t} theme={theme} />
              ))}
              {s.cursor === s.supply.length && <span>Crate empty</span>}
            </div>
            <p>
              Starter supply: bamboo pairs + dots runs.
              <br />
              40 tiles. No rush, no losing.
            </p>
          </section>
          {s.bays.map((bay, i) => (
            <section
              className={`cv-bay cv-bay-${i}`}
              key={bay.cell}
              aria-label={`Collection bay ${i + 1}`}
            >
              <div className="cv-section-title">
                BAY {i + 1}
                <span>{bay.sets} shipped</span>
              </div>
              <label className="cv-recipe">
                Make
                <select
                  aria-label={`Bay ${i + 1} recipe`}
                  value={bay.recipe}
                  disabled={bay.tiles.length > 0}
                  onChange={(e) =>
                    act({ type: 'recipe', bay: i, recipe: e.target.value as Recipe })
                  }
                >
                  <option value="pair">Pairs · +20</option>
                  <option value="triple">Triples · +45</option>
                  <option value="run">Runs · +60</option>
                </select>
              </label>
              <div className="cv-bay-group">
                {Array.from({ length: bay.recipe === 'pair' ? 2 : 3 }, (_, j) =>
                  bay.tiles[j] ? (
                    <TileView key={bay.tiles[j]!.id} tile={bay.tiles[j]!} theme={theme} />
                  ) : (
                    <span className="cv-socket" key={j}>
                      {j + 1}
                    </span>
                  ),
                )}
              </div>
              <p>
                {bay.recipe === 'run'
                  ? 'Three consecutive numbers, same suit.'
                  : bay.recipe === 'pair'
                    ? 'Two identical tiles.'
                    : 'Three identical tiles.'}
              </p>
              {bay.last.length > 0 && (
                <div className="cv-shipment" key={bay.flash}>
                  <span>STAMPED ✓</span>
                  <div>
                    {bay.last.map((t) => (
                      <TileView key={t.id} tile={t} theme={theme} />
                    ))}
                  </div>
                  <b>+{CONVEYOR.scores[bay.recipe]}</b>
                </div>
              )}
            </section>
          ))}
          <section className="cv-notes">
            <b>A queue is a clue.</b>
            <p>
              If tiles stop, follow the arrows. Belt ends must meet belt entrances, and the bay
              needs a matching tile.
            </p>
            <p>
              <b>Rewind</b> resets tiles and score but keeps your layout. Editing pauses the belts.
            </p>
          </section>
          <div className="cv-reset">
            <button
              onClick={() => {
                setPlaying(false);
                setConfirm('clear');
              }}
            >
              Clear belts
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setConfirm('starter');
              }}
            >
              Starter layout
            </button>
          </div>
        </aside>
      </div>
      <footer className="cv-footer">
        A SMALL MECHANICAL TOY · LAYOUT & PROGRESS SAVE AUTOMATICALLY
      </footer>
      <dialog
        className="cv-dialog"
        ref={modal}
        onCancel={() => {
          setHelp(false);
          setConfirm(null);
        }}
      >
        {confirm ? (
          <>
            <h2>{confirm === 'clear' ? 'An empty workbench?' : 'Restore the starter route?'}</h2>
            <p>
              This resets the tiles and score, and{' '}
              {confirm === 'clear'
                ? 'removes every belt. The feeder and two bays stay put.'
                : 'replaces your current layout.'}
            </p>
            <button
              onClick={() => {
                act({ type: confirm });
                setConfirm(null);
                setSelected(null);
              }}
            >
              Yes, {confirm === 'clear' ? 'clear belts' : 'restore layout'}
            </button>
            <button onClick={() => setConfirm(null)}>Keep building</button>
          </>
        ) : (
          <>
            <span className="cv-eyebrow">A TOY TRAIN SET, WITH MAHJONG TILES</span>
            <h2>Let the belts do the work.</h2>
            <p>
              Press <b>Play</b> to watch the starter route. Bamboo goes straight through the
              splitter to the pair bay. Dots turn down to the run bay.
            </p>
            <ol>
              <li>Pause. Choose a straight or bend from the toolbox.</li>
              <li>Choose its output direction and tap an empty square.</li>
              <li>Use Select to inspect, rotate or remove a piece.</li>
              <li>Join the ends together. Tiles only enter at the belt’s entrance.</li>
              <li>Press Step to test one beat. Rewind resets tiles but keeps your route.</li>
            </ol>
            <p>
              The gold branch of the splitter takes tiles matching its filter. The grey branch takes
              everything else. Bays only accept matching tiles from their left.
            </p>
            <p>
              Want to build from scratch? Clear belts. There is one splitter and as many ordinary
              belts as you like.
            </p>
            <button onClick={() => setHelp(false)}>Back to the tabletop</button>
          </>
        )}
      </dialog>
    </main>
  );
}
