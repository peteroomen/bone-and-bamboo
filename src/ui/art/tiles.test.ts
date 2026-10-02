import { describe, expect, it } from 'vitest';
import { THEMES, type ThemeId, type TileSpec, specOf, tileSvg } from './tiles';

// The reference generator is a plain script (art-source/tiles/tiles.js); the port must match it.
// @ts-expect-error no types for the reference script
const ref = (await import('../../../art-source/tiles/tiles.js')) as {
  default: { svg: (t: TileSpec, o?: object) => string; ALL: TileSpec[] };
};
const reference = ref.default;

describe('tile art', () => {
  it('matches the reference generator for every tile in every colourway', () => {
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
  it('maps the game kinds to tiles', () => {
    expect(specOf('p5')).toEqual({ suit: 'dots', rank: 5 });
    expect(specOf('s1')).toEqual({ suit: 'bamboo', rank: 1 });
    expect(specOf('m9')).toEqual({ suit: 'chars', rank: 9 });
    expect(specOf('w4')).toEqual({ suit: 'wind', rank: 4 });
    expect(specOf('d2')).toEqual({ suit: 'dragon', rank: 2 });
  });
});
