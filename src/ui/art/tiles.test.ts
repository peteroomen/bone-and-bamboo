import { describe, expect, it } from 'vitest';
import icons from '../../../art-source/icons/icons.json';
import {
  GUIDE_MOODS,
  THEMES,
  type Icon,
  type ThemeId,
  type TileSpec,
  dragonTile,
  guide,
  specOf,
  tileSvg,
  setFaces,
} from './tiles';

// The reference generator is a plain script (art-source/tiles/tiles.js); the port must match it.
// @ts-expect-error no types for the reference script
const ref = (await import('../../../art-source/tiles/tiles.js')) as {
  default: {
    svg: (t: TileSpec, o?: object) => string;
    guide: (o?: object) => string;
    dragonTile: (o?: object) => string;
    useFaces: (i: object) => void;
    ALL: TileSpec[];
  };
};
const reference = ref.default;
const all = icons as unknown as Record<string, Icon>;

describe('tile art', () => {
  it('matches the reference generator for every tile in every colourway (code-drawn faces)', () => {
    for (const theme of Object.keys(THEMES) as ThemeId[]) {
      for (const tile of reference.ALL) {
        expect(tileSvg(tile, { theme })).toBe(reference.svg(tile, { theme }));
        expect(tileSvg(tile, { theme, index: false })).toBe(
          reference.svg(tile, { theme, index: false }),
        );
      }
      expect(tileSvg({ suit: 'back', rank: 0 }, { theme })).toBe(
        reference.svg({ suit: 'back', rank: 0 }, { theme }),
      );
    }
  });
  it('matches for every enhancement, edition and chop', () => {
    const tile = { suit: 'dots', rank: 5 } as const;
    for (const enh of [
      'gold',
      'jade',
      'bone',
      'porcelain',
      'iron',
      'wild',
      'blank',
      'lucky',
    ] as const)
      expect(tileSvg(tile, { enh })).toBe(reference.svg(tile, { enh }));
    for (const edition of ['lacquer', 'pearl', 'cloisonne', 'paper'] as const)
      expect(tileSvg(tile, { edition })).toBe(reference.svg(tile, { edition }));
    for (const chop of ['red', 'gold', 'blue', 'purple'] as const)
      expect(tileSvg(tile, { chop })).toBe(reference.svg(tile, { chop }));
  });
  it('matches with the traced faces registered, the guide and the dragon tiles', () => {
    setFaces(all);
    reference.useFaces(all);
    try {
      for (const theme of Object.keys(THEMES) as ThemeId[]) {
        for (const tile of reference.ALL) {
          expect(tileSvg(tile, { theme })).toBe(reference.svg(tile, { theme }));
        }
        for (const mood of GUIDE_MOODS) {
          expect(guide({ theme, mood })).toBe(reference.guide({ theme, mood }));
          expect(guide({ theme, mood, blink: true })).toBe(
            reference.guide({ theme, mood, blink: true }),
          );
        }
        for (const rarity of ['common', 'uncommon', 'rare'] as const) {
          expect(dragonTile({ theme, rarity, initial: 'A' })).toBe(
            reference.dragonTile({ theme, rarity, initial: 'A' }),
          );
          const icon = all['abacus'];
          expect(dragonTile({ theme, rarity, ...(icon ? { icon } : {}) })).toBe(
            reference.dragonTile({ theme, rarity, icon }),
          );
        }
      }
    } finally {
      setFaces({});
      reference.useFaces({});
    }
  });
  it('maps the game kinds to tiles', () => {
    expect(specOf('p5')).toEqual({ suit: 'dots', rank: 5 });
    expect(specOf('s1')).toEqual({ suit: 'bamboo', rank: 1 });
    expect(specOf('m9')).toEqual({ suit: 'chars', rank: 9 });
    expect(specOf('w4')).toEqual({ suit: 'wind', rank: 4 });
  });
});
