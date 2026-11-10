// Sundown's light map (vfx/darknessPixels.ts; T505, T530b): the night falls deep on the world and
// lightly on the actors, and a hole is exactly the sim's lit disc: a pixel is clear iff its centre
// is within the source's radius in grid space (sim/darkness.ts isLitAt's test), so lit on screen
// is lit in the sim (D137).
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import { DARK_EASE_TICKS } from '../../sim/index.ts';
import { screenToGrid, type Vec2 } from '../iso.ts';
import { LIGHT_FADE_TICKS } from './lighting.ts';
import {
  darkTones,
  drawDarkMask,
  lumOf,
  MASK_DARK,
  MASK_LIT,
  NIGHT_SHADE,
  drawLampMask,
  LAMP_LIGHT,
  noDark,
  rgbOfNumber,
  sceneryTint,
} from './darknessPixels.ts';

const tones = (d: number) => darkTones(d, noDark());
const tintOfColor = (name: typeof LAMP_LIGHT): number => {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
};
const mul = (a: number, b: number): number => {
  const x = rgbOfNumber(a);
  const y = rgbOfNumber(b);
  const ch = (p: number, q: number) => Math.round((p * q) / 255);
  return (ch(x.r, y.r) << 16) | (ch(x.g, y.g) << 8) | ch(x.b, y.b);
};

describe('the night’s tones', () => {
  it('are no darkness at 0: white multiplies and no lift', () => {
    expect(tones(0)).toEqual({
      world: 0xffffff,
      ground: 0xffffff,
      veil: 0xffffff,
      lift: 0,
      lamp: 0xffffff,
    });
  });

  it('fall deep on the world at full dark and only veil the actors (deep darks, D134)', () => {
    const t = tones(1);
    // The world (ground, sky, scenery out of the light) keeps a few percent of its light.
    expect(lumOf(t.world)).toBeLessThan(0.05);
    // The actors keep most of theirs, so they read in their faction palettes over the dark.
    expect(lumOf(t.veil)).toBeGreaterThan(0.5);
    // The lift is a little of the night's plum, never a grey: blue over red over green.
    const lift = rgbOfNumber(t.lift);
    const s = rgbOf(NIGHT_SHADE);
    expect(lift.b).toBeGreaterThan(lift.r);
    expect(lift.r).toBeGreaterThan(lift.g);
    expect(lift.b).toBeLessThan(s.b);
  });

  it('the ground image times the veil is the world', () => {
    for (const d of [0.25, 0.5, 1]) {
      const t = tones(d);
      const w = rgbOfNumber(t.world);
      const got = rgbOfNumber(mul(t.ground, t.veil));
      expect(Math.abs(got.r - w.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(got.g - w.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(got.b - w.b)).toBeLessThanOrEqual(1);
    }
  });

  it('deepen as the dark does, never past full', () => {
    expect(lumOf(tones(0.25).world)).toBeGreaterThan(lumOf(tones(0.5).world));
    expect(lumOf(tones(0.5).world)).toBeGreaterThan(lumOf(tones(1).world));
    expect(lumOf(tones(0.5).veil)).toBeGreaterThan(lumOf(tones(1).veil));
    expect(tones(2)).toEqual(tones(1));
  });

  it('write in place (no allocation per frame)', () => {
    const out = noDark();
    expect(darkTones(0.7, out)).toBe(out);
  });

  it('move with the sky and the grade: the sim eases the dark over the tint fade’s 4 s', () => {
    expect(DARK_EASE_TICKS).toBe(LIGHT_FADE_TICKS);
  });
});

describe('the scenery’s tint', () => {
  it('lit, the grade alone; in the dark, the grade times the world over the veil', () => {
    const t = tones(1);
    expect(sceneryTint(0xffffff, t, 'lit')).toBe(0xffffff);
    expect(sceneryTint(0xd0c0ff, t, 'lit')).toBe(0xd0c0ff);
    expect(sceneryTint(0xffffff, t, 'dark')).toBe(t.ground);
    // Under the veil, an unlit prop ends where the ground does: at the world's tone.
    const total = rgbOfNumber(mul(sceneryTint(0xffffff, t, 'dark'), t.veil));
    const w = rgbOfNumber(t.world);
    expect(Math.abs(total.r - w.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(total.b - w.b)).toBeLessThanOrEqual(1);
    // A grade composes with it.
    expect(sceneryTint(0x808080, t, 'dark')).toBe(mul(0x808080, t.ground));
  });

  it('in a lamp’s disc, warm lamplight (the ground under it takes the same tone)', () => {
    expect(tones(0).lamp).toBe(0xffffff);
    const t = tones(1);
    expect(t.lamp).toBe(tintOfColor(LAMP_LIGHT));
    const lamp = rgbOfNumber(sceneryTint(0xffffff, t, 'lamp'));
    expect(lamp.r).toBeGreaterThan(lamp.g);
    expect(lamp.g).toBeGreaterThan(lamp.b);
    // Lamplight is light: far brighter than the dark round it.
    expect(lumOf(t.lamp)).toBeGreaterThan(10 * lumOf(t.world));
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

  it('is dark everywhere but the discs, and a pixel is lit iff the sim would light it', () => {
    const px = new Uint32Array(W * H);
    drawDarkMask(px, W, H, LEFT, TOP, origin, discs);
    const g: Vec2 = { x: 0, y: 0 };
    let lit = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        screenToGrid(x + 0.5 + LEFT, y + 0.5 + TOP, origin, g);
        const inside = discs.some((d) => (g.x - d.x) ** 2 + (g.y - d.y) ** 2 <= d.radiusSq + 1e-9);
        const outside = discs.every((d) => (g.x - d.x) ** 2 + (g.y - d.y) ** 2 > d.radiusSq - 1e-9);
        const v = px[y * W + x];
        if (v === MASK_LIT) lit++;
        if (inside && !outside) expect(v, `${x},${y}`).toBe(MASK_LIT);
        if (outside && !inside) expect(v, `${x},${y}`).toBe(MASK_DARK);
      }
    }
    // Each disc is an ellipse of about π·r²·(2·HALF_W·HALF_H) px (a tile is 256 px).
    expect(lit).toBeGreaterThan(0.9 * Math.PI * (2.25 + 4) * 256);
    expect(lit).toBeLessThan(1.1 * Math.PI * (2.25 + 4) * 256);
  });

  it('is opaque white where dark (the tint is the tone) and clear where lit (untouched)', () => {
    const bytes = (word: number) => [...new Uint8Array(new Uint32Array([word]).buffer)];
    expect(bytes(MASK_DARK)).toEqual([255, 255, 255, 255]);
    expect(bytes(MASK_LIT)).toEqual([0, 0, 0, 0]);
  });

  it('the lamplight mask is the dark mask’s lamp holes exactly, filled', () => {
    const dark = new Uint32Array(W * H);
    const lamp = new Uint32Array(W * H);
    drawDarkMask(dark, W, H, LEFT, TOP, origin, discs, 1);
    drawLampMask(lamp, W, H, LEFT, TOP, origin, discs, 1);
    for (let i = 0; i < W * H; i++) {
      expect(lamp[i]).toBe(dark[i] === MASK_LIT ? MASK_DARK : MASK_LIT);
    }
  });

  it('draws only the first `count` discs', () => {
    const px = new Uint32Array(W * H);
    drawDarkMask(px, W, H, LEFT, TOP, origin, discs, 0);
    expect(px.every((v) => v === MASK_DARK)).toBe(true);
  });
});
