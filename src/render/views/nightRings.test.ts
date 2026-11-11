// T630a: night rings (nightRings.ts) and the haste ring's look by day and by night.
import { describe, expect, it } from 'vitest';
import { hasteRingLook, METRONOME_HIGH_TICKS, RING_ALPHA_LOW } from './everglowLook.ts';
import { nightRings } from './nightRings.ts';

describe('night rings (T630a)', () => {
  it('Act III and the finale draw decal rings whole; Acts I–II keep their steps', () => {
    expect(nightRings('act3')).toBe(true);
    expect(nightRings('finale')).toBe(true);
    for (const env of ['act1', 'act2.gold', 'act2.dusk']) expect(nightRings(env)).toBe(false);
  });

  it('the haste ring dims between beats by day, beats brighter at full alpha by night', () => {
    expect(hasteRingLook(0, false, false)).toEqual({ color: 'orange.3', alpha: 1 });
    expect(hasteRingLook(METRONOME_HIGH_TICKS, false, false)).toEqual({
      color: 'orange.3',
      alpha: RING_ALPHA_LOW,
    });
    expect(hasteRingLook(0, false, true)).toEqual({ color: 'orange.4', alpha: 1 });
    expect(hasteRingLook(METRONOME_HIGH_TICKS, false, true)).toEqual({
      color: 'orange.3',
      alpha: 1,
    });
    // Reduced motion: steady, bright.
    expect(hasteRingLook(METRONOME_HIGH_TICKS, true, true)).toEqual({
      color: 'orange.4',
      alpha: 1,
    });
  });
});
