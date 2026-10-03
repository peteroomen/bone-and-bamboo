import { FACTORY, MACHINES, type GateSuit, type MachineId } from '@/content/factory';
import { Rng, hashSeed } from '@/engine/rng';
import { kindName, rankOf, suitOf, type Tile } from '@/engine/tiles';

export interface FactoryState {
  seed: number;
  supply: Tile[];
  cursor: number;
  tray: Tile[];
  machines: Record<MachineId, Tile[]>;
  shipped: Tile[];
  recycled: Tile[];
  score: number;
  brass: number;
  made: Record<MachineId, number>;
  gate: { bought: boolean; enabled: boolean; suit: GateSuit; target: MachineId };
  orderDone: boolean;
  finished: boolean;
  message: string;
  last: { machine: MachineId; tiles: Tile[]; score: number } | null;
}
export type FactoryAction =
  | { type: 'route'; source: number; machine: MachineId }
  | { type: 'hold'; source: number }
  | { type: 'recycle'; source: number }
  | { type: 'recover'; machine: MachineId; tile: number }
  | { type: 'buy' }
  | { type: 'gate'; target: MachineId; suit: GateSuit; enabled: boolean }
  | { type: 'step' }
  | { type: 'finish' };

export function newFactory(seed = 24): FactoryState {
  const rng = new Rng(hashSeed(seed));
  const kinds = ['s2', 's2', 's3', 's4', 's5', 'p4', 'p4', 'p4'];
  for (let batch = 0; batch < FACTORY.batches; batch++) {
    const tiles: string[] = [];
    for (let set = 0; set < FACTORY.setsPerBatch; set++) {
      const suit = rng.pick(['s', 'p']);
      const start = 1 + rng.int(4);
      tiles.push(
        ...(set % 2 === 0 ? [start, start + 1, start + 2] : [start, start, start]).map(
          (r) => `${suit}${r}`,
        ),
      );
    }
    kinds.push(...rng.shuffle(tiles));
  }
  return {
    seed,
    supply: kinds.map((kind, id) => ({ kind, id })),
    cursor: 0,
    tray: [],
    machines: { pair: [], triple: [], run: [] },
    shipped: [],
    recycled: [],
    score: 0,
    brass: 0,
    made: { pair: 0, triple: 0, run: 0 },
    gate: { bought: false, enabled: true, suit: 'both', target: 'pair' },
    orderDone: false,
    finished: false,
    message: 'Send the first two bamboo 2s to the Pair press.',
    last: null,
  };
}

export function accepts(machine: MachineId, held: readonly Tile[], tile: Tile): boolean {
  const def = MACHINES.find((m) => m.id === machine);
  if (!def || held.length >= def.capacity || held.some((t) => t.id === tile.id)) return false;
  if (machine === 'run' && !['s', 'p', 'm'].includes(suitOf(tile.kind))) return false;
  if (!held.length) return true;
  if (machine !== 'run') return held.every((t) => t.kind === tile.kind);
  const all = [...held, tile];
  if (
    !['s', 'p', 'm'].includes(suitOf(tile.kind)) ||
    !all.every((t) => suitOf(t.kind) === suitOf(tile.kind))
  )
    return false;
  const ranks = all.map((t) => rankOf(t.kind));
  return new Set(ranks).size === ranks.length && Math.max(...ranks) - Math.min(...ranks) <= 2;
}

export function canAuto(s: FactoryState): boolean {
  const tile = s.supply[s.cursor];
  return (
    !s.finished &&
    !!tile &&
    s.gate.bought &&
    s.gate.enabled &&
    (s.gate.suit === 'both' || suitOf(tile.kind) === s.gate.suit) &&
    accepts(s.gate.target, s.machines[s.gate.target], tile)
  );
}

