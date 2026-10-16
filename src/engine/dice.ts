import { DIE_TEMPLATES, type FixedDie } from '@/content/dice';
import type { EnhancementId } from '@/content/enhancements';
import { SHAPES, type ShapeId } from '@/content/shapes';
import { FLOWERS, HONOURS, SEASONS, SUITED, type SuitedSuit, type TileKind } from '@/content/tiles';
import type { Rng } from './rng';

/** One face of a die. A blank face (kind null) shows nothing and makes no tile. */
export interface Face {
  readonly kind: TileKind | null;
  readonly enh?: EnhancementId;
  /** Lead: the face lands this many times as often (1 when missing). */
  readonly weight?: number;
}

/** One die you own. Its id stays for the whole run. */
export interface Die {
  readonly id: number;
  readonly name: string;
  readonly shape: ShapeId;
  readonly faces: readonly Face[];
}

export function weightOf(f: Face): number {
  return f.weight ?? 1;
}

const NEIGHBOURS = new Map<ShapeId, number[][]>();

function dot(a: readonly number[], b: readonly number[]): number {
  return (a[0] ?? 0) * (b[0] ?? 0) + (a[1] ?? 0) * (b[1] ?? 0) + (a[2] ?? 0) * (b[2] ?? 0);
}

/** The faces next to face i (the ones a die can tip onto), from the shape's normals. */
export function neighbours(shape: ShapeId, i: number): number[] {
  let table = NEIGHBOURS.get(shape);
  if (!table) {
    const ns = SHAPES[shape].normals;
    table = ns.map((n, a) => {
      const dots = ns.map((m, b) => (b === a ? -Infinity : dot(n, m)));
      const best = Math.max(...dots);
      return dots.flatMap((d, b) => (d > best - 1e-6 ? [b] : []));
    });
    NEIGHBOURS.set(shape, table);
  }
  return table[i] ?? [];
}

/** The face on the other side. */
export function opposite(shape: ShapeId, i: number): number {
  const ns = SHAPES[shape].normals;
  const n = ns[i];
  if (!n) return i;
  let best = i;
  let bestDot = Infinity;
  ns.forEach((m, b) => {
    const d = dot(n, m);
    if (d < bestDot) {
      bestDot = d;
      best = b;
    }
  });
  return best;
}

/** Roll a die: a face index, weighted by lead. `allow` limits the faces (the Red String). */
export function rollFace(die: Die, rng: Rng, allow?: (f: Face, i: number) => boolean): number {
  const idx = die.faces.map((_, i) => i).filter((i) => !allow || allow(die.faces[i] as Face, i));
  const pool = idx.length > 0 ? idx : die.faces.map((_, i) => i);
  return rng.weighted(pool, (i) => weightOf(die.faces[i] as Face));
}

/** The chance of each face, as fractions that add to 1. */
export function faceOdds(die: Die): number[] {
  const total = die.faces.reduce((s, f) => s + weightOf(f), 0);
  return die.faces.map((f) => weightOf(f) / total);
}

export function fixedDie(id: number, def: FixedDie): Die {
  return { id, name: def.name, shape: def.shape, faces: def.faces.map((kind) => ({ kind })) };
}

/** Make a die from a template, choosing its suits, base rank and random faces. */
export function makeDie(id: number, templateId: string, rng: Rng): Die {
  const t = DIE_TEMPLATES[templateId];
  if (!t) throw new Error(`unknown die template ${templateId}`);
  const suits = rng.shuffle(SUITED);
  const S = suits[0] as SuitedSuit;
  const T = suits[1] as SuitedSuit;
  const offsets = t.faces.filter((f) => /^[ST]\+\d$/.test(f)).map((f) => Number(f.slice(2)));
  const maxOff = offsets.length > 0 ? Math.max(...offsets) : 0;
  const base = 1 + rng.int(9 - maxOff);
  const faces: Face[] = t.faces.map((tok) => {
    if (/^[ST]\+\d$/.test(tok)) {
      const suit = tok[0] === 'S' ? S : T;
      return { kind: `${suit}${base + Number(tok.slice(2))}` };
    }
    if (tok === 'H') return { kind: rng.pick(HONOURS) };
    if (tok === 'F') return { kind: rng.pick(FLOWERS) };
    if (tok === 'Q') return { kind: rng.pick(SEASONS) };
    return { kind: tok };
  });
  const suitName = { p: 'Dots', s: 'Bamboo', m: 'Characters' }[S];
  const name = t.faces.some((f) => f.startsWith('S')) ? `${t.name} (${suitName})` : t.name;
  return { id, name, shape: t.shape, faces };
}

/** A copy of the die with face i replaced. */
export function withFace(die: Die, i: number, face: Face): Die {
  return { ...die, faces: die.faces.map((f, j) => (j === i ? face : f)) };
}
