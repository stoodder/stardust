// The song's rest and scatter (T805, T830; songLook.ts): the gold flip steps, then the motes rise
// and fade; the violet motes drift from the fall to where the unit lies, hover, and pull in on the
// re-form clock.
import { describe, expect, it } from 'vitest';
import {
  BODY_FADE_MS,
  DRIFT_LAG_MS,
  DRIFT_MS,
  FLIP_LOOKS,
  FLIP_MS,
  FLIP_STEPS,
  flipStep,
  MAX_REST_MOTES,
  PULL_TICKS,
  REST_MOTE_LAG_MS,
  REST_MOTE_MS,
  REST_MS,
  restBodyAlpha,
  restMoteAt,
  restMoteCount,
  SCATTER_MOTES,
  scatterMoteAt,
} from './songLook.ts';

const m = { dx: 0, dy: 0, alpha: 0 };
const s = { dx: 0, dy: 0, alpha: 0, share: 0, pull: false };

describe('the gold flip', () => {
  it('steps warm multiply → brighter screens → all gold, holding the last step', () => {
    expect(FLIP_LOOKS).toHaveLength(FLIP_STEPS);
    expect(FLIP_LOOKS.map((l) => l.mode)).toEqual(['multiply', 'screen', 'screen', 'screen']);
    expect(FLIP_LOOKS.every((l) => l.color.startsWith('gold.'))).toBe(true);
    expect(flipStep(0)).toBe(0);
    expect(flipStep(FLIP_MS / FLIP_STEPS)).toBe(1);
    expect(flipStep(FLIP_MS * 10)).toBe(FLIP_STEPS - 1);
  });

  it('keeps the body whole through the flip, then fades it down the ladder', () => {
    expect(restBodyAlpha(0)).toBe(1);
    expect(restBodyAlpha(FLIP_MS - 1)).toBe(1);
    const mid = restBodyAlpha(FLIP_MS + BODY_FADE_MS / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(restBodyAlpha(FLIP_MS + BODY_FADE_MS)).toBe(0);
  });

  it('raises 6 motes for a small body, up to 10 for a big one', () => {
    expect(restMoteCount(12)).toBe(6);
    expect(restMoteCount(30)).toBeGreaterThan(6);
    expect(restMoteCount(200)).toBe(MAX_REST_MOTES);
  });
});

describe('the rest motes', () => {
  it('wait out the flip, then rise slowly and fade out', () => {
    expect(restMoteAt(FLIP_MS - 1, 0, 6, 12, 12, false, m).alpha).toBe(0);
    const start = restMoteAt(FLIP_MS + 10, 0, 6, 12, 12, false, m).dy;
    expect(m.alpha).toBe(1);
    const later = restMoteAt(FLIP_MS + 1000, 0, 6, 12, 12, false, m).dy;
    expect(later).toBeLessThan(start - 15); // about 24 px a second
    expect(restMoteAt(FLIP_MS + REST_MOTE_MS + 1, 0, 6, 12, 12, false, m).alpha).toBe(0);
  });

  it('set out one after another, and all are gone by REST_MS', () => {
    expect(restMoteAt(FLIP_MS + 10, 3, 6, 12, 12, false, m).alpha).toBe(0);
    expect(restMoteAt(FLIP_MS + 3 * REST_MOTE_LAG_MS + 10, 3, 6, 12, 12, false, m).alpha).toBe(1);
    for (let i = 0; i < MAX_REST_MOTES; i++) {
      expect(restMoteAt(REST_MS, i, MAX_REST_MOTES, 60, 40, false, m).alpha).toBe(0);
    }
  });

  it('hold their spots under reduced motion and only fade', () => {
    const a = restMoteAt(FLIP_MS + 10, 0, 6, 12, 12, true, m);
    const at = { dx: a.dx, dy: a.dy };
    restMoteAt(FLIP_MS + 1200, 0, 6, 12, 12, true, m);
    expect({ dx: m.dx, dy: m.dy }).toEqual(at);
    expect(m.alpha).toBeLessThan(1);
  });
});

describe('the scatter motes', () => {
  it('drift from the fall to where it lies, each a step behind', () => {
    expect(scatterMoteAt(0, 0, 200, false, s).share).toBe(0);
    expect(scatterMoteAt(DRIFT_MS / 2, 0, 200, false, s).share).toBeCloseTo(0.5);
    expect(scatterMoteAt(DRIFT_MS + SCATTER_MOTES * DRIFT_LAG_MS, 4, 200, false, s).share).toBe(1);
    expect(scatterMoteAt(10, 2, 200, false, s).alpha).toBe(0); // not set out yet
  });

  it('hover a rung down, then pull in, whole, over the last PULL_TICKS', () => {
    scatterMoteAt(DRIFT_MS * 3, 0, 200, false, s);
    expect(s.pull).toBe(false);
    expect(s.alpha).toBeLessThan(1);
    const far = Math.hypot(scatterMoteAt(DRIFT_MS * 3, 0, PULL_TICKS, false, s).dx, s.dy + 6);
    expect(s.pull).toBe(true);
    expect(s.alpha).toBe(1);
    const near = Math.hypot(scatterMoteAt(DRIFT_MS * 3, 0, 1, false, s).dx, s.dy + 6);
    expect(near).toBeLessThan(far);
  });

  it('sit where it lies under reduced motion', () => {
    expect(scatterMoteAt(0, 0, 200, true, s).share).toBe(1);
  });
});
