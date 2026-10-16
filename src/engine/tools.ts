import { MAX_WEIGHT, TOOLS } from '@/content/tools';
import { BONUS_KINDS, SUITED, type SuitedSuit, type TileKind } from '@/content/tiles';
import { type Die, type Face, weightOf, withFace } from './dice';
import type { Rng } from './rng';
import { isBonus, isSuited, rankOf, suitOf } from './tiles';

/** What a tool needs beyond the die and face it is used on. */
export type ToolArg =
  | { readonly kind: TileKind }
  | { readonly suit: SuitedSuit }
  | { readonly step: 1 | -1 }
  | { readonly fromDieId: number; readonly fromFace: number };

/** Why the tool can't be used like this, or null. */
export function toolProblem(
  toolId: string,
  dice: readonly Die[],
  dieId: number,
  face: number,
  arg?: ToolArg,
): string | null {
  const t = TOOLS[toolId];
  if (!t) return 'No such tool.';
  const die = dice.find((d) => d.id === dieId);
  const f = die?.faces[face];
  if (!die || !f) return 'Pick a face on one of your dice.';
  switch (t.op.type) {
    case 'chisel': {
      if (!arg || !('kind' in arg)) return 'Choose a tile to carve.';
      if (isBonus(arg.kind)) return 'Use Blossom for flowers and seasons.';
      return null;
    }
    case 'brush':
      if (!f.kind || !isSuited(f.kind)) return 'Brush works on Dots, Bamboo or Characters faces.';
      if (!arg || !('suit' in arg) || !SUITED.includes(arg.suit)) return 'Choose a suit.';
      if (suitOf(f.kind) === arg.suit) return 'It is that suit already.';
      return null;
    case 'nudge': {
      if (!f.kind || !isSuited(f.kind)) return 'Nudge works on Dots, Bamboo or Characters faces.';
      if (!arg || !('step' in arg)) return 'Up or down?';
      const r = rankOf(f.kind) + arg.step;
      return r < 1 || r > 9 ? 'That would go off the end.' : null;
    }
    case 'rubbing': {
      if (!arg || !('fromDieId' in arg)) return 'Choose a face to copy.';
      const src = dice.find((d) => d.id === arg.fromDieId)?.faces[arg.fromFace];
      if (!src) return 'Choose a face to copy.';
      if (arg.fromDieId === dieId && arg.fromFace === face) return 'Copy a different face.';
      return null;
    }
    case 'lead':
      return weightOf(f) >= MAX_WEIGHT ? 'That face carries all the lead it can.' : null;
    case 'enhance':
      if (!f.kind) return 'A blank face can’t take that.';
      if (f.kind && isBonus(f.kind)) return 'Flowers and seasons don’t take that.';
      return f.enh === t.op.enh ? 'It has that already.' : null;
    case 'blossom':
      return null;
  }
}

/** The die after the tool is used on it. */
export function applyTool(
  toolId: string,
  dice: readonly Die[],
  dieId: number,
  face: number,
  rng: Rng,
  arg?: ToolArg,
): Die[] {
  const t = TOOLS[toolId];
  const die = dice.find((d) => d.id === dieId) as Die;
  const f = die.faces[face] as Face;
  let next: Face = f;
  switch (t?.op.type) {
    case 'chisel':
      next = { ...f, kind: (arg as { kind: TileKind }).kind };
      break;
    case 'brush':
      next = { ...f, kind: `${(arg as { suit: SuitedSuit }).suit}${rankOf(f.kind as string)}` };
      break;
    case 'nudge':
      next = {
        ...f,
        kind: `${suitOf(f.kind as string)}${rankOf(f.kind as string) + (arg as { step: number }).step}`,
      };
      break;
    case 'rubbing': {
      const a = arg as { fromDieId: number; fromFace: number };
      const src = dice.find((d) => d.id === a.fromDieId)?.faces[a.fromFace] as Face;
      // the copy takes the tile and its enhancement; the face keeps its own lead
      next = {
        kind: src.kind,
        ...(src.enh ? { enh: src.enh } : {}),
        ...(f.weight ? { weight: f.weight } : {}),
      };
      break;
    }
    case 'lead':
      next = { ...f, weight: weightOf(f) + 1 };
      break;
    case 'enhance':
      next = { ...f, enh: t.op.enh };
      break;
    case 'blossom': {
      const { enh: _e, ...rest } = f;
      next = { ...rest, kind: rng.pick(BONUS_KINDS) };
      break;
    }
    default:
      break;
  }
  return dice.map((d) => (d.id === dieId ? withFace(d, face, next) : d));
}
