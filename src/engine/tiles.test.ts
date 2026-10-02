import { describe, expect, it } from 'vitest';
import { buildTiles, compareKinds, countKinds, isOutside, kindName, tileChips } from './tiles';

describe('tiles', () => {
  it('builds the starting 81: 3 suits, 1-9, 3 copies', () => {
    const t = buildTiles('boneBamboo');
    expect(t).toHaveLength(81);
    expect(new Set(t.map((x) => x.id)).size).toBe(81);
    expect(countKinds(t).get('p5')).toBe(3);
    expect(t.some((x) => x.kind.startsWith('w') || x.kind.startsWith('d'))).toBe(false);
  });
  it('builds Two Rivers: dots and bamboo, 4 copies, one of each wind', () => {
    const c = countKinds(buildTiles('twoRivers'));
    expect(c.get('p1')).toBe(4);
    expect(c.get('m1')).toBeUndefined();
    expect(c.get('w2')).toBe(1);
    expect(buildTiles('twoRivers')).toHaveLength(72 + 4);
  });
  it('scores tile chips: rank for suits, 10 for honours', () => {
    expect(tileChips('s7')).toBe(7);
    expect(tileChips('w3')).toBe(10);
  });
  it('knows outside tiles: 1, 9 and honours', () => {
    expect(['p1', 'm9', 'w2', 'w4'].every(isOutside)).toBe(true);
    expect(['p2', 's8', 'm5'].some(isOutside)).toBe(false);
  });
  it('names tiles and sorts kinds', () => {
    expect(kindName('p5')).toBe('5 Dots');
    expect(kindName('w1')).toBe('East Wind');
    expect(['m1', 'p9', 'w1', 's2'].sort(compareKinds)).toEqual(['p9', 's2', 'm1', 'w1']);
  });
});
