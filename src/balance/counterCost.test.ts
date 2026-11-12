// The cost an exempted counter's pinning test asserts (T775; __fixtures__/counterCost.ts).
import { describe, expect, it } from 'vitest';
import { COUNTER_COST_MIN_POINTS, expectCounterCost } from './__fixtures__/counterCost.ts';

const base = { map: 'a3_m05', counter: 'jam', par: 80, without: 30, minPoints: 40 } as const;

describe('expectCounterCost', () => {
  it('passes when the no-counter build pays at least the pinned margin', () => {
    expect(() => expectCounterCost(base)).not.toThrow();
    expect(() => expectCounterCost({ ...base, without: 40 })).not.toThrow(); // exactly 40
  });

  it('fails when it pays less, or nothing (a build that merely runs)', () => {
    expect(() => expectCounterCost({ ...base, without: 41 })).toThrow(
      /margin points under par, expected ≥ 40/,
    );
    expect(() => expectCounterCost({ ...base, without: 80 })).toThrow();
  });

  it(`never pins a cost under ${COUNTER_COST_MIN_POINTS} points`, () => {
    expect(COUNTER_COST_MIN_POINTS).toBe(10);
    const tiny = { ...base, without: 79, minPoints: 1 };
    expect(() => expectCounterCost(tiny)).toThrow(/the pinned cost 1 is under 10/);
  });
});
