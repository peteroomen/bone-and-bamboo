/** The sets you take from the dice. A hand is four sets and a pair (or seven pairs). */
export type SetKind = 'pair' | 'chow' | 'pong' | 'kong';

export interface SetDef {
  readonly id: SetKind;
  readonly name: string;
  readonly text: string;
  readonly chips: number;
  readonly mult: number;
}

export const SETS: Record<SetKind, SetDef> = {
  pair: { id: 'pair', name: 'Pair', text: 'Two alike.', chips: 5, mult: 1 },
  chow: { id: 'chow', name: 'Chow', text: 'Three in a row, one suit.', chips: 10, mult: 1 },
  pong: { id: 'pong', name: 'Pong', text: 'Three alike.', chips: 25, mult: 2 },
  kong: {
    id: 'kong',
    name: 'Kong',
    text: 'Four alike. Gives a free roll.',
    chips: 50,
    mult: 4,
  },
};

export const SET_KINDS: readonly SetKind[] = ['pair', 'chow', 'pong', 'kong'];
