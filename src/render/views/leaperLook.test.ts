// T704: the Sproing Pad's look rules (leaperLook.ts): the boing's arc, the leg's progress, and the
// dizzy stars' orbit.
import { describe, expect, it } from 'vitest';
import {
  LEAP_ARC_PX,
  leapLiftPx,
  legProgress,
  STAR_ORBIT_RX,
  STAR_ORBIT_RY,
  STAR_PERIOD_MS,
  starOffset,
  STARS,
} from './leaperLook.ts';

function at(k: number, ms: number, still = false): { dx: number; dy: number } {
  const out = { dx: 0, dy: 0 };
  starOffset(k, ms, still, out);
  return out;
}

describe('the leaper’s boing (leaperLook.ts)', () => {
  it('a leg runs 0 → 1 by distance come over distance in all; a leg with no length is done', () => {
    expect(legProgress(0, 2)).toBe(0);
    expect(legProgress(1, 1)).toBe(0.5);
    expect(legProgress(3, 0)).toBe(1);
    expect(legProgress(0, 0)).toBe(1);
  });

  it('arcs LEAP_ARC_PX over the straight blend at mid-leg, landing at the end’s lift', () => {
    expect(leapLiftPx(0, 0, 16)).toBe(0);
    expect(leapLiftPx(1, 0, 16)).toBe(16);
    expect(leapLiftPx(0.5, 0, 16)).toBe(8 + LEAP_ARC_PX);
    expect(leapLiftPx(0.5, 16, 0)).toBe(8 + LEAP_ARC_PX);
    // Highest at mid-leg on a flat leg.
    expect(leapLiftPx(0.5, 0, 0)).toBeGreaterThan(leapLiftPx(0.25, 0, 0));
  });

  it('spaces the stars evenly round an iso orbit, turning with time, still under reduced motion', () => {
    expect(at(0, 0)).toEqual({ dx: STAR_ORBIT_RX, dy: 0 });
    for (let k = 0; k < STARS; k++) {
      const s = at(k, 123);
      expect(Math.abs(s.dx)).toBeLessThanOrEqual(STAR_ORBIT_RX);
      expect(Math.abs(s.dy)).toBeLessThanOrEqual(STAR_ORBIT_RY);
    }
    expect(at(0, STAR_PERIOD_MS / 4)).not.toEqual(at(0, 0));
    expect(at(0, STAR_PERIOD_MS / 4, true)).toEqual(at(0, 0, true));
  });
});
