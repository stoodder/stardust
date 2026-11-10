// Sundown's light map (vfx/darknessPixels.ts; T505): the tone follows the dark, and a hole is
// exactly the sim's lit disc: a pixel is white iff its centre is within the source's radius in grid
// space (sim/darkness.ts isLitAt's test), so lit on screen is lit in the sim (D137).
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { DARK_EASE_TICKS } from '../../sim/index.ts';
import { screenToGrid, type Vec2 } from '../iso.ts';
import { LIGHT_FADE_TICKS } from './lighting.ts';
import {
  DARK_SHADE,
  DARK_SHADE_STRENGTH,
  darkTone,
  drawDarkness,
  packPixel,
} from './darknessPixels.ts';

const lum = (d: number): number => {
  const c = darkTone(d);
  return c.r + c.g + c.b;
};

describe('the darkness tone', () => {
  it('is white at 0 and DARK_SHADE_STRENGTH toward the shade at full dark', () => {
    expect(darkTone(0)).toEqual({ r: 255, g: 255, b: 255 });
    const s = rgbOf(DARK_SHADE);
    const k = DARK_SHADE_STRENGTH;
    expect(darkTone(1)).toEqual({
      r: Math.round(255 + (s.r - 255) * k),
      g: Math.round(255 + (s.g - 255) * k),
      b: Math.round(255 + (s.b - 255) * k),
    });
    // Darker as the dark deepens, never past full.
    expect(lum(0.25)).toBeGreaterThan(lum(0.5));
    expect(lum(0.5)).toBeGreaterThan(lum(1));
    expect(darkTone(2)).toEqual(darkTone(1));
  });

  it('moves with the sky and the grade: the sim eases the dark over the tint fade’s 4 s', () => {
    expect(DARK_EASE_TICKS).toBe(LIGHT_FADE_TICKS);
  });

  it('packs opaque little-endian RGBA words', () => {
    const word = packPixel({ r: 1, g: 2, b: 3 });
    const bytes = new Uint8Array(new Uint32Array([word]).buffer);
    expect([...bytes]).toEqual([1, 2, 3, 255]);
  });
});

describe('the light map', () => {
  const W = 240;
  const H = 140;
  const LEFT = -8;
  const TOP = -8;
  const origin = { x: 110, y: 10 };
  const discs = [
    { x: 2.5, y: 2.5, radiusSq: 2.25 }, // a lamp (1.5)
    { x: 6.5, y: 1.5, radiusSq: 4 }, // a beaming Prism (2.0), clear of the lamp
  ];

  it('is the tone everywhere but the discs, and a pixel is lit iff the sim would light it', () => {
    const px = new Uint32Array(W * H);
    const tone = darkTone(1);
    drawDarkness(px, W, H, LEFT, TOP, origin, tone, discs);
    const g: Vec2 = { x: 0, y: 0 };
    let lit = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        screenToGrid(x + 0.5 + LEFT, y + 0.5 + TOP, origin, g);
        const inside = discs.some((d) => (g.x - d.x) ** 2 + (g.y - d.y) ** 2 <= d.radiusSq + 1e-9);
        const outside = discs.every((d) => (g.x - d.x) ** 2 + (g.y - d.y) ** 2 > d.radiusSq - 1e-9);
        const v = px[y * W + x];
        if (v === 0xffffffff) lit++;
        if (inside && !outside) expect(v, `${x},${y}`).toBe(0xffffffff);
        if (outside && !inside) expect(v, `${x},${y}`).toBe(packPixel(tone));
      }
    }
    // Each disc is an ellipse of about π·r²·(2·HALF_W·HALF_H) px (a tile is 256 px).
    expect(lit).toBeGreaterThan(0.9 * Math.PI * (2.25 + 4) * 256);
    expect(lit).toBeLessThan(1.1 * Math.PI * (2.25 + 4) * 256);
  });

  it('draws only the first `count` discs', () => {
    const px = new Uint32Array(W * H);
    drawDarkness(px, W, H, LEFT, TOP, origin, darkTone(1), discs, 0);
    expect(px.every((v) => v === packPixel(darkTone(1)))).toBe(true);
  });
});
