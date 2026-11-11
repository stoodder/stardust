import { describe, expect, it } from 'vitest';
import { noCounterLoseByWave, parBand } from './rules.ts';

describe('harness rules', () => {
  it('par bands: the act floor to floor + 20, unless the map overrides it', () => {
    expect(parBand(1, null)).toEqual({ lo: 80, hi: 100 });
    expect(parBand(2, null)).toEqual({ lo: 65, hi: 85 });
    expect(parBand(3, null)).toEqual({ lo: 50, hi: 70 });
    expect(parBand(1, { minPct: 70, maxPct: 95 })).toEqual({ lo: 70, hi: 95 });
    expect(parBand('finale', null)).toEqual({ lo: 40, hi: 60 }); // Voices % (T804)
  });

  it('a no-counter build must lose before the final third', () => {
    expect(noCounterLoseByWave(9)).toBe(6);
    expect(noCounterLoseByWave(7)).toBe(4);
    expect(noCounterLoseByWave(3)).toBe(2);
  });
});
