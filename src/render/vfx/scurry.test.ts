import { describe, expect, it } from 'vitest';
import {
  LOOK_BACK_AT_MS,
  LOOK_BACK_MS,
  LOOK_BACK_YOUNG,
  MAX_YOUNG,
  SCURRY_FADE_MS,
  SCURRY_MS,
  SCURRY_STAGGER_MS,
  scurryAlpha,
  scurryDist,
  scurryLooksBack,
  YOUNG_LANES_PX,
} from './scurry.ts';

describe('the sack burst scurry (D059, D061)', () => {
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

  it('lasts about 2.5 s and covers 2–3 tiles, so it reads as creatures fleeing', () => {
    expect(SCURRY_MS).toBeGreaterThanOrEqual(2400);
    expect(SCURRY_MS).toBeLessThanOrEqual(2600);
    for (let i = 0; i < MAX_YOUNG; i++) {
      const ran = 10 - scurryDist(10, SCURRY_MS, i);
      expect(ran, `young ${i}`).toBeGreaterThanOrEqual(2);
      expect(ran, `young ${i}`).toBeLessThanOrEqual(3);
    }
  });

  it('stops one young partway to look back, holding its place', () => {
    const start = LOOK_BACK_YOUNG * SCURRY_STAGGER_MS + LOOK_BACK_AT_MS;
    expect(scurryLooksBack(start - 10, LOOK_BACK_YOUNG)).toBe(false);
    expect(scurryLooksBack(start + 10, LOOK_BACK_YOUNG)).toBe(true);
    expect(scurryLooksBack(start + LOOK_BACK_MS + 10, LOOK_BACK_YOUNG)).toBe(false);
    expect(scurryDist(10, start + 10, LOOK_BACK_YOUNG)).toBe(
      scurryDist(10, start + LOOK_BACK_MS - 10, LOOK_BACK_YOUNG),
    );
    expect(scurryLooksBack(start + 10, 0)).toBe(false);
  });

  it('stays whole until the last 0.3 s, then fades in steps; gone at the end or at the spawn', () => {
    expect(scurryAlpha(0, 5)).toBe(1);
    expect(scurryAlpha(SCURRY_MS - SCURRY_FADE_MS - 1, 5)).toBe(1);
    expect(scurryAlpha(SCURRY_MS - SCURRY_FADE_MS + 1, 5)).toBeLessThan(1);
    expect(scurryAlpha(SCURRY_MS - 1, 5)).toBeGreaterThan(0);
    expect(scurryAlpha(SCURRY_MS, 5)).toBe(0);
    expect(scurryAlpha(100, 0)).toBe(0);
  });

  it('has a lane for every young', () => {
    expect(YOUNG_LANES_PX).toHaveLength(MAX_YOUNG);
  });
});
