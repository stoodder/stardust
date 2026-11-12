// The sim clock's machine scale (assertion 13 on a slower CI runner; architecture.md § 5).
import { describe, expect, it } from 'vitest';
import { simCpuScale } from './simClock.ts';

describe('simCpuScale', () => {
  it('is 1 unless a machine declares a slowdown of at least 1', () => {
    expect(simCpuScale(undefined)).toBe(1);
    expect(simCpuScale('')).toBe(1);
    expect(simCpuScale('abc')).toBe(1);
    expect(simCpuScale('0.5')).toBe(1);
    expect(simCpuScale('2.5')).toBe(2.5);
  });
});
