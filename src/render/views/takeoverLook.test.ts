// takeoverLook.ts (T707): the Auditor's ring, Hostile Takeover's laser and reticle, the hangar
// door, and the plates, as pure rules.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  doorOffset,
  laserHot,
  lensOffset,
  doorShare,
  LASER_COLOR,
  LASER_MAX_PX,
  LASER_MIN_PX,
  laserWidth,
  RETICLE_FROM_PX,
  RETICLE_TO_PX,
  reticlePx,
  RING_COLOR,
  RING_OUTLINE,
  RING_START,
  ringAlpha,
  ringTiles,
  tellProgress,
  UNDER,
} from './takeoverLook.ts';

describe('takeoverLook (T707)', () => {
  it('uses master palette colors', () => {
    for (const c of [RING_COLOR, RING_OUTLINE, UNDER, LASER_COLOR]) {
      expect(() => rgbOf(c)).not.toThrow();
    }
  });

  it('a tell’s progress runs 0 → 1 over its ticks', () => {
    expect(tellProgress(120, 120)).toBe(0);
    expect(tellProgress(60, 120)).toBe(0.5);
    expect(tellProgress(0, 120)).toBe(1);
    expect(tellProgress(5, 0)).toBe(1);
    expect(doorShare(45, 90)).toBe(0.5);
  });

  it('the ring grows from RING_START of its reach to all of it; still, it is whole', () => {
    expect(ringTiles(0, 2, false)).toBeCloseTo(2 * RING_START);
    expect(ringTiles(1, 2, false)).toBe(2);
    expect(ringTiles(0.5, 2, false)).toBeGreaterThan(ringTiles(0.25, 2, false));
    expect(ringTiles(0, 2, true)).toBe(2);
    expect(ringAlpha(0)).toBeLessThan(ringAlpha(1));
    expect(ringAlpha(1)).toBe(1);
  });

  it('the laser widens and its reticle closes on the target', () => {
    expect([laserWidth(0), laserWidth(1)]).toEqual([LASER_MIN_PX, LASER_MAX_PX]);
    expect([reticlePx(0), reticlePx(1)]).toEqual([RETICLE_FROM_PX, RETICLE_TO_PX]);
    expect(reticlePx(0.5)).toBeLessThan(RETICLE_FROM_PX);
  });

  it('T730a: the lens and the door sit where the sprite draws them, mirrored for sw and nw', () => {
    const o = { dx: 0, dy: 0 };
    lensOffset('se', o);
    expect(o).toEqual({ dx: -11, dy: -39 });
    lensOffset('sw', o);
    expect(o).toEqual({ dx: 10, dy: -39 });
    lensOffset('ne', o);
    expect(o).toEqual({ dx: 13, dy: -39 });
    lensOffset('nw', o);
    expect(o).toEqual({ dx: -14, dy: -39 });
    doorOffset('se', o);
    const se = o.dx;
    doorOffset('sw', o);
    expect(o.dx).toBe(-se - 1);
    expect(o.dy).toBeLessThan(0);
  });

  it('T730a: the laser runs hot (a white core) over its last third', () => {
    expect(laserHot(0.5)).toBe(false);
    expect(laserHot(0.7)).toBe(true);
    expect(laserWidth(0)).toBe(LASER_MIN_PX);
    expect(laserWidth(1)).toBe(LASER_MAX_PX);
  });
});
