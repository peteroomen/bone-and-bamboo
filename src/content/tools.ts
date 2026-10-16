import type { EnhancementId } from './enhancements';

/**
 * Tools edit your dice between rounds: pick a die, pick a face, apply. Single use; the pocket
 * holds two. *tune*
 */
export type ToolOp =
  | { readonly type: 'chisel' }
  | { readonly type: 'brush' }
  | { readonly type: 'nudge' }
  | { readonly type: 'rubbing' }
  | { readonly type: 'lead' }
  | { readonly type: 'enhance'; readonly enh: EnhancementId }
  | { readonly type: 'blossom' };

export interface ToolDef {
  readonly id: string;
  readonly name: string;
  readonly text: string;
  readonly price: number;
  readonly op: ToolOp;
}

export const TOOL_POCKET = 2;
/** A face can carry at most this much lead: it lands this many times as often. */
export const MAX_WEIGHT = 3;

const list: ToolDef[] = [
  {
    id: 'chisel',
    name: 'Chisel',
    text: 'Carve a face into any tile you choose.',
    price: 4,
    op: { type: 'chisel' },
  },
  {
    id: 'brush',
    name: 'Brush',
    text: 'Change a face’s suit.',
    price: 3,
    op: { type: 'brush' },
  },
  {
    id: 'nudge',
    name: 'Nudge',
    text: 'Move a face’s number up or down by one.',
    price: 3,
    op: { type: 'nudge' },
  },
  {
    id: 'rubbing',
    name: 'Rubbing',
    text: 'Copy one face onto another, on any of your dice.',
    price: 3,
    op: { type: 'rubbing' },
  },
  {
    id: 'lead',
    name: 'Lead Weight',
    text: 'A face lands twice as often (up to three times).',
    price: 4,
    op: { type: 'lead' },
  },
  {
    id: 'jadeLeaf',
    name: 'Jade Leaf',
    text: 'A face turns jade: +4 mult when its tile scores.',
    price: 3,
    op: { type: 'enhance', enh: 'jade' },
  },
  {
    id: 'boneInlay',
    name: 'Bone Inlay',
    text: 'A face gets a bone inlay: +30 chips when its tile scores.',
    price: 3,
    op: { type: 'enhance', enh: 'bone' },
  },
  {
    id: 'goldLeaf',
    name: 'Gold Leaf',
    text: 'A face is gilded: +$1 when its tile scores.',
    price: 3,
    op: { type: 'enhance', enh: 'gold' },
  },
  {
    id: 'glaze',
    name: 'Glaze',
    text: 'A face turns porcelain: ×1.5 mult, but 1 in 4 cracks after scoring.',
    price: 4,
    op: { type: 'enhance', enh: 'porcelain' },
  },
  {
    id: 'blossom',
    name: 'Blossom',
    text: 'A face becomes a random flower or season.',
    price: 3,
    op: { type: 'blossom' },
  },
];

export const TOOLS: Record<string, ToolDef> = Object.fromEntries(list.map((t) => [t.id, t]));
export const TOOL_IDS: readonly string[] = list.map((t) => t.id);
