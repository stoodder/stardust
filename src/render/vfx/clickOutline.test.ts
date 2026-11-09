import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  ALPHA_STEP_MS,
  ALPHA_STEPS,
  CLICK_OUTLINE_COLOR,
  CLICK_OUTLINE_STROKE,
  DASH_ON,
  DASH_PERIOD,
  MARCH_STEP_MS,
  OUTLINE_PAD,
  OUTLINE_PHASES,
  dashLit,
  outlineImage,
  outlineLook,
  silhouetteContour,
} from './clickOutline.ts';

/** A w×h alpha mask from rows of '#' (solid) and '.'. */
function mask(rows: string[]): { alpha: Uint8Array; w: number; h: number } {
  const h = rows.length;
  const w = rows[0]!.length;
  const alpha = new Uint8Array(w * h);
  rows.forEach((r, y) => {
    for (let x = 0; x < w; x++) alpha[y * w + x] = r[x] === '#' ? 255 : 0;
  });
  return { alpha, w, h };
}

const pairs = (pts: readonly number[]): [number, number][] =>
  Array.from({ length: pts.length / 2 }, (_, i) => [pts[i * 2]!, pts[i * 2 + 1]!]);

describe('silhouetteContour', () => {
  it('rings the silhouette 1 px outside it, on 4-neighbours only', () => {
    const m = mask(['...', '.#.', '...']);
    const pts = pairs(silhouetteContour(m.alpha, m.w, m.h).points);
    expect(pts.map(([x, y]) => y * 10 + x).toSorted((a, b) => a - b)).toEqual([1, 10, 12, 21]);
  });

  it('reaches 1 px past the box, and never lies on the silhouette', () => {
    const m = mask(['##', '##']);
    const pts = pairs(silhouetteContour(m.alpha, m.w, m.h).points);
    expect(pts).toHaveLength(8);
    for (const [x, y] of pts) {
      const inside = x >= 0 && y >= 0 && x < 2 && y < 2;
      expect(inside).toBe(false);
      expect(Math.min(x, y)).toBeGreaterThanOrEqual(-1);
      expect(Math.max(x, y)).toBeLessThanOrEqual(2);
    }
  });

  it('walks round the shape in angle order (each step a short hop)', () => {
    const m = mask([
      '..........',
      '...####...',
      '..######..',
      '.########.',
      '..######..',
      '...####...',
      '..........',
    ]);
    const pts = pairs(silhouetteContour(m.alpha, m.w, m.h).points);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1]!;
      const [bx, by] = pts[i]!;
      expect(Math.max(Math.abs(ax - bx), Math.abs(ay - by)), `step ${i}`).toBeLessThanOrEqual(2);
    }
  });

  it('is empty without a silhouette', () => {
    const m = mask(['...', '...']);
    expect(silhouetteContour(m.alpha, m.w, m.h).points).toEqual([]);
  });
});

describe('the dashes', () => {
  it('light DASH_ON of every DASH_PERIOD contour pixels, one further along each phase', () => {
    for (let phase = 0; phase < OUTLINE_PHASES; phase++) {
      const lit = Array.from({ length: DASH_PERIOD * 4 }, (_, i) => dashLit(i, phase));
      expect(lit.filter(Boolean)).toHaveLength(DASH_ON * 4);
      for (let i = 0; i < lit.length; i++) expect(dashLit(i + 1, phase + 1)).toBe(lit[i]);
    }
  });

  it('draws the lit contour pixels in gold.4 rimmed in ink.0, offset into the padded image', () => {
    const m = mask(['#']);
    const contour = silhouetteContour(m.alpha, m.w, m.h);
    const img = outlineImage(contour, m.alpha, 1, 1, 0);
    const size = 1 + 2 * OUTLINE_PAD;
    expect([img.w, img.h]).toEqual([size, size]);
    const gold = rgbOf(CLICK_OUTLINE_COLOR);
    const ink = rgbOf(CLICK_OUTLINE_STROKE);
    const lit: [number, number][] = [];
    const rim: [number, number][] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const o = (y * size + x) * 4;
        if (img.data[o + 3] === 0) continue;
        const rgb = { r: img.data[o], g: img.data[o + 1], b: img.data[o + 2] };
        if (rgb.r === gold.r && rgb.g === gold.g && rgb.b === gold.b) lit.push([x, y]);
        else {
          expect(rgb).toEqual(ink);
          rim.push([x, y]);
        }
      }
    }
    // Four contour pixels, the first three lit; never the object's own pixel.
    const self: [number, number] = [OUTLINE_PAD, OUTLINE_PAD];
    expect(lit).toHaveLength(DASH_ON);
    expect(lit).not.toContainEqual(self);
    expect(rim).not.toContainEqual(self);
    // The rim never covers a contour pixel (lit or not): it only lies further out.
    const contourPx = pairs(contour.points).map(([x, y]) => [x + OUTLINE_PAD, y + OUTLINE_PAD]);
    for (const p of rim) expect(contourPx).not.toContainEqual(p);
    expect(rim.length).toBeGreaterThan(0);
  });
});

describe('outlineLook (≤ 3 Hz; steady under reduced motion)', () => {
  it('marches at 2 Hz and steps the alpha through a 1 s cycle of small changes', () => {
    expect(1000 / MARCH_STEP_MS).toBeLessThanOrEqual(3);
    expect(ALPHA_STEP_MS * ALPHA_STEPS.length).toBe(1000);
    for (let i = 1; i <= ALPHA_STEPS.length; i++) {
      const d = Math.abs(ALPHA_STEPS[i % ALPHA_STEPS.length]! - ALPHA_STEPS[i - 1]!);
      expect(d).toBeLessThanOrEqual(0.2);
    }
    expect(Math.min(...ALPHA_STEPS)).toBeGreaterThanOrEqual(0.6);
    const out = { phase: 0, alpha: 0 };
    expect(outlineLook(0, false, out)).toEqual({ phase: 0, alpha: 1 });
    expect(outlineLook(MARCH_STEP_MS, false, out).phase).toBe(1);
    expect(outlineLook(MARCH_STEP_MS * OUTLINE_PHASES, false, out).phase).toBe(0);
    expect(outlineLook(ALPHA_STEP_MS * 2, false, out).alpha).toBe(ALPHA_STEPS[2]);
  });

  it('holds still under reduced motion', () => {
    const out = { phase: 3, alpha: 0.5 };
    for (const ms of [0, 260, 1700, 99_999]) {
      expect(outlineLook(ms, true, out)).toEqual({ phase: 0, alpha: 1 });
    }
  });
});
