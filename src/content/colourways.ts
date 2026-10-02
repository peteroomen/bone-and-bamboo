export type ColourwayId = 'theatre' | 'porcelain' | 'papercut';

export type ColourwayUnlock =
  { readonly kind: 'start' } | { readonly kind: 'win' } | { readonly kind: 'storms' };

export interface Colourway {
  readonly id: ColourwayId;
  readonly name: string;
  readonly text: string;
  readonly unlock: ColourwayUnlock;
  /** How the player is told to earn it. */
  readonly condition: string;
}

/** The whole look is a colourway: tiles, table, interface accents and (later) generated art. */
export const COLOURWAYS: readonly Colourway[] = [
  {
    id: 'theatre',
    name: 'Shadow theatre',
    text: 'Bone faces, jade backs, ink and vermilion.',
    unlock: { kind: 'start' },
    condition: 'From the start',
  },
  {
    id: 'porcelain',
    name: 'Porcelain',
    text: 'White glaze and cobalt.',
    unlock: { kind: 'win' },
    condition: 'Win a run',
  },
  {
    id: 'papercut',
    name: 'Papercut',
    text: 'Cream paper and red.',
    unlock: { kind: 'storms' },
    condition: 'Calm all four great storms: choose and beat each wind’s storm, across runs',
  },
];
