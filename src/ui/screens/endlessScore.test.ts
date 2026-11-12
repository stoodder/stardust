// The Endless score card's lines (T803e): the seed named once, the records only beside another
// seed, and this seed's old best never said twice.
import { describe, expect, it } from 'vitest';
import { scoreLines } from './PostGame.tsx';

describe('scoreLines', () => {
  it('a first run: the seed with New best, and no list that would only repeat the headline', () => {
    const first = {
      seed: 1,
      held: 1,
      newBest: true,
      bestBefore: null,
      scores: [{ seed: 1, wave: 1 }],
    };
    expect(scoreLines(first)).toEqual({ seed: 'Seed 1 · New best.', records: false });
  });

  it('lists the records once another seed is there, and leaves the old best to its marked row', () => {
    const scores = [
      { seed: 4, wave: 12 },
      { seed: 1, wave: 9 },
    ];
    // Short of this seed's best: the marked row says it.
    expect(scoreLines({ seed: 1, held: 3, newBest: false, bestBefore: 9, scores })).toEqual({
      seed: 'Seed 1',
      records: true,
    });
    // A seed the table no longer holds: its best is said on the line.
    expect(scoreLines({ seed: 7, held: 2, newBest: false, bestBefore: 5, scores })).toEqual({
      seed: 'Seed 7 · Best on this seed: 5 waves.',
      records: true,
    });
    expect(scoreLines({ seed: 1, held: 10, newBest: true, bestBefore: 9, scores }).seed).toBe(
      'Seed 1 · New best.',
    );
  });
});
