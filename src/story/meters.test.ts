// The meters' low marks (story/meters.ts; T569): one rule for the radio, the HUD, and the alarm.
import { describe, expect, it } from 'vitest';
import { escortLow, holdoutLow, integrityLow, LOW_INTEGRITY_SHARE } from './meters.ts';

describe('the low marks (T569)', () => {
  it('reads the core as low at a quarter or less, above 0', () => {
    expect(LOW_INTEGRITY_SHARE).toBe(0.25);
    expect([0, 1, 5, 6, 20].map((n) => integrityLow(n, 20))).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
  });

  it('reads an Escort as low once a quarter or less of its losses are left, never without maxLost', () => {
    expect([0, 8, 9, 12].map((n) => escortLow(n, 12))).toEqual([false, false, true, true]);
    expect(escortLow(50, null)).toBe(false);
  });

  it('reads a Holdout as low once half the losses its floor allows are gone (T622)', () => {
    // A3M3: 36 refugees, a 50% floor: low from 9 lost (a quarter).
    expect([0, 8, 9, 20].map((n) => holdoutLow(n, 36, 0.5))).toEqual([false, false, true, true]);
    expect(holdoutLow(5, 0, 0.5)).toBe(false);
    // No floor: half of everyone.
    expect(holdoutLow(18, 36, null)).toBe(true);
  });
});
