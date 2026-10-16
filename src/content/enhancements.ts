export type EnhancementId = 'jade' | 'bone' | 'gold' | 'porcelain';

export interface Enhancement {
  readonly id: EnhancementId;
  readonly name: string;
  readonly text: string;
  /** Added to a completed hand that holds a tile from this face. */
  readonly chips: number;
  readonly mult: number;
  readonly xmult: number;
  /** Money when a completed hand holds a tile from this face. */
  readonly money: number;
  /** Chance (0-1) that the face cracks (goes blank) after its hand scores. */
  readonly crack: number;
}

/** Enhancements sit on die faces; the tile a face makes carries it into the hand. */
export const ENHANCEMENTS: Record<EnhancementId, Enhancement> = {
  jade: {
    id: 'jade',
    name: 'Jade',
    text: '+4 mult',
    chips: 0,
    mult: 4,
    xmult: 1,
    money: 0,
    crack: 0,
  },
  bone: {
    id: 'bone',
    name: 'Bone',
    text: '+30 chips',
    chips: 30,
    mult: 0,
    xmult: 1,
    money: 0,
    crack: 0,
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    text: '+$1 when its hand scores',
    chips: 0,
    mult: 0,
    xmult: 1,
    money: 1,
    crack: 0,
  },
  porcelain: {
    id: 'porcelain',
    name: 'Porcelain',
    text: '×1.5 mult; 1 in 4 cracks after its hand',
    chips: 0,
    mult: 0,
    xmult: 1.5,
    money: 0,
    crack: 0.25,
  },
};
