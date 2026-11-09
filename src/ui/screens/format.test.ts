import { describe, expect, it } from 'vitest';
import { formatCount, pestsProcessedLine } from './format.ts';

describe('formatCount', () => {
  it('adds comma thousands separators', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(7)).toBe('7');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1000)).toBe('1,000');
    expect(formatCount(4312)).toBe('4,312');
    expect(formatCount(1_234_567)).toBe('1,234,567');
  });

  it('clamps negatives and drops fractions', () => {
    expect(formatCount(-5)).toBe('0');
    expect(formatCount(12.9)).toBe('12');
  });

  it('stays within the 9-character worst case for counts below ten million', () => {
    expect(formatCount(9_999_999)).toHaveLength(9);
  });
});

describe('pestsProcessedLine', () => {
  it('is the Act I results line from the style guide', () => {
    expect(pestsProcessedLine(4312)).toBe('PESTS PROCESSED: 4,312 ★ Top 5% of Technicians!');
  });
});
