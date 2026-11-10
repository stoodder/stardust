import { describe, expect, it } from 'vitest';
import { beamLook, knotFrame, THROW_MS, throwFrac } from './BeamView.ts';

describe("beams' minimal view (T504)", () => {
  it('steps up with the ramp in thirds of the way to its cap', () => {
    // The Prism T1: ×1 → ×4.
    expect([1, 1.9, 2, 2.9, 3, 4].map((r) => beamLook(r, 4).step)).toEqual([0, 0, 1, 1, 2, 2]);
    // Sunlance's ×10: a third of the way is ×4.
    expect([3.9, 4, 7].map((r) => beamLook(r, 10).step)).toEqual([0, 1, 2]);
  });

  it('gets wider and brighter each step, with a white core only at the top', () => {
    const looks = [1, 2, 4].map((r) => beamLook(r, 4));
    expect(looks.map((l) => l.widthPx)).toEqual([1, 3, 4]); // a taut 1 px thread at the lock
    expect(looks.map((l) => l.alpha)).toEqual([0.85, 0.9, 1]);
    expect(looks.map((l) => l.core)).toEqual([false, false, true]);
    expect(looks.map((l) => l.color)).toEqual(['blue.3', 'teal.4', 'teal.4']);
  });

  it('a beam with no ramp (cap 1: the Lantern) draws at its first step', () => {
    expect(beamLook(1, 1).step).toBe(0);
  });
});

describe('the thrown thread and its knot (T530a)', () => {
  it('snaps out to the target over THROW_MS, whole at once under reduced motion', () => {
    expect(throwFrac(0, false)).toBe(0);
    expect(throwFrac(THROW_MS / 2, false)).toBeCloseTo(0.5);
    expect(throwFrac(THROW_MS, false)).toBe(1);
    expect(throwFrac(0, true)).toBe(1);
  });

  it('sparks once when the thread lands, then holds, flicking with the beam', () => {
    expect(knotFrame(THROW_MS - 1, 0, false)).toBe(-1); // still in flight
    const spark = [0, 70, 140].map((t) => knotFrame(THROW_MS + t, 0, false));
    expect(spark).toEqual([0, 1, 2]);
    expect(knotFrame(THROW_MS + 400, 0, false)).toBe(3);
    expect(knotFrame(THROW_MS + 400, 1, false)).toBe(4);
    // Reduced motion: the spark plays at the lock (no throw), the hold stays on its first frame.
    expect(knotFrame(0, 0, true)).toBe(0);
    expect(knotFrame(400, 1, true)).toBe(3);
  });
});
