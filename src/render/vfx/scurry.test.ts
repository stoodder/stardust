import { describe, expect, it } from 'vitest';
import {
  MAX_YOUNG,
  SCURRY_MS,
  SCURRY_STAGGER_MS,
  scurryAlpha,
  scurryDist,
  YOUNG_LANES_PX,
} from './scurry.ts';

describe('the sack burst scurry (D059)', () => {
  it('runs each young back up the route (toward the spawn), staggered', () => {
    expect(scurryDist(10, 0, 0)).toBe(10);
    expect(scurryDist(10, 500, 0)).toBeLessThan(10);
    // The second young waits its stagger before it moves.
    expect(scurryDist(10, SCURRY_STAGGER_MS, 1)).toBe(10);
    expect(scurryDist(10, SCURRY_STAGGER_MS + 200, 1)).toBeLessThan(10);
    // Always backwards, never past the spawn.
    for (let ms = 0; ms <= SCURRY_MS; ms += 100) {
      for (let i = 0; i < MAX_YOUNG; i++) {
        expect(scurryDist(10, ms + 100, i)).toBeLessThanOrEqual(scurryDist(10, ms, i));
      }
    }
    expect(scurryDist(0.5, SCURRY_MS, 0)).toBe(0);
  });

  it('fades in steps and is gone at the end or at the spawn', () => {
    expect(scurryAlpha(0, 5)).toBe(1);
    expect(scurryAlpha(SCURRY_MS * 0.9, 5)).toBeLessThan(1);
    expect(scurryAlpha(SCURRY_MS, 5)).toBe(0);
    expect(scurryAlpha(100, 0)).toBe(0);
  });

  it('has a lane for every young', () => {
    expect(YOUNG_LANES_PX).toHaveLength(MAX_YOUNG);
  });
});
