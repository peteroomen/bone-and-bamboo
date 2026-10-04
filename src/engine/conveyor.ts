import { CONVEYOR, DIRECTIONS, type Direction, type Recipe } from '@/content/conveyor';
import { Rng, hashSeed } from '@/engine/rng';
import { accepts } from '@/engine/factory';
import type { Tile } from '@/engine/tiles';

export type Track = {
  kind: 'straight' | 'corner' | 'gate';
  dir: Direction;
  bend?: 'left' | 'right';
  suit?: 's' | 'p';
  rank?: number;
};
export interface MovingTile {
  tile: Tile;
  cell: number;
  from: number;
}
export interface Bay {
  cell: number;
  recipe: Recipe;
  tiles: Tile[];
  sets: number;
  last: Tile[];
  flash: number;
}
export interface ConveyorState {
  version: 1;
  seed: number;
  tracks: Record<number, Track>;
  supply: Tile[];
  cursor: number;
  moving: MovingTile[];
  bays: Bay[];
  shipped: Tile[];
  score: number;
  tick: number;
  blocked: number[];
  message: string;
}
export type ConveyorAction =
  | { type: 'tick' }
  | { type: 'place'; cell: number; track: Track }
  | { type: 'erase'; cell: number }
  | { type: 'rotate'; cell: number }
  | { type: 'recipe'; bay: number; recipe: Recipe }
  | { type: 'rewind' }
  | { type: 'clear' }
  | { type: 'starter' };

