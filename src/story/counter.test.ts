// Pests Processed presentation (core-loop.md § 6.2; maps.md § 5.5): the format, the live value,
// the results line per act, and the countdown at p = 0, 0.5, and 1.
import { describe, expect, it } from 'vitest';
import { PRESENTATION } from '../content/presentation.ts';
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

describe('resultsCounter (one line per counter style)', () => {
  it('starred (Act I) brags, with stars and the career line', () => {
    expect(resultsCounter('starred', 1234, 5678)).toEqual({
      line: 'PESTS PROCESSED: 1,234 ★ Top 5% of Technicians!',
      label: 'PESTS PROCESSED:',
      n: 1234,
      end: '',
      brag: 'Top 5% of Technicians!',
      career: 'Career total: 5,678',
      stars: true,
    });
  });

  it('plain (Act II) drops the star and the brag', () => {
    expect(resultsCounter('plain', 40, 900)).toEqual({
      line: 'Pests processed: 40.',
      label: 'Pests processed:',
      n: 40,
      end: '.',
      brag: null,
      career: 'Career total: 900',
      stars: false,
    });
  });

  it('meter (Act III) hides the counter behind the meter', () => {
    expect(resultsCounter('meter', 40, 900, { kind: 'evacuated', n: 1200 }).line).toBe(
      'Evacuated: 1,200.',
    );
    expect(resultsCounter('meter', 40, 900, { kind: 'sheltered', n: 12 })).toMatchObject({
      line: 'Sheltered: 12.',
      n: 12,
      career: null,
    });
    expect(resultsCounter('meter', 40, 900, { kind: 'held' })).toMatchObject({
      line: 'Held.',
      n: null,
      career: null,
      stars: false,
    });
    expect(resultsCounter('meter', 40, 900).line).toBe('Held.');
  });

  it('remembered (the finale) remembers the lifetime count', () => {
    expect(resultsCounter('remembered', 0, 4321)).toMatchObject({
      line: 'REMEMBERED: 4,321',
      n: 4321,
      career: null,
    });
  });

  it('draws its parts into its line (Results renders the parts, screen readers the line)', () => {
    for (const style of ['starred', 'plain', 'remembered'] as const) {
      const c = resultsCounter(style, 7, 7);
      const brag = c.brag === null ? '' : ` ★ ${c.brag}`;
      expect(`${c.label} ${formatCount(c.n ?? 0)}${c.end}${brag}`).toBe(c.line);
    }
  });

  it("follows the dial, not the act: each act's row reads its style", () => {
    expect(resultsCounter(PRESENTATION.byAct[1].counter, 1, 1).stars).toBe(true);
    expect(resultsCounter(PRESENTATION.byAct[2].counter, 1, 1).line).toBe('Pests processed: 1.');
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
