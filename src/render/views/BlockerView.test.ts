// BlockerView's look (T605): the bar's colour by health, and its ease towards the sim's health.
import { describe, expect, it } from 'vitest';
import { BAR_EASE_MS, blockerBarColor, easeBar } from './BlockerView.ts';

describe('the blocker bar (T605)', () => {
  it('is green above half, gold to a quarter, red below', () => {
    expect(blockerBarColor(1)).toBe('green.3');
    expect(blockerBarColor(0.51)).toBe('green.3');
    expect(blockerBarColor(0.5)).toBe('gold.3');
    expect(blockerBarColor(0.26)).toBe('gold.3');
    expect(blockerBarColor(0.25)).toBe('red.3');
    expect(blockerBarColor(0.05)).toBe('red.3');
  });

  it('eases a whole bar in BAR_EASE_MS, snaps under reduced motion and on its first frame', () => {
    expect(easeBar(Number.NaN, 0.6, 16, false)).toBe(0.6);
    expect(easeBar(1, 0.05, 16, true)).toBe(0.05);
    expect(easeBar(1, 0, BAR_EASE_MS / 2, false)).toBeCloseTo(0.5, 12);
    expect(easeBar(0.6, 0.05, BAR_EASE_MS, false)).toBe(0.05);
    expect(easeBar(0.05, 0.05, 16, false)).toBe(0.05);
  });
});
