// The jams' look (T702; jamLook.ts): the tendril's creep, the countdown arc's share, and the
// static's dashes (deterministic, held still under reduced motion).
import { describe, expect, it } from 'vitest';
import { jamArc, STATIC_COLORS, STATIC_STEP_TICKS, staticSpark, tendrilReach } from './jamLook.ts';

describe('jamLook (T702)', () => {
  it('the tendril creeps from 0 to the whole way over its tell', () => {
    expect(tendrilReach(120, 120)).toBe(0);
    expect(tendrilReach(60, 120)).toBe(0.5);
    expect(tendrilReach(0, 120)).toBe(1);
    expect(tendrilReach(10, 0)).toBe(1);
  });

  it('the arc is the jam left out of 4 s: full at 4 s, half for a Choir’s halved jam', () => {
    expect(jamArc(240)).toBe(1);
    expect(jamArc(120)).toBe(0.5);
    expect(jamArc(0)).toBe(0);
  });

  it('the static is the same for a tick step and uid, moves each step, and holds when still', () => {
    const a = { dx: 0, dy: 0, color: 0 };
    const b = { dx: 0, dy: 0, color: 0 };
    staticSpark(8, 3, 1, false, a);
    staticSpark(8 + STATIC_STEP_TICKS - 1 - (8 % STATIC_STEP_TICKS), 3, 1, false, b);
    expect(b).toEqual(a);
    const moved = [0, 1, 2, 3].some((i) => {
      staticSpark(8, 3, i, false, a);
      staticSpark(8 + STATIC_STEP_TICKS, 3, i, false, b);
      return a.dx !== b.dx || a.dy !== b.dy;
    });
    expect(moved).toBe(true);
    staticSpark(8, 3, 1, true, a);
    staticSpark(800, 3, 1, true, b);
    expect(b).toEqual(a);
    expect(a.color).toBeLessThan(STATIC_COLORS.length);
    expect(Math.abs(a.dx)).toBeLessThanOrEqual(7);
    expect(a.dy).toBeLessThanOrEqual(-4);
  });
});
