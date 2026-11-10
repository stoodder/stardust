// T507: the Unnerved squiggle's pixels and wobble (mindLook.ts; art-direction §8 *Unnerved*).
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  SQUIGGLE_H,
  SQUIGGLE_W,
  squiggleFrame,
  squiggleImage,
  UNNERVED_COLOR,
  UNNERVED_RIM,
  UNNERVED_WOBBLE_MS,
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
