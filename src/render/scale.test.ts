import { describe, expect, it } from 'vitest';
import { computeScale, cssZoom } from './scale.ts';

describe('computeScale', () => {
  it('picks the largest integer factor that fits, in device pixels', () => {
    expect(computeScale(1280, 720, 1)).toBe(2);
    expect(computeScale(1920, 1080, 1)).toBe(3);
    expect(computeScale(1919, 1080, 1)).toBe(2);
    expect(computeScale(1280, 720, 1.5)).toBe(3);
    expect(computeScale(2560, 1600, 2)).toBe(8);
  });

  it('never goes below 1', () => {
    expect(computeScale(300, 200, 1)).toBe(1);
  });

  it('maps each game pixel to n device pixels', () => {
    expect(cssZoom(3, 1.5) * 1.5).toBe(3);
  });
});
