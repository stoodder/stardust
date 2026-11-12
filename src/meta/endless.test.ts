// Endless's score table (meta/endless.ts; T861): one best record per seed, at most ten, the
// lowest pushed out of a full table, and every table it writes passes the save validator.
import { describe, expect, it } from 'vitest';
import { endlessBest, endlessScores, withEndlessScore } from './endless.ts';
import { createNewSave, type SaveData } from './saveData.ts';
import { validateSave } from './validate.ts';
import { ENDGAME_LIMITS } from './validateEndgame.ts';

/** `save` after each [seed, wave] run in turn. */
const runs = (save: SaveData, list: readonly (readonly [number, number])[]): SaveData =>
  list.reduce((s, [seed, wave]) => withEndlessScore(s, seed, wave), save);

describe('withEndlessScore', () => {
  it("starts the table on a save's first run and leaves the old save alone", () => {
    const save = createNewSave();
    const next = withEndlessScore(save, 7, 23);
    expect(save.endless).toBeUndefined();
    expect(next.endless).toEqual([{ seed: 7, wave: 23 }]);
    expect(endlessBest(next, 7)).toBe(23);
    expect(endlessBest(next, 8)).toBeNull();
  });

  it("keeps one record per seed: the seed's best", () => {
    const save = runs(createNewSave(), [
      [7, 23],
      [9, 12],
      [7, 30],
    ]);
    expect(save.endless).toEqual([
      { seed: 7, wave: 30 },
      { seed: 9, wave: 12 },
    ]);
    // No better than the best: the same save back.
    expect(withEndlessScore(save, 7, 30)).toBe(save);
    expect(withEndlessScore(save, 7, 5)).toBe(save);
  });

  it('holds ten at most: a better run pushes out the lowest (the oldest of the lowest)', () => {
    const ten = Array.from({ length: 10 }, (_, i) => [i, i < 2 ? 5 : 10 + i] as const);
    const full = runs(createNewSave(), ten);
    expect(full.endless).toHaveLength(ENDGAME_LIMITS.endlessScores);
    // Too low for a full table: nothing changes.
    expect(withEndlessScore(full, 99, 5)).toBe(full);
    const next = withEndlessScore(full, 99, 6);
    expect(next.endless).toHaveLength(10);
    expect(endlessBest(next, 0)).toBeNull(); // seed 0 (5 waves, the older of the two 5s) went
    expect(endlessBest(next, 1)).toBe(5);
    expect(endlessBest(next, 99)).toBe(6);
  });

  it('lists the table best first, the earlier record first on a tie', () => {
    const save = runs(createNewSave(), [
      [1, 10],
      [2, 30],
      [3, 10],
      [4, 20],
    ]);
    expect(endlessScores(save).map((s) => s.seed)).toEqual([2, 4, 1, 3]);
    expect(endlessScores(createNewSave())).toEqual([]);
  });

  it('writes only tables the save validator accepts', () => {
    const many = Array.from({ length: 14 }, (_, i) => [4_000_000_000 + i, 3 * i] as const);
    const save = runs(createNewSave(), many);
    const r = validateSave(save);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.endless).toEqual(save.endless);
  });

  it('refuses a seed outside 32 bits or a wave count out of range', () => {
    const save = createNewSave();
    expect(() => withEndlessScore(save, -1, 3)).toThrow(RangeError);
    expect(() => withEndlessScore(save, 2 ** 32, 3)).toThrow(RangeError);
    expect(() => withEndlessScore(save, 1, 2.5)).toThrow(RangeError);
    expect(() => withEndlessScore(save, 1, ENDGAME_LIMITS.endlessWave + 1)).toThrow(RangeError);
  });
});
