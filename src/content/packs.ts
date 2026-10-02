export type PackId = 'fourth' | 'dragons' | 'winds' | 'honour' | 'almanac';

export interface Pack {
  readonly id: PackId;
  readonly name: string;
  readonly price: number;
  readonly text: string;
}

export const PACKS: Record<PackId, Pack> = {
  fourth: {
    id: 'fourth',
    name: 'Fourth copy',
    price: 4,
    text: 'Add a 4th copy of a tile you own 3 of',
  },
  dragons: { id: 'dragons', name: 'Dragons', price: 4, text: 'Add the three dragons, or 2 of one' },
  winds: { id: 'winds', name: 'Winds', price: 4, text: 'Add the four winds, or 2 of one' },
  honour: { id: 'honour', name: 'Honour triple', price: 5, text: 'Add 3 copies of an honour' },
  almanac: { id: 'almanac', name: 'Almanac', price: 4, text: 'Take one of 3 almanac pages' },
};

export const PACK_IDS: readonly PackId[] = ['fourth', 'dragons', 'winds', 'honour', 'almanac'];
/** How many offers a pack shows (fourth copy, honour triple, almanac). */
export const PACK_CHOICES = 3;
