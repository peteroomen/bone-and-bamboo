import { describe, expect, it } from 'vitest';
import { Rng, hashSeed } from './rng';

describe('rng', () => {
  it('is deterministic and serialisable', () => {
    const a = new Rng(hashSeed('x'));
    const b = new Rng(JSON.parse(JSON.stringify(a.state)) as number);
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
  });
  it('shuffles without losing items', () => {
    const r = new Rng(1);
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