export function turn(dir: Direction, n = 1): Direction {
  return DIRECTIONS[(DIRECTIONS.indexOf(dir) + n + 4) % 4]!;
}
export function neighbour(cell: number, dir: Direction): number | null {
  const x = cell % CONVEYOR.cols,
    y = Math.floor(cell / CONVEYOR.cols);
  const nx = x + (dir === 'E' ? 1 : dir === 'W' ? -1 : 0),
    ny = y + (dir === 'S' ? 1 : dir === 'N' ? -1 : 0);
  return nx < 0 || nx >= CONVEYOR.cols || ny < 0 || ny >= CONVEYOR.rows
    ? null
    : ny * CONVEYOR.cols + nx;
}
export function entry(track: Track): Direction {
  return turn(track.dir, track.kind === 'corner' ? (track.bend === 'left' ? 3 : 1) : 2);
}
export function exitFor(track: Track, tile: Tile): Direction {
  return track.kind === 'gate' &&
    tile.kind[0] === track.suit &&
    (!track.rank || Number(tile.kind.slice(1)) === track.rank)
    ? turn(track.dir)
    : track.dir;
}
export function starterTracks(): Record<number, Track> {
  return {
    15: { kind: 'straight', dir: 'E' },
    16: { kind: 'gate', dir: 'E', suit: 'p', rank: 0 },
    17: { kind: 'straight', dir: 'E' },
    18: { kind: 'corner', dir: 'N', bend: 'left' },
    11: { kind: 'corner', dir: 'E' },
    12: { kind: 'straight', dir: 'E' },
    23: { kind: 'straight', dir: 'S' },
    30: { kind: 'corner', dir: 'E', bend: 'left' },
    31: { kind: 'straight', dir: 'E' },
    32: { kind: 'straight', dir: 'E' },
    33: { kind: 'straight', dir: 'E' },
  };
}
export function newConveyor(seed = 42): ConveyorState {
  const rng = new Rng(hashSeed(seed));
  const kinds: string[] = [];
  for (let i = 0; i < CONVEYOR.packets; i++) {
    const bamboo = i === 0 ? 2 : 1 + rng.int(6),
      start = i === 0 ? 1 : 1 + rng.int(4);
    kinds.push(`s${bamboo}`, `p${start}`, `s${bamboo}`, `p${start + 1}`, `p${start + 2}`);
  }
  return {
    version: 1,
    seed,
    tracks: starterTracks(),
    supply: kinds.map((kind, id) => ({ kind, id })),
    cursor: 0,
    moving: [],
    bays: [
      { cell: 13, recipe: 'pair', tiles: [], sets: 0, last: [], flash: 0 },
      { cell: 34, recipe: 'run', tiles: [], sets: 0, last: [], flash: 0 },
    ],
    shipped: [],
    score: 0,
    tick: 0,
    blocked: [],
    message: 'Press Play. Watch bamboo become pairs and dots become runs.',
  };
}
export function finished(s: ConveyorState): boolean {
  return s.cursor === s.supply.length && s.moving.length === 0;
}
export function conveyorReduce(
  state: ConveyorState,
  a: ConveyorAction,
): { state: ConveyorState; error?: string } {
  const fail = (error: string) => ({ state, error });
  if (a.type === 'starter') return { state: newConveyor(state.seed) };
  if (a.type === 'rewind' || a.type === 'clear') {
    const s = newConveyor(state.seed);
    s.tracks = a.type === 'clear' ? {} : { ...state.tracks };
    s.bays = s.bays.map((b, i) => ({ ...b, recipe: state.bays[i]!.recipe }));
    s.message =
      a.type === 'clear'
        ? 'Lay a route from the feeder to a bay. Each arrow points along the belt.'
        : 'Crate rewound. Your layout is ready to try again.';
    return { state: s };
  }
  const s: ConveyorState = {
    ...state,
    tracks: { ...state.tracks },
    moving: state.moving.map((t) => ({ ...t })),
    bays: state.bays.map((b) => ({ ...b, tiles: [...b.tiles], last: [...b.last] })),
    shipped: [...state.shipped],
    blocked: [],
  };
  if (a.type === 'recipe') {
    const bay = s.bays[a.bay];
    if (!bay || !['pair', 'triple', 'run'].includes(a.recipe))
      return fail('Choose a valid bay recipe.');
    if (bay.tiles.length) return fail('Rewind the crate before changing a partly filled bay.');
    bay.recipe = a.recipe;
    s.message = 'Bay recipe changed. Make sure the arriving tiles will fit.';
  } else if (a.type !== 'tick') {
    if (
      !Number.isInteger(a.cell) ||
      a.cell < 0 ||
      a.cell >= CONVEYOR.cols * CONVEYOR.rows ||
      a.cell === CONVEYOR.feeder ||
      s.bays.some((b) => b.cell === a.cell)
    )
      return fail('The feeder and collection bays stay in place.');
    if (s.moving.some((t) => t.cell === a.cell))
      return fail('A tile is on this piece. Move it first, or rewind the crate.');
    if (a.type === 'erase') delete s.tracks[a.cell];
    else if (a.type === 'rotate') {
      if (!s.tracks[a.cell]) return fail('Choose a belt to rotate.');
      s.tracks[a.cell] = { ...s.tracks[a.cell]!, dir: turn(s.tracks[a.cell]!.dir) };
    } else {
      if (
        !['straight', 'corner', 'gate'].includes(a.track.kind) ||
        !DIRECTIONS.includes(a.track.dir)
      )
        return fail('Choose a valid belt piece.');
      if (
        a.track.kind === 'gate' &&
        (!['s', 'p'].includes(a.track.suit ?? '') ||
          !Number.isInteger(a.track.rank) ||
          a.track.rank! < 0 ||
          a.track.rank! > 6)
      )
        return fail('Choose a valid gate filter.');
      if (
        a.track.kind === 'gate' &&
        Object.entries(s.tracks).some(([cell, t]) => t.kind === 'gate' && Number(cell) !== a.cell)
      )
        return fail('One sorting gate in this prototype. Erase the old gate to move it.');
      s.tracks[a.cell] = { ...a.track };
    }
    s.message = 'Route changed. Press Step to test one beat, or Play to watch.';
  } else {
    if (finished(s)) return fail('Crate complete. Rewind to try a new layout.');
    s.tick++;
    // Propose one-cell moves from the old board. All conflicts are resolved before moving anything.
    const occupants = new Map(s.moving.map((t) => [t.cell, t.tile.id]));
    const byId = new Map(s.moving.map((t) => [t.tile.id, t]));
    const destinations = new Map<number, number>();
    const claimed = new Set<number>();
    for (const moving of [...s.moving].sort((a, b) => a.tile.id - b.tile.id)) {
      const track = s.tracks[moving.cell];
      const dir =
        moving.cell === CONVEYOR.feeder ? 'E' : track ? exitFor(track, moving.tile) : null;
      const dest = dir ? neighbour(moving.cell, dir) : null;
      if (dest === null || dest === CONVEYOR.feeder) continue;
      const bay = s.bays.find((b) => b.cell === dest);
      const next = s.tracks[dest];
      // Belts accept only at their physical entrance. Bays accept a tile only from their left port.
      const allowed = bay
        ? dir === 'E' && accepts(bay.recipe, bay.tiles, moving.tile)
        : !!next && entry(next) === turn(dir!, 2);
      if (!allowed || claimed.has(dest)) continue;
      destinations.set(moving.tile.id, dest);
      claimed.add(dest);
    }
    // A full circular conveyor can move in unison; a queue behind a blockage cannot.
    const movable = new Map<number, boolean>();
    function canMove(id: number, path: Set<number>): boolean {
      if (movable.has(id)) return movable.get(id)!;
      if (!destinations.has(id)) {
        movable.set(id, false);
        return false;
      }
      if (path.has(id)) return true;
      const next = new Set(path);
      next.add(id);
      const occupant = occupants.get(destinations.get(id)!);
      const result = occupant === undefined || canMove(occupant, next);
      movable.set(id, result);
      return result;
    }
    for (const id of byId.keys()) canMove(id, new Set());
    const moving: MovingTile[] = [];
    let shipped = false;
    for (const t of s.moving) {
      const dest = destinations.get(t.tile.id);
      if (dest === undefined || !movable.get(t.tile.id)) {
        moving.push({ ...t, from: t.cell });
        s.blocked.push(t.cell);
        continue;
      }
      const bay = s.bays.find((b) => b.cell === dest);
      if (bay) {
        bay.tiles.push(t.tile);
        if (bay.tiles.length === (bay.recipe === 'pair' ? 2 : 3)) {
          s.score += CONVEYOR.scores[bay.recipe];
          bay.sets++;
          bay.flash = s.tick;
          bay.last = [...bay.tiles];
          s.shipped.push(...bay.tiles);
          bay.tiles = [];
          shipped = true;
        }
      } else moving.push({ tile: t.tile, cell: dest, from: t.cell });
    }
    s.moving = moving;
    if (
      s.cursor < s.supply.length &&
      s.tick % CONVEYOR.feedEvery === 1 &&
      !s.moving.some((t) => t.cell === CONVEYOR.feeder)
    ) {
      s.moving.push({ tile: s.supply[s.cursor]!, cell: CONVEYOR.feeder, from: CONVEYOR.feeder });
      s.cursor++;
    }
    s.message = finished(s)
      ? `Crate complete: ${s.score} points. Rewind to try another route.`
      : s.blocked.length
        ? `${s.blocked.length} tile${s.blocked.length === 1 ? ' is' : 's are'} waiting. Check belt entrances, arrows and bay matches.`
        : shipped
          ? 'Set complete. Stamped, scored and shipped!'
          : 'The belts are turning. Pause whenever you want to tinker.';
  }
  return { state: s };
}
