// Bricks's x-ray (review R3, R2-S3): its pixels, its breath, and when a tower hides him.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  occludes,
  OCCLUDE_MIN_FRAC,
  XRAY_ALPHA_STEPS,
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

/** His frame from rows: `#` solid in SELF, anything else clear (4 bytes per pixel). */
const SELF = { r: 200, g: 120, b: 60 };
function frame(rows: readonly string[]): { rgba: Uint8ClampedArray; w: number; h: number } {
  const h = rows.length;
  const w = rows[0]!.length;
  const rgba = new Uint8ClampedArray(w * h * 4);
  rows.forEach((r, y) => {
    for (let x = 0; x < w; x++) {
      if (r[x] !== '#') continue;
      const o = (y * w + x) * 4;
      rgba.set([SELF.r, SELF.g, SELF.b, 255], o);
    }
  });
  return { rgba, w, h };
}

/** The image's pixels as `w` (white.1), `k` (ink.0), `s` (his own colour), `.` (clear). */
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
      else if (img.data[o] === SELF.r && img.data[o + 1] === SELF.g) row += 's';
      else row += '?';
    }
    out.push(row);
  }
  return out;
}

describe("Bricks's x-ray (review R3, R2-S3)", () => {
  const him = frame(['.....', '.###.', '.####', '.###.', '.....']);
  /** A cover over the frame's right part: columns 3 on, every row. */
  const right = { ...mask(['###', '###', '###', '###', '###']), dx: 3, dy: 0 };
  const all = { ...mask(['#####', '#####', '#####', '#####', '#####']), dx: 0, dy: 0 };

  it('draws his covered pixels only: a white.1 rim on his edge, inside him half ink.0, half himself', () => {
    const img = xrayImage(him.rgba, him.w, him.h, [all]);
    expect([img.w, img.h]).toEqual([him.w, him.h]);
    // prettier-ignore
    expect(read(img)).toEqual([
      '.....',
      '.www.',
      '.wksw',
      '.www.',
      '.....',
    ]);
    // The checker is anchored to the screen: an odd frame origin flips it.
    const big = frame(['#####', '#####', '#####', '#####', '#####']);
    expect(read(xrayImage(big.rgba, 5, 5, [all], 0))[2]).toBe('wsksw');
    expect(read(xrayImage(big.rgba, 5, 5, [all], 1))[2]).toBe('wkskw');
  });

  it('is a 50% ordered dither of ink.0 over him, opaque, inside a covered body', () => {
    const big = frame(Array.from({ length: 10 }, () => '#'.repeat(10)));
    const cover = { ...mask(Array.from({ length: 10 }, () => '#'.repeat(10))), dx: 0, dy: 0 };
    const img = read(xrayImage(big.rgba, 10, 10, [cover]));
    const inside = img
      .slice(1, 9)
      .map((r) => r.slice(1, 9))
      .join('');
    expect(inside.split('k').length - 1).toBe(32);
    expect(inside.split('s').length - 1).toBe(32);
  });

  it('leaves what he shows of himself, and everything round him, clear (no outline round the tower)', () => {
    // prettier-ignore
    expect(read(xrayImage(him.rgba, him.w, him.h, [right]))).toEqual([
      '.....',
      '...w.',
      '...sw',
      '...w.',
      '.....',
    ]);
    // An offset cover past his frame hides nothing.
    expect(read(xrayImage(him.rgba, him.w, him.h, [{ ...right, dx: 9 }])).join('')).not.toMatch(
      /[wks]/,
    );
  });

  it('draws nothing for an empty frame or no cover', () => {
    const m = frame(['...', '...']);
    expect(read(xrayImage(m.rgba, m.w, m.h, [right])).join('')).not.toMatch(/[wks]/);
    expect(read(xrayImage(him.rgba, him.w, him.h, [])).join('')).not.toMatch(/[wks]/);
  });

  it('breathes slowly (2 Hz steps at most), and holds still at full alpha under reduced motion', () => {
    expect(1000 / XRAY_STEP_MS).toBeLessThanOrEqual(3);
    expect(xrayAlpha(0, false)).toBe(1);
    expect(xrayAlpha(XRAY_STEP_MS * 2, false)).toBe(XRAY_ALPHA_STEPS[2]);
    expect(xrayAlpha(XRAY_STEP_MS * 2, true)).toBe(1);
    for (const a of XRAY_ALPHA_STEPS) expect(a).toBeGreaterThanOrEqual(0.85);
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
    // minFrac 0: any overlap in front counts (the towers he shows through).
    expect(occludes(beside, 2, him, 1, 0)).toBe(true);
    expect(occludes(beside, 1, him, 2, 0)).toBe(false);
  });
});
