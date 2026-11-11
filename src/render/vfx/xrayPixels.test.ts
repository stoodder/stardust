// Bricks's x-ray outline (review R3): its pixels, its breath, and when a tower hides him.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  occludes,
  OCCLUDE_MIN_FRAC,
  XRAY_ALPHA_STEPS,
  XRAY_PAD,
  XRAY_STEP_MS,
  xrayAlpha,
  xrayImage,
} from './xrayPixels.ts';

/** A `w`×`h` alpha mask with the rows' `#` solid. */
function mask(rows: readonly string[]): { alpha: Uint8Array; w: number; h: number } {
  const h = rows.length;
  const w = rows[0]!.length;
  const alpha = new Uint8Array(w * h);
  rows.forEach((r, y) => {
    for (let x = 0; x < w; x++) alpha[y * w + x] = r[x] === '#' ? 255 : 0;
  });
  return { alpha, w, h };
}

/** The image's pixels as `w` (white.1), `k` (ink.0), `.` (clear). */
function read(img: { w: number; h: number; data: Uint8ClampedArray }): string[] {
  const white = rgbOf('white.1');
  const ink = rgbOf('ink.0');
  const out: string[] = [];
  for (let y = 0; y < img.h; y++) {
    let row = '';
    for (let x = 0; x < img.w; x++) {
      const o = (y * img.w + x) * 4;
      if (img.data[o + 3] === 0) row += '.';
      else if (img.data[o] === white.r && img.data[o + 1] === white.g) row += 'w';
      else if (img.data[o] === ink.r && img.data[o + 1] === ink.g) row += 'k';
      else row += '?';
    }
    out.push(row);
  }
  return out;
}

describe("Bricks's x-ray outline (review R3)", () => {
  it('rings the silhouette in white.1 between two ink.0 rims, leaving the inside clear', () => {
    const m = mask(['.....', '.###.', '.###.', '.###.', '.....']);
    const img = xrayImage(m.alpha, m.w, m.h);
    expect([img.w, img.h]).toEqual([m.w + 2 * XRAY_PAD, m.h + 2 * XRAY_PAD]);
    // prettier-ignore
    expect(read(img)).toEqual([
      '.........',
      '...kkk...',
      '..kwwwk..',
      '.kwkkkwk.',
      '.kwk.kwk.',
      '.kwkkkwk.',
      '..kwwwk..',
      '...kkk...',
      '.........',
    ]);
  });

  it('draws nothing for an empty frame', () => {
    const m = mask(['...', '...']);
    expect(read(xrayImage(m.alpha, m.w, m.h)).join('')).not.toMatch(/[wk]/);
  });

  it('breathes slowly (2 Hz steps at most), and holds still at full alpha under reduced motion', () => {
    expect(1000 / XRAY_STEP_MS).toBeLessThanOrEqual(3);
    expect(xrayAlpha(0, false)).toBe(1);
    expect(xrayAlpha(XRAY_STEP_MS * 2, false)).toBe(XRAY_ALPHA_STEPS[2]);
    expect(xrayAlpha(XRAY_STEP_MS * 2, true)).toBe(1);
    for (const a of XRAY_ALPHA_STEPS) expect(a).toBeGreaterThanOrEqual(0.7);
  });

  it('shows only for a frame drawn in front that covers enough of him', () => {
    const him = { x: 0, y: 0, w: 20, h: 30 };
    const tower = { x: 4, y: 10, w: 30, h: 40 };
    expect(occludes(tower, 2, him, 1)).toBe(true);
    // Behind him: he covers it, not the other way round.
    expect(occludes(tower, 1, him, 2)).toBe(false);
    // Beside him, its box only grazing his.
    const beside = { x: 18, y: 0, w: 30, h: 40 };
    expect(2 * 30).toBeLessThan(OCCLUDE_MIN_FRAC * 20 * 30);
    expect(occludes(beside, 2, him, 1)).toBe(false);
    expect(occludes({ x: 40, y: 0, w: 10, h: 10 }, 2, him, 1)).toBe(false);
  });
});
