import type { EnhancementId } from './enhancements';

export type FortuneId = 'rubbing' | 'fire' | 'brush' | 'jade' | 'bone' | 'gold';

export interface Fortune {
  readonly id: FortuneId;
  readonly name: string;
  readonly text: string;
  /** How many tiles it acts on, at most (at least 1). */
  readonly maxTiles: number;
  /** For the enhancing fortunes. */
  readonly enhancement?: EnhancementId;
  /** It also needs a suit chosen. */
  readonly needsSuit?: boolean;
}

export const FORTUNES: Record<FortuneId, Fortune> = {
  rubbing: {
    id: 'rubbing',
    name: 'Rubbing',
    text: 'Copy 1 tile in your set',
    maxTiles: 1,
  },
  fire: { id: 'fire', name: 'Fire', text: 'Destroy up to 6 tiles from your set', maxTiles: 6 },
  brush: {
    id: 'brush',
    name: 'Brush',
    text: 'Change up to 3 tiles to one suit',
    maxTiles: 3,
    needsSuit: true,
  },
  jade: {
    id: 'jade',
    name: 'Jade',
    text: 'Give 2 tiles the Jade enhancement',
    maxTiles: 2,
    enhancement: 'jade',
  },
  bone: {
    id: 'bone',
    name: 'Bone',
    text: 'Give 2 tiles the Bone enhancement',
    maxTiles: 2,
    enhancement: 'bone',
  },
  gold: {
    id: 'gold',
    name: 'Gold Leaf',
    text: 'Give 1 tile the Gold enhancement',
    maxTiles: 1,
    enhancement: 'gold',
  },
};

export const FORTUNE_IDS: readonly FortuneId[] = [
  'rubbing',
  'fire',
  'brush',
  'jade',
  'bone',
  'gold',
];
export const FORTUNE_PRICE = 3;
export const FORTUNE_SLOTS = 2;
