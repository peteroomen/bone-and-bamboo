/** The guided first run: a fixed seed (its first deal has a run, a pair and a pong close at hand). */
export const GUIDED_SEED = 11;

export type TipId =
  'host' | 'hand' | 'full' | 'pair' | 'run' | 'pong' | 'preview' | 'discard' | 'kong' | 'score';

export interface Tip {
  readonly id: TipId;
  readonly mood: 'point' | 'think' | 'happy' | 'wow';
  readonly text: string;
}

/** The guide's tips, in the order they are offered when more than one is due. */
export const TIPS: readonly Tip[] = [
  {
    id: 'host',
    mood: 'point',
    text: 'Each round is hosted by a wind. Your first round is a plain one, so pick Calm and we will begin.',
  },
  {
    id: 'hand',
    mood: 'point',
    text: 'This is your hand. Each time you play or discard, it refills from the pile.',
  },
  {
    id: 'full',
    mood: 'think',
    text: 'Look for tiles that go together: two alike, three alike, or three in a row.',
  },
  {
    id: 'pair',
    mood: 'point',
    text: 'Two alike is a pair. Tap both to pick them, and watch the preview line.',
  },
  {
    id: 'run',
    mood: 'point',
    text: 'Three in a row of one suit is a run, called a chow. Cheap, but you will make plenty.',
  },
  {
    id: 'pong',
    mood: 'wow',
    text: 'Three alike is a pong! It scores far more than a run. They are rare, so keep one when you see it.',
  },
  {
    id: 'preview',
    mood: 'think',
    text: 'The preview shows what this set adds to your table. Tap Play when you like it.',
  },
  {
    id: 'discard',
    mood: 'think',
    text: 'Nothing to play? Discard tiles to dig for better ones. You only have a few discards.',
  },
  {
    id: 'kong',
    mood: 'wow',
    text: 'You have the fourth tile of a pong on your table. Upgrade it to a kong for one play.',
  },
  {
    id: 'score',
    mood: 'happy',
    text: 'When your plays run out, the whole table scores at once: chips times mult. Beat the target to win the round.',
  },
];

export function tipFor(id: string): Tip | undefined {
  return TIPS.find((t) => t.id === id);
}
