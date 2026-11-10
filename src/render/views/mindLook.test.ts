// T507: the Unnerved squiggle's pixels and wobble (mindLook.ts; art-direction §8 *Unnerved*).
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  JITTER_STEP_MS,
  SQUIGGLE_H,
  SQUIGGLE_W,
  showsUnnerved,
  squiggleFrame,
  squiggleImage,
  UNNERVED_COLOR,
  UNNERVED_RIM,
  UNNERVED_WOBBLE_MS,
  unnervedJitterPx,
} from './mindLook.ts';

/** Each column's rows lit in `color` (opaque). */
function rowsOf(frame: 0 | 1, color: typeof UNNERVED_COLOR): number[][] {
  const img = squiggleImage(frame);
  const c = rgbOf(color);
  const cols: number[][] = [];
  for (let x = 0; x < img.w; x++) {
    const rows: number[] = [];
    for (let y = 0; y < img.h; y++) {
      const i = (y * img.w + x) * 4;
      const d = img.data;
      if (d[i + 3] === 255 && d[i] === c.r && d[i + 1] === c.g && d[i + 2] === c.b) rows.push(y);
    }
    cols.push(rows);
  }
  return cols;
}

describe('the Unnerved squiggle', () => {
  it('is a 9×5 zigzag: one violet pixel per column, rimmed in ink above and below', () => {
    const img = squiggleImage(0);
    expect([img.w, img.h]).toEqual([SQUIGGLE_W, SQUIGGLE_H]);
    const lit = rowsOf(0, UNNERVED_COLOR);
    const rim = rowsOf(0, UNNERVED_RIM);
    for (let x = 0; x < SQUIGGLE_W; x++) {
      expect(lit[x], `column ${x}`).toHaveLength(1);
      const y = lit[x]![0]!;
      expect(rim[x], `column ${x}`).toEqual([y - 1, y + 1]);
    }
    // It zigzags: the line goes both up and down.
    const ys = lit.map((r) => r[0]!);
    expect(new Set(ys).size).toBeGreaterThan(1);
  });

  it('wobbles between its two frames, and holds the first under reduced motion', () => {
    const a = rowsOf(0, UNNERVED_COLOR).map((r) => r[0]);
    const b = rowsOf(1, UNNERVED_COLOR).map((r) => r[0]);
    expect(a).not.toEqual(b);
    expect(squiggleFrame(0, false)).toBe(0);
    expect(squiggleFrame(UNNERVED_WOBBLE_MS, false)).toBe(1);
    expect(squiggleFrame(2 * UNNERVED_WOBBLE_MS, false)).toBe(0);
    expect(squiggleFrame(UNNERVED_WOBBLE_MS, true)).toBe(0);
  });
});

describe('the Unnerved jitter (T530a)', () => {
  it('shakes the body 1 px either way, unevenly, and holds still under reduced motion', () => {
    const seen = new Set<number>();
    let changes = 0;
    let last = unnervedJitterPx(3, 0, false);
    for (let ms = 0; ms < 100 * JITTER_STEP_MS; ms += JITTER_STEP_MS) {
      const j = unnervedJitterPx(3, ms, false);
      seen.add(j);
      if (j !== last) changes++;
      last = j;
      expect(unnervedJitterPx(3, ms, true)).toBe(0);
    }
    expect([...seen].toSorted((x, y) => x - y)).toEqual([-1, 0, 1]);
    expect(changes).toBeGreaterThan(30); // it shakes, not drifts
    // Steady within a step, and a neighbour shakes on its own beat.
    expect(unnervedJitterPx(3, 5, false)).toBe(unnervedJitterPx(3, JITTER_STEP_MS - 1, false));
    let same = 0;
    for (let ms = 0; ms < 50 * JITTER_STEP_MS; ms += JITTER_STEP_MS) {
      if (unnervedJitterPx(3, ms, false) === unnervedJitterPx(4, ms, false)) same++;
    }
    expect(same).toBeLessThan(40);
  });
});

describe('who wears the squiggle (review C7)', () => {
  const unit = { alive: true, unnervedTicks: 30, burrowed: false, phased: false, leaving: false };
  it('an Unnerved unit out in the open does', () => {
    expect(showsUnnerved(unit)).toBe(true);
  });
  it('a leaving (stood-down), burrowed, Phased, dead or calm unit does not', () => {
    expect(showsUnnerved({ ...unit, leaving: true })).toBe(false);
    expect(showsUnnerved({ ...unit, burrowed: true })).toBe(false);
    expect(showsUnnerved({ ...unit, phased: true })).toBe(false);
    expect(showsUnnerved({ ...unit, alive: false })).toBe(false);
    expect(showsUnnerved({ ...unit, unnervedTicks: 0 })).toBe(false);
  });
});
