// T630a: where a latched swarmling clings (swarmLook.ts): its own height below the body's top, so
// the target's health bar stays clear, and spread inside the body.
import { describe, expect, it } from 'vitest';
import { HEALTH_BAR_ROOM_PX } from '../vfx/healthBar.ts';
import { CLING_FLOOR_PX, clingFeetY, clingSpreadPx, RIDE_PX, SPREAD_PX } from './swarmLook.ts';

describe('a latched swarmling (T630a)', () => {
  it('clings low enough that its top stays inside the frame, clear of the bar above it', () => {
    // A Maw's frame, 22 px tall: the rider's feet its own height below the top.
    const top = 100;
    for (const kind of ['swarmling', 'champion'] as const) {
      const feet = clingFeetY(top, top + 22, RIDE_PX[kind]);
      expect(feet - RIDE_PX[kind]).toBeGreaterThanOrEqual(top);
      // The bar sits over the frame's top (HEALTH_BAR_ROOM_PX of it), so nothing of the rider
      // reaches it.
      expect(feet - RIDE_PX[kind]).toBeGreaterThan(top - HEALTH_BAR_ROOM_PX);
    }
  });

  it('never clings past the foot of a short body', () => {
    expect(clingFeetY(100, 106, RIDE_PX.champion)).toBe(106 - CLING_FLOOR_PX);
    expect(clingFeetY(100, 101, RIDE_PX.swarmling)).toBe(100);
  });

  it('spreads by uid, inside the body', () => {
    const seen = new Set<number>();
    for (let uid = 1; uid < 40; uid++) {
      const dx = clingSpreadPx(uid, 10);
      expect(Math.abs(dx)).toBeLessThanOrEqual(SPREAD_PX);
      seen.add(dx);
    }
    expect(seen.size).toBeGreaterThan(3);
    for (let uid = 1; uid < 10; uid++)
      expect(Math.abs(clingSpreadPx(uid, 3))).toBeLessThanOrEqual(1);
  });
});
