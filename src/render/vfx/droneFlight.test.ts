import { describe, expect, it } from 'vitest';
import {
  DRONE_FLY_FRAC,
  DRONE_RETURN_TICKS,
  droneHomebound,
  droneOutbound,
} from './droneFlight.ts';

const out = { x: 0, y: 0 };
const home = { x: 11.5, y: 7.5 };
const tile = { x: 1.5, y: 4.5 };

describe('the salvage drone (design/maps.md § 3)', () => {
  it('flies in for the first quarter of the clear time, then works over the tile', () => {
    expect(droneOutbound(home, tile, 0, 360, out)).toBe('fly');
    expect(out).toEqual(home);
    expect(droneOutbound(home, tile, 45, 360, out)).toBe('fly');
    expect(out.x).toBeLessThan(home.x);
    expect(out.x).toBeGreaterThan(tile.x);
    expect(droneOutbound(home, tile, 360 * DRONE_FLY_FRAC, 360, out)).toBe('work');
    expect(out).toEqual(tile);
    expect(droneOutbound(home, tile, 359, 360, out)).toBe('work');
    expect(out).toEqual(tile);
  });

  it('flies faster under Salvage Expert (half the clear time, half the flight)', () => {
    expect(droneOutbound(home, tile, 45, 180, out)).toBe('work');
  });

  it('flies home once the queue is empty, then parks', () => {
    expect(droneHomebound(tile, home, 0, out)).toBe('fly');
    expect(out).toEqual(tile);
    expect(droneHomebound(tile, home, DRONE_RETURN_TICKS / 2, out)).toBe('fly');
    expect(droneHomebound(tile, home, DRONE_RETURN_TICKS, out)).toBe('parked');
    expect(out).toEqual(home);
  });
});
