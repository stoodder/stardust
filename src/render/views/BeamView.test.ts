import { describe, expect, it } from 'vitest';
import { beamLook } from './BeamView.ts';

describe("beams' minimal view (T504)", () => {
  it('steps up with the ramp in thirds of the way to its cap', () => {
    // The Prism T1: ×1 → ×4.
    expect([1, 1.9, 2, 2.9, 3, 4].map((r) => beamLook(r, 4).step)).toEqual([0, 0, 1, 1, 2, 2]);
    // Sunlance's ×10: a third of the way is ×4.
    expect([3.9, 4, 7].map((r) => beamLook(r, 10).step)).toEqual([0, 1, 2]);
  });

  it('gets wider and brighter each step, with a white core only at the top', () => {
    const looks = [1, 2, 4].map((r) => beamLook(r, 4));
    expect(looks.map((l) => l.widthPx)).toEqual([2, 3, 4]);
    expect(looks.map((l) => l.alpha)).toEqual([0.75, 0.9, 1]);
    expect(looks.map((l) => l.core)).toEqual([false, false, true]);
    expect(looks.map((l) => l.color)).toEqual(['blue.3', 'teal.4', 'teal.4']);
  });

  it('a beam with no ramp (cap 1: the Lantern) draws at its first step', () => {
    expect(beamLook(1, 1).step).toBe(0);
  });
});
