import { describe, expect, it } from 'vitest';
import { runResultOf, type RunEndInput } from './runResult.ts';

const INPUT: RunEndInput = {
  mapId: 'a1_m01',
  waveCount: 7,
  maxIntegrity: 20,
  integrity: 13,
  skitterkinKilled: 57,
  wavesCleared: 4,
};

describe('runResultOf', () => {
  it('reports a loss with the waves resolved so far', () => {
    expect(runResultOf({ ...INPUT, integrity: 0 }, 'lost')).toEqual({
      mapId: 'a1_m01',
      outcome: 'lost',
      wavesSurvived: 4,
      waveCount: 7,
      integrity: 0,
      maxIntegrity: 20,
      pestsProcessed: 57,
    });
  });

  it('counts every wave on a win', () => {
    const r = runResultOf({ ...INPUT, wavesCleared: 6 }, 'won');
    expect(r.wavesSurvived).toBe(7);
    expect(r.integrity).toBe(13);
    expect(r.pestsProcessed).toBe(57);
  });

  it('never reports more waves than the map has, or negative integrity', () => {
    const r = runResultOf({ ...INPUT, wavesCleared: 9, integrity: -3 }, 'lost');
    expect(r.wavesSurvived).toBe(7);
    expect(r.integrity).toBe(0);
  });
});
