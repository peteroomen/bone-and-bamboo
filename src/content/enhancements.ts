export type EnhancementId = 'jade' | 'bone' | 'gold' | 'porcelain';

export interface Enhancement {
  readonly id: EnhancementId;
  readonly name: string;
  readonly text: string;
  /** Added to the score when the tile is on the table at scoring. */
  readonly chips: number;
  readonly mult: number;
  readonly xmult: number;
  /** Money at the end of the round if the tile was played. */
  readonly money: number;
  /** Chance (0-1) that the tile is destroyed after scoring. */
  readonly crack: number;
}

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
    text: '+$2 if played',
    chips: 0,
    mult: 0,
    xmult: 1,
    money: 2,
    crack: 0,
  },
  porcelain: {
    id: 'porcelain',
    name: 'Porcelain',
    text: '×2 mult; 1 in 4 cracks after scoring',
    chips: 0,
    mult: 0,
    xmult: 2,
    money: 0,
    crack: 0.25,
  },
};
