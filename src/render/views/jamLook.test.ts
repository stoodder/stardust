// The jams' look (T702; T730a's polish; jamLook.ts): the tendril's creep and bead, the countdown
// ring's share and its path round the base, and System Reboot's column (held whole when still).
import { describe, expect, it } from 'vitest';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import {
  jamArc,
  REBOOT_COLUMN_PX,
  REBOOT_MS,
  rebootColumn,
  RING_RX,
  RING_RY,
  ringPoint,
  tendrilBeadPx,
  tendrilReach,
} from './jamLook.ts';

describe('jamLook (T702, T730a)', () => {
  it('the tendril creeps from 0 to the whole way over its tell, its bead swelling', () => {
    expect(tendrilReach(120, 120)).toBe(0);
    expect(tendrilReach(60, 120)).toBe(0.5);
    expect(tendrilReach(0, 120)).toBe(1);
    expect(tendrilReach(10, 0)).toBe(1);
    expect(tendrilBeadPx(0)).toBe(3);
    expect(tendrilBeadPx(0.5)).toBe(4);
    expect(tendrilBeadPx(0.9)).toBe(5);
  });

  it('the ring is the jam left out of 4 s: full at 4 s, half for a Choir’s halved jam', () => {
    expect(jamArc(240)).toBe(1);
    expect(jamArc(120)).toBe(0.5);
    expect(jamArc(0)).toBe(0);
  });

  it('the ring runs clockwise from the top of an iso ellipse round the base', () => {
    const p = { x: 0, y: 0 };
    ringPoint(0, p);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-RING_RY);
    ringPoint(0.25, p);
    expect(p.x).toBeCloseTo(RING_RX);
    expect(p.y).toBeCloseTo(0);
    ringPoint(0.5, p);
    expect(p.y).toBeCloseTo(RING_RY);
    expect(RING_RX).toBe(RING_RY * 2);
  });

  it('Reboot’s column rises over its first third, steps out, and stands whole when still', () => {
    expect(rebootColumn(0, false)).toEqual({ height: 0, alpha: 1 });
    expect(rebootColumn(REBOOT_MS / 3, false).height).toBe(REBOOT_COLUMN_PX);
    expect(rebootColumn(REBOOT_MS * 0.9, false).alpha).toBeLessThan(1);
    expect(STEPPED_ALPHA).toContain(rebootColumn(REBOOT_MS * 0.7, false).alpha);
    expect(rebootColumn(REBOOT_MS, false).alpha).toBe(0);
    expect(rebootColumn(0, true)).toEqual({ height: REBOOT_COLUMN_PX, alpha: 1 });
  });
});
