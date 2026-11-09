// Pests Processed presentation (core-loop.md § 6.2; maps.md § 5.5): the format, the live value,
// the results line per act, and the countdown at p = 0, 0.5, and 1.
import { describe, expect, it } from 'vitest';
import { countdownDisplay, formatCount, livePestsProcessed, resultsCounter } from './counter.ts';

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1,000'],
    [1234567, '1,234,567'],
    [12.9, '12'],
    [-5, '0'],
    [Number.NaN, '0'],
  ])('%d → %s', (n, s) => {
    expect(formatCount(n)).toBe(s);
  });

  it('adds the run so far inside a map', () => {
    expect(livePestsProcessed(1200, 34)).toBe(1234);
  });
});

describe('resultsCounter (one line per act)', () => {
  it('Act I brags, with stars and the career line', () => {
    expect(resultsCounter(1, 1234, 5678)).toEqual({
      line: 'PESTS PROCESSED: 1,234 ★ Top 5% of Technicians!',
      career: 'Career total: 5,678',
      stars: true,
    });
  });

  it('Act II drops the star', () => {
    expect(resultsCounter(2, 40, 900)).toEqual({
      line: 'Pests processed: 40.',
      career: 'Career total: 900',
      stars: false,
    });
  });

  it('Act III hides the counter behind the meter', () => {
    expect(resultsCounter(3, 40, 900, { kind: 'evacuated', n: 1200 }).line).toBe(
      'Evacuated: 1,200.',
    );
    expect(resultsCounter(3, 40, 900, { kind: 'sheltered', n: 12 }).line).toBe('Sheltered: 12.');
    expect(resultsCounter(3, 40, 900, { kind: 'held' })).toEqual({
      line: 'Held.',
      career: null,
      stars: false,
    });
    expect(resultsCounter(3, 40, 900).line).toBe('Held.');
  });

  it('the finale remembers the lifetime count', () => {
    expect(resultsCounter('finale', 0, 4321).line).toBe('REMEMBERED: 4,321');
  });
});

describe('countdownDisplay', () => {
  it.each([
    [0, 1000],
    [50, 500],
    [100, 0],
    [150, 0],
    [-10, 1000],
  ])('at %d of 100 rest points shows %d', (rest, shown) => {
    expect(countdownDisplay(1000, rest, 100)).toBe(shown);
  });

  it('rounds, and reads a zero target as done', () => {
    expect(countdownDisplay(3, 50, 100)).toBe(2);
    expect(countdownDisplay(1000, 0, 0)).toBe(0);
  });
});
