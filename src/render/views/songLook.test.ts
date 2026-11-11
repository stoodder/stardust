// The song's motes (T805; songLook.ts): the gold flip, then the motes rise and fade; the violet
// motes drift from the fall to where the unit lies, hover, and draw in as it re-forms.
import { describe, expect, it } from 'vitest';
import {
  DRIFT_MS,
  FLIP_MS,
  flipShows,
  REFORM_MS,
  REST_MS,
  REST_MOTES,
  restMoteAt,
  SCATTER_MOTES,
  scatterMoteAt,
} from './songLook.ts';

const m = { dx: 0, dy: 0, alpha: 0 };
const s = { dx: 0, dy: 0, alpha: 0, share: 0 };

describe('the rest motes', () => {
  it('flip first, then rise and fade out by REST_MS', () => {
    expect(flipShows(0)).toBe(true);
    expect(flipShows(FLIP_MS)).toBe(false);
    for (let i = 0; i < REST_MOTES; i++) {
      expect(restMoteAt(FLIP_MS / 2, i, false, m).alpha).toBe(0);
      expect(restMoteAt(FLIP_MS + 1, i, false, m).alpha).toBe(1);
      const early = restMoteAt(FLIP_MS + 300, i, false, m).dy;
      const late = restMoteAt(REST_MS - 50, i, false, m).dy;
      expect(late).toBeLessThan(early); // up the screen
      expect(restMoteAt(REST_MS, i, false, m).alpha).toBe(0);
    }
  });

  it('hold at the top under reduced motion, fading only', () => {
    const a = restMoteAt(FLIP_MS + 10, 0, true, m).dy;
    const b = restMoteAt(REST_MS - 10, 0, true, m).dy;
    expect(a).toBe(b);
  });
});

describe('the scatter motes', () => {
  it('drift from the fall to the unit, hover, then draw in and fade as it re-forms', () => {
    for (let i = 0; i < SCATTER_MOTES; i++) {
      expect(scatterMoteAt(0, i, -1, false, s).share).toBe(0);
      expect(scatterMoteAt(DRIFT_MS / 2, i, -1, false, s).share).toBeCloseTo(0.5);
      expect(scatterMoteAt(DRIFT_MS * 2, i, -1, false, s).share).toBe(1);
      expect(s.alpha).toBeGreaterThan(0);
      expect(scatterMoteAt(3000, i, REFORM_MS, false, s).alpha).toBe(0);
    }
  });

  it('sit at the unit at once under reduced motion', () => {
    expect(scatterMoteAt(0, 0, -1, true, s).share).toBe(1);
  });
});
