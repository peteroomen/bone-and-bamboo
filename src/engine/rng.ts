/**
 * Seeded, serialisable PRNG (mulberry32). The whole generator state is one
 * uint32, so it lives inside game state and survives JSON round-trips, which
 * keeps saves, replays and simulations deterministic.
 */

export type RngState = number;

/** Hash an arbitrary string or number into a uint32 seed (FNV-1a + avalanche). */
export function hashSeed(input: string | number): RngState {
  const text = typeof input === 'number' ? `n:${input}` : `s:${input}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Derive a child seed from a parent seed and a label, e.g. (runSeed, 'm3h2'). */
export function deriveSeed(parent: RngState, label: string | number): RngState {
  return hashSeed(`${parent}:${label}`);
}

/** A mutable wrapper used inside reducers on already-cloned state. */
export class Rng {
  constructor(public state: RngState) {}

  /** Uniform float in [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick on empty list');
    return items[this.int(items.length)] as T;
  }

  /** Returns a new shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  }

  /** Weighted pick; weights must be non-negative and not all zero. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    let total = 0;
    for (const it of items) total += Math.max(0, weight(it));
    if (total <= 0) return this.pick(items);
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weight(it));
      if (r < 0) return it;
    }
    return items[items.length - 1] as T;
  }
}
