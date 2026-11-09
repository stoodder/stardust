import { describe, expect, it } from 'vitest';
import { TICK_HZ, perSecToPerTick, ratePerSecToPeriodTicks, secToTicks } from './time.ts';

describe('secToTicks', () => {
  it('converts whole and exact fractional seconds', () => {
    expect(TICK_HZ).toBe(60);
    expect(secToTicks(1)).toBe(60);
    expect(secToTicks(0.25)).toBe(15);
    expect(secToTicks(0.8)).toBe(48);
    expect(secToTicks(25)).toBe(1500);
    expect(secToTicks(0)).toBe(0);
  });

  it('rounds to the nearest tick, halves up', () => {
    expect(secToTicks(0.125)).toBe(8); // 7.5
    expect(secToTicks(0.175)).toBe(11); // 10.5
    expect(secToTicks(1 / 3)).toBe(20);
    expect(secToTicks(0.01)).toBe(1); // 0.6
    expect(secToTicks(0.024)).toBe(1); // 1.44
  });

  it('snaps float error before rounding a half', () => {
    // 1.025 * 60 is 61.49999999999999 in floating point; the authored value is 61.5 ticks.
    expect(1.025 * 60).toBeLessThan(61.5);
    expect(secToTicks(1.025)).toBe(62);
    expect(secToTicks(4.225)).toBe(254);
  });

  it('never rounds a positive duration down to zero ticks', () => {
    expect(secToTicks(0.001)).toBe(1);
    expect(secToTicks(Number.MIN_VALUE)).toBe(1);
  });

  it('rejects negative and non-finite durations', () => {
    expect(() => secToTicks(-0.5)).toThrow(RangeError);
    expect(() => secToTicks(Number.NaN)).toThrow(RangeError);
    expect(() => secToTicks(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('ratePerSecToPeriodTicks', () => {
  it('converts a rate to a whole-tick period, rounded like durations', () => {
    expect(ratePerSecToPeriodTicks(2)).toBe(30);
    expect(ratePerSecToPeriodTicks(2.5)).toBe(24);
    expect(ratePerSecToPeriodTicks(0.5)).toBe(120);
    expect(ratePerSecToPeriodTicks(0.6)).toBe(100);
    expect(ratePerSecToPeriodTicks(7.5)).toBe(8);
    expect(ratePerSecToPeriodTicks(1.6)).toBe(38); // 37.5, halves up
    expect(ratePerSecToPeriodTicks(1000)).toBe(1); // faster than the tick rate: every tick
  });

  it('rejects zero, negative, and non-finite rates', () => {
    expect(() => ratePerSecToPeriodTicks(0)).toThrow(RangeError);
    expect(() => ratePerSecToPeriodTicks(-1)).toThrow(RangeError);
    expect(() => ratePerSecToPeriodTicks(Number.NaN)).toThrow(RangeError);
  });
});

describe('perSecToPerTick', () => {
  it('divides exactly, without rounding', () => {
    expect(perSecToPerTick(1)).toBe(1 / 60);
    expect(perSecToPerTick(2) * TICK_HZ).toBeCloseTo(2, 12);
  });
});
