import { describe, expect, it } from 'vitest';
import { COLOR_NAMES, rgbOf } from '../../content/palettes/master.ts';
import {
  backdropImage,
  backdropLayout,
  horizonAt,
  motePosition,
  skyColorAt,
  twinkleImage,
} from './backdropPixels.ts';

const W = 640;
const H = 360;

const MASTER_RGB = new Set(
  COLOR_NAMES.map((n) => {
    const { r, g, b } = rgbOf(n);
    return (r << 16) | (g << 8) | b;
  }),
);

describe('backdropImage', () => {
  const img = backdropImage(W, H);

  it('is opaque and uses only master palette colors', () => {
    for (let i = 0; i < img.data.length; i += 4) {
      expect(img.data[i + 3]).toBe(255);
      const rgb = (img.data[i]! << 16) | (img.data[i + 1]! << 8) | img.data[i + 2]!;
      if (!MASTER_RGB.has(rgb)) throw new Error(`non-palette color at pixel ${i / 4}`);
    }
  });

  it('is the same every boot', () => {
    expect(backdropImage(W, H).data).toEqual(img.data);
  });

  it('keeps the top deep dark and the ground in ink', () => {
    expect(skyColorAt(10, 0, H)).toBe('ink.0');
    const { r, g, b } = rgbOf('ink.0');
    const i = ((H - 1) * W + 3) * 4;
    expect([img.data[i], img.data[i + 1], img.data[i + 2]]).toEqual([r, g, b]);
  });

  it('dithers band seams instead of a hard edge', () => {
    const seamRow = Math.round(0.33 * H);
    const row = new Set<string>();
    for (let x = 0; x < 8; x++) row.add(skyColorAt(x, seamRow, H));
    expect(row).toEqual(new Set(['ink.0', 'ink.1']));
  });
});

describe('backdropLayout', () => {
  const layout = backdropLayout(W, H);

  it('places twinkles in the sky, inside the frame', () => {
    for (const t of layout.twinkles) {
      expect(t.x).toBeGreaterThanOrEqual(2);
      expect(t.x).toBeLessThan(W - 2);
      expect(t.y).toBeLessThan(horizonAt(t.x, H));
    }
  });

  it('keeps motes between the horizon and their ceiling as they rise', () => {
    const p = { x: 0, y: 0 };
    for (const m of layout.motes) {
      let prevY = Number.POSITIVE_INFINITY;
      let wrapped = false;
      for (let ms = 0; ms < 60_000; ms += 500) {
        motePosition(m, layout, ms, p);
        expect(p.y).toBeGreaterThanOrEqual(layout.topY);
        expect(p.y).toBeLessThanOrEqual(layout.horizonY);
        if (p.y > prevY + 1) wrapped = true;
        prevY = p.y;
      }
      // Slow as they are, every mote rises to the top and wraps within a minute.
      expect(wrapped).toBe(true);
    }
  });
});

describe('twinkleImage', () => {
  it('is a 5×5 plus with a white core and transparent corners', () => {
    const img = twinkleImage('pink.4');
    const alpha = (x: number, y: number) => img.data[(y * 5 + x) * 4 + 3];
    expect(alpha(2, 2)).toBe(255);
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(2, 0)).toBe(128);
  });
});
