import { describe, expect, it } from 'vitest';
import { COUNT_UP_MAX_MS, COUNT_UP_MIN_MS, countUpDuration, countUpValue } from './countUp.ts';

describe('countUpDuration', () => {
  it('is bounded', () => {
    expect(countUpDuration(0)).toBe(COUNT_UP_MIN_MS);
    expect(countUpDuration(1)).toBe(COUNT_UP_MIN_MS);
    expect(countUpDuration(40)).toBe(1200);
    expect(countUpDuration(1_000_000)).toBe(COUNT_UP_MAX_MS);
  });
});

describe('countUpValue', () => {
  it('starts at 0 and lands exactly on the target', () => {
    expect(countUpValue(57, 0, 1000)).toBe(0);
    expect(countUpValue(57, 1000, 1000)).toBe(57);
    expect(countUpValue(57, 5000, 1000)).toBe(57);
  });

  it('never decreases and never overshoots', () => {
    for (const target of [1, 3, 57, 4312, 1_234_567]) {
      const d = countUpDuration(target);
      let prev = 0;
      for (let ms = 0; ms <= d + 16; ms += 16) {
        const v = countUpValue(target, ms, d);
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(prev);
        expect(v).toBeLessThanOrEqual(target);
        prev = v;
      }
      expect(prev).toBe(target);
    }
  });

  it('shows 0 for a zero target and the target when there is no time to count', () => {
    expect(countUpValue(0, 500, 1000)).toBe(0);
    expect(countUpValue(12, 0, 0)).toBe(12);
  });
});
