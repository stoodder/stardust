import { describe, expect, it } from 'vitest';
import { a1M05 } from '../../content/maps/a1_m05/index.ts';
import { LOWER_DELAY_TICKS, quietWaves, weaponsLowered } from './allyPose.ts';

describe('Bricks lowers his cannon on the Quiet Wave (act1.md § A1M5, T330)', () => {
  it("finds A1M5's Quiet Wave (W10) and no other", () => {
    const quiet = quietWaves(a1M05.waves);
    expect(quiet.flatMap((q, i) => (q ? [i + 1] : []))).toEqual([10]);
  });

  it('lowers a beat after the Quiet Wave starts, and stays lowered', () => {
    const quiet = [false, true];
    const start = [100, 1000];
    // Before it, during W1, and in W2's countdown (W2 not started): raised.
    expect(weaponsLowered(quiet, 0, 50, [-1, -1])).toBe(false);
    expect(weaponsLowered(quiet, 1, 900, [100, -1])).toBe(false);
    // As it starts ("Clear it, Sprout."), then a beat later, and on to the end.
    expect(weaponsLowered(quiet, 2, 1000, start)).toBe(false);
    expect(weaponsLowered(quiet, 2, 1000 + LOWER_DELAY_TICKS - 1, start)).toBe(false);
    expect(weaponsLowered(quiet, 2, 1000 + LOWER_DELAY_TICKS, start)).toBe(true);
    expect(weaponsLowered(quiet, 2, 99_999, start)).toBe(true);
  });

  it('never lowers on a map without one', () => {
    expect(weaponsLowered([false, false], 2, 99_999, [0, 10])).toBe(false);
    expect(weaponsLowered([], 1, 99_999, [0])).toBe(false);
  });
});