export function factoryReduce(
  state: FactoryState,
  a: FactoryAction,
): { state: FactoryState; error?: string } {
  const fail = (error: string) => ({ state, error });
  if (state.finished) return fail('This shift is finished. Open another crate.');
  const s: FactoryState = {
    ...state,
    tray: [...state.tray],
    machines: {
      pair: [...state.machines.pair],
      triple: [...state.machines.triple],
      run: [...state.machines.run],
    },
    shipped: [...state.shipped],
    recycled: [...state.recycled],
    made: { ...state.made },
    gate: { ...state.gate },
  };
  if (a.type === 'step') {
    if (!canAuto(s))
      return fail('The gate cannot route this tile. Choose a machine, hold it or recycle it.');
    return factoryReduce(state, {
      type: 'route',
      source: s.supply[s.cursor]!.id,
      machine: s.gate.target,
    });
  }
  if (a.type === 'buy') {
    if (s.gate.bought || s.brass < FACTORY.gateCost)
      return fail('The sorting gate costs 40 brass.');
    s.brass -= FACTORY.gateCost;
    s.gate.bought = true;
    s.message = 'Gate fitted. Choose a suit and destination, then try Auto.';
  } else if (a.type === 'gate') {
    if (
      !s.gate.bought ||
      !MACHINES.some((m) => m.id === a.target) ||
      !['s', 'p', 'both'].includes(a.suit)
    )
      return fail('Fit a sorting gate first.');
    s.gate = { bought: true, target: a.target, suit: a.suit, enabled: a.enabled };
    s.message = a.enabled
      ? 'Gate set. Only tiles that fit will pass; the rest wait for you.'
      : 'Gate disengaged. Route tiles by hand.';
  } else if (a.type === 'finish') {
    if (s.cursor < s.supply.length) return fail('There are still tiles in the crate.');
    s.finished = true;
    s.message = 'Shift complete. Your factory is ready for another crate.';
  } else if (a.type === 'recover') {
    if (!MACHINES.some((m) => m.id === a.machine)) return fail('Unknown machine.');
    const tile = s.machines[a.machine].find((t) => t.id === a.tile);
    if (!tile || s.tray.length >= FACTORY.traySize)
      return fail('Make room in the holding tray first.');
    s.machines[a.machine] = s.machines[a.machine].filter((t) => t.id !== a.tile);
    s.tray.push(tile);
    s.message = `${kindName(tile.kind)} returned to the holding tray.`;
  } else {
    const head = s.supply[s.cursor];
    const tile = head?.id === a.source ? head : s.tray.find((t) => t.id === a.source);
    if (!tile) return fail('Choose the front tile or a tile in the holding tray.');
    if (a.type === 'hold' && (head?.id !== tile.id || s.tray.length >= FACTORY.traySize))
      return fail('The holding tray is full, or this tile is already held.');
    if (a.type === 'route' && !accepts(a.machine, s.machines[a.machine] ?? [], tile))
      return fail('That tile does not fit. Try another machine or hold it.');
    if (head?.id === tile.id) s.cursor++;
    else s.tray = s.tray.filter((t) => t.id !== tile.id);
    if (a.type === 'hold') {
      s.tray.push(tile);
      s.message = 'Tile held. Tap it whenever you want to feed it into a machine.';
    } else if (a.type === 'recycle') {
      s.recycled.push(tile);
      s.brass += FACTORY.recycleBrass;
      s.message = 'Recycled for 1 brass. No score, but a little more breathing room.';
    } else {
      const def = MACHINES.find((m) => m.id === a.machine)!;
      s.machines[a.machine].push(tile);
      if (s.machines[a.machine].length === def.capacity) {
        const tiles = s.machines[a.machine];
        s.shipped.push(...tiles);
        s.machines[a.machine] = [];
        s.score += def.score;
        s.brass += def.score;
        s.made[a.machine]++;
        s.last = { machine: a.machine, tiles, score: def.score };
        s.message = `${def.name} shipped a set! +${def.score} score and brass.`;
        if (!s.orderDone && s.made.run >= FACTORY.orderRuns) {
          s.orderDone = true;
          s.score += FACTORY.orderScore;
          s.brass += FACTORY.orderBrass;
          s.message += ' Two-run order complete: +60 score, +30 brass.';
        }
      } else
        s.message = `${kindName(tile.kind)} loaded. ${def.capacity - s.machines[a.machine].length} more to finish this set.`;
    }
  }
  return { state: s };
}

/** Public belt/tray only; a modest throughput baseline, not a difficulty optimiser. */
export function factoryAdvice(s: FactoryState): FactoryAction {
  if (!s.gate.bought && s.brass >= FACTORY.gateCost) return { type: 'buy' };
  const tiles = [...s.tray, ...s.supply.slice(s.cursor, s.cursor + 1)];
  for (const tile of tiles)
    for (const m of [...MACHINES].reverse()) {
      if (s.machines[m.id].length && accepts(m.id, s.machines[m.id], tile))
        return { type: 'route', source: tile.id, machine: m.id };
    }
  const head = s.supply[s.cursor];
  if (head) {
    for (const m of MACHINES)
      if (!s.machines[m.id].length) return { type: 'route', source: head.id, machine: m.id };
    if (s.tray.length < FACTORY.traySize) return { type: 'hold', source: head.id };
    return { type: 'recycle', source: head.id };
  }
  return { type: 'finish' };
}
