import { DRAGONS, type TableCondition } from '@/content/dragons';
import { type PlayedSet, conditionHolds, effectValue, identicalPairs } from './scoring';
import { isOutside, isSuited, rankOf, suitOf } from './tiles';

/** A dragon whose payoff depends on the table, with how close you are to it. */
export interface Goal {
  readonly id: string;
  readonly name: string;
  /** Multiplying now. */
  readonly active: boolean;
  /** Nothing on the table yet: shown as "not yet", never as success. */
  readonly notYet: boolean;
  /** One short line: "1/2 pongs or kongs", "3 suits (needs 2 or fewer)", "broken". */
  readonly progress: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function runsInBestSuit(table: readonly PlayedSet[]): { n: number; suit: string } {
  let best = { n: 0, suit: '' };
  for (const suit of ['p', 's', 'm']) {
    const starts = new Set<number>();
    for (const s of table) {
      if (s.kind !== 'chow') continue;
      const lo = Math.min(...s.tiles.map((t) => rankOf(t.kind)));
      const first = s.tiles.find((t) => rankOf(t.kind) === lo);
      if (first && suitOf(first.kind) === suit && [1, 4, 7].includes(lo)) starts.add(lo);
    }
    if (starts.size > best.n) best = { n: starts.size, suit };
  }
  return best;
}

function conditionProgress(c: TableCondition, table: readonly PlayedSet[]): string {
  switch (c.kind) {
    case 'bigSets': {
      const n = table.filter((s) => s.kind === 'pong' || s.kind === 'kong').length;
      return `${Math.min(n, c.min)}/${c.min} pongs or kongs`;
    }
    case 'setsAndPair': {
      const n = table.filter((s) => s.kind !== 'pair' && s.kind !== 'single').length;
      const pair = table.some((s) => s.kind === 'pair');
      return `${Math.min(n, c.sets)}/${c.sets} sets, pair ${pair ? 'yes' : 'not yet'}`;
    }
    case 'maxSuits': {
      const suits = new Set<string>();
      for (const s of table)
        for (const t of s.tiles) if (isSuited(t.kind)) suits.add(suitOf(t.kind));
      return `${plural(suits.size, 'suit')} (needs ${c.n} or fewer)`;
    }
    case 'noOutside':
      return table.some((s) => s.tiles.some((t) => isOutside(t.kind)))
        ? 'broken by a 1, 9 or wind'
        : 'no 1s, 9s or winds yet';
    case 'pureStraight': {
      const r = runsInBestSuit(table);
      return `${r.n}/3 runs in one suit`;
    }
  }
}

/** Live progress for the dragons that depend on the table. */
export function dragonGoals(table: readonly PlayedSet[], dragons: readonly string[]): Goal[] {
  const out: Goal[] = [];
  for (const id of dragons) {
    const d = DRAGONS[id];
    if (!d) continue;
    for (const e of d.effects) {
      let progress: string | null = null;
      let active = false;
      if (e.type === 'xIf') {
        progress = conditionProgress(e.when, table);
        active = conditionHolds(e.when, table);
      } else if (e.type === 'xPerSet') {
        const n = table.filter((s) => e.sets.includes(s.kind)).length;
        progress = `${plural(n, e.sets[0] as string)}: ×${+(e.x ** n).toFixed(2)}`;
        active = n > 0;
      } else if (e.type === 'xPerIdenticalPair') {
        const n = identicalPairs(table);
        progress = `${plural(n, 'identical pair')}: ×${+(e.x ** n).toFixed(2)}`;
        active = n > 0;
      }
      if (progress === null) continue;
      if (table.length === 0) active = false;
      out.push({ id, name: d.name, active, notYet: table.length === 0, progress });
    }
  }
  return out;
}

/** The ×mult dragons that a change to the table switches off or weakens. */
export function brokenDragons(
  before: readonly PlayedSet[],
  after: readonly PlayedSet[],
  dragons: readonly string[],
): string[] {
  const out: string[] = [];
  for (const id of dragons) {
    const d = DRAGONS[id];
    if (!d) continue;
    const x = (t: readonly PlayedSet[]) => d.effects.reduce((n, e) => n * effectValue(e, t).x, 1);
    if (x(after) < x(before))
      out.push(`${d.name}: ×${+x(before).toFixed(2)} → ×${+x(after).toFixed(2)}`);
  }
  return out;
}
