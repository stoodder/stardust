import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { inTileMask } from '../../content/sprites/helpers.ts';
import {
  ellipseQuadrant,
  HIGHLIGHT_FILL_ALPHA,
  ringImage,
  snapRingRadius,
  tileHighlightImage,
} from './overlayPixels.ts';

const alphaAt = (img: { w: number; data: Uint8ClampedArray }, x: number, y: number): number =>
  img.data[(y * img.w + x) * 4 + 3] ?? -1;

describe('ellipseQuadrant', () => {
  it.each([
    [45, 23],
    [68, 34],
    [5, 3],
    [1, 1],
  ])('runs 8-connected from (0, b) to (a, 0) for a=%i, b=%i, on the ellipse', (a, b) => {
    const q = ellipseQuadrant(a, b);
    expect(q[0]).toEqual([0, b]);
    expect(q.at(-1)?.[1]).toBe(0);
    expect(q.at(-1)?.[0]).toBe(a);
    for (let i = 1; i < q.length; i++) {
      const [x0, y0] = q[i - 1]!;
      const [x1, y1] = q[i]!;
      expect(Math.abs(x1 - x0)).toBeLessThanOrEqual(1);
      expect(Math.abs(y1 - y0)).toBeLessThanOrEqual(1);
    }
    for (const [x, y] of q) {
      // Within a pixel of the true curve along the normal (loose bound in normalized terms).
      const f = (x * x) / (a * a) + (y * y) / (b * b);
      expect(Math.abs(Math.sqrt(f) - 1)).toBeLessThan(1 / Math.min(a, b) + 0.01);
    }
  });
});

describe('ringImage', () => {
  it('snaps radii to quarter tiles', () => {
    expect(snapRingRadius(3.1)).toBe(3);
    expect(snapRingRadius(3.13)).toBe(3.25);
    expect(snapRingRadius(0)).toBe(0.25);
  });

  it('is a 2:1 ellipse centered on (cx, cy), dashed, and mirror-symmetric', () => {
    const r = ringImage(3, 'white.0');
    // 3 tiles: semi-axes 3·16·√2 ≈ 68 and 3·8·√2 ≈ 34.
    expect(r.cx).toBe(68);
    expect(r.cy).toBe(34);
    expect(r.image.w).toBe(137);
    expect(r.image.h).toBe(69);
    let on = 0;
    for (let y = 0; y < r.image.h; y++) {
      for (let x = 0; x < r.image.w; x++) {
        const a = alphaAt(r.image, x, y);
        expect(a === 0 || a === 255).toBe(true);
        expect(alphaAt(r.image, r.image.w - 1 - x, y)).toBe(a);
        expect(alphaAt(r.image, x, r.image.h - 1 - y)).toBe(a);
        if (a === 255) on++;
      }
    }
    // Dashed: well under the full outline, well over nothing.
    const full = 4 * ellipseQuadrant(68, 34).length;
    expect(on).toBeGreaterThan(full * 0.4);
    expect(on).toBeLessThan(full * 0.75);
    const i = (r.cy * r.image.w + 0) * 4;
    expect(r.image.data[i + 3]).toBe(255); // the leftmost point is a dash start
    expect(Array.from(r.image.data.subarray(i, i + 3))).toEqual(Object.values(rgbOf('white.0')));
  });
});

describe('tileHighlightImage', () => {
  it('covers exactly the tile mask, with an opaque edge and a stepped-alpha fill', () => {
    const img = tileHighlightImage('red.3');
    const fill = Math.round(HIGHLIGHT_FILL_ALPHA * 255);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 32; x++) {
        const a = alphaAt(img, x, y);
        if (!inTileMask(x, y)) expect(a).toBe(0);
        else expect([fill, 255]).toContain(a);
      }
    }
    expect(alphaAt(img, 15, 0)).toBe(255); // top vertex
    expect(alphaAt(img, 16, 8)).toBe(fill); // center
  });
});
