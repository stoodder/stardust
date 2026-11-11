// The world's glow (vfx/glowPixels.ts; T530b): a prop's emissive pixels re-lit with a stepped halo,
// lamp pools that stay inside the sim's lit disc (D137: glow never reads as range), the Prism's
// crystal halo, and how strong each shines from dusk to the full dark.
import { describe, expect, it } from 'vitest';
import { PALETTES } from '../../content/palettes/index.ts';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { SPRITES } from '../../content/sprites/index.ts';
import { bakeSprite, DEFAULT_VARIANT, frameKey } from '../sprites/bake.ts';
import { HALF_H, HALF_W } from '../iso.ts';
import { GLOW_STEPS, type RgbaImage } from '../sprites/rasterize.ts';
import {
  emissiveGlow,
  glowAlpha,
  glowFrames,
  glowsOn,
  PAD_GLOW,
  poolImage,
  POOL_BANDS,
  prismHaloImage,
  PROP_GLOWS,
} from './glowPixels.ts';

/** A clear `w`×`h` frame with `color` painted at each of `at`. */
function frame(w: number, h: number, color: ColorName, at: readonly [number, number][]): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  const c = rgbOf(color);
  for (const [x, y] of at) {
    const i = (y * w + x) * 4;
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = 255;
  }
  return { w, h, data };
}

const alphaAt = (img: RgbaImage, x: number, y: number): number =>
  img.data[(y * img.w + x) * 4 + 3]!;

describe('prop glows', () => {
  it('re-light the emissive pixels in full and ring them with a stepped halo', () => {
    const f = frame(5, 5, 'gold.4', [[2, 2]]);
    const g = emissiveGlow([f], ['gold.4'], 3, 'orange.4');
    expect(g.w).toBe(11);
    expect(g.h).toBe(11);
    // The lit pixel itself (padded by the radius), in its own color, opaque.
    const i = (5 * 11 + 5) * 4;
    expect(Array.from(g.data.subarray(i, i + 4))).toEqual([...Object.values(rgbOf('gold.4')), 255]);
    // The halo steps down GLOW_STEPS by distance, in the halo's color, and stops at the radius.
    expect(alphaAt(g, 6, 5)).toBe(Math.round(255 * GLOW_STEPS[0]!));
    expect(alphaAt(g, 7, 5)).toBe(Math.round(255 * GLOW_STEPS[1]!));
    expect(alphaAt(g, 8, 5)).toBe(Math.round(255 * GLOW_STEPS[2]!));
    expect(alphaAt(g, 9, 5)).toBe(0);
    const o = rgbOf('orange.4');
    expect(Array.from(g.data.subarray((5 * 11 + 6) * 4, (5 * 11 + 6) * 4 + 3))).toEqual([
      o.r,
      o.g,
      o.b,
    ]);
  });

  it('ignore every color that gives no light, and are clear with none', () => {
    const f = frame(4, 4, 'steel.2', [[1, 1]]);
    const g = emissiveGlow([f], ['gold.4'], 2);
    expect(g.data.every((v) => v === 0)).toBe(true);
  });

  it('cover an animated prop wherever its light moves (the union of its frames)', () => {
    const a = frame(6, 3, 'violet.3', [[1, 1]]);
    const b = frame(6, 3, 'violet.4', [[4, 1]]);
    const g = emissiveGlow([a, b], ['violet.3', 'violet.4'], 1);
    expect(alphaAt(g, 2, 2)).toBe(255);
    expect(alphaAt(g, 5, 2)).toBe(255);
  });

  it('shine a little at dusk and fully in the dark', () => {
    for (const glow of Object.values(PROP_GLOWS)) {
      expect(glowAlpha(glow, 0)).toBe(glow.dusk);
      expect(glowAlpha(glow, 1)).toBe(1);
      expect(glow.dusk).toBeLessThan(0.5);
    }
    // The pads' brackets glow only in the dark.
    expect(glowAlpha(PAD_GLOW, 0)).toBe(0);
    expect(glowAlpha(PAD_GLOW, 0.5)).toBeCloseTo(0.5);
  });

  it('light the lamps, Dome 3’s window, the vats and the seams', () => {
    expect(PROP_GLOWS['prop.wall']?.frames).toEqual(['lamp_w', 'lamp_e']);
    expect(PROP_GLOWS['prop.dome']?.frames).toEqual(['window', 'open', 'frost_1', 'frost_2']);
    expect(PROP_GLOWS['prop.vat']?.unions?.[0]).toEqual(['v0', 'v1', 'v2']);
    expect(PROP_GLOWS['prop.seam']?.unions).toEqual([['v0', 'v1']]);
  });
});

/** A sprite's baked frame (default variant). */
function baked(id: string, frame: string): RgbaImage {
  const def = SPRITES.find((d) => d.id === id);
  if (def === undefined) throw new Error(`no ${id}`);
  const f = bakeSprite(def, PALETTES).frames.find(
    (b) => b.key === frameKey(id, DEFAULT_VARIANT, frame),
  );
  if (f === undefined) throw new Error(`no ${id}:${frame}`);
  return f.image;
}

/** How many pixels of `img` give light (re-lit opaque) in `glow`'s glow of `frames`. */
function litPixels(id: string, frames: readonly string[]): number {
  const glow = PROP_GLOWS[id]!;
  const g = emissiveGlow(
    frames.map((f) => baked(id, f)),
    glow.colors,
    glow.radius,
    glow.halo ?? null,
  );
  let n = 0;
  for (let i = 3; i < g.data.length; i += 4) if (g.data[i] === 255) n++;
  return n;
}

describe('M7’s world glows (T730b)', () => {
  it('lights the vats at full blaze over the blaze’s own frames', () => {
    const vat = PROP_GLOWS['prop.vat']!;
    expect(glowFrames(vat, 'blaze_1')).toEqual(['blaze_0', 'blaze_1', 'blaze_2']);
    expect(glowFrames(vat, 'v2')).toEqual(['v0', 'v1', 'v2']);
    // The overflow runs down the tank glow too: the blaze lights more than the churn.
    expect(litPixels('prop.vat', glowFrames(vat, 'blaze_0'))).toBeGreaterThan(
      litPixels('prop.vat', glowFrames(vat, 'v0')),
    );
    expect(glowFrames(PROP_GLOWS['prop.wall']!, 'lamp_w')).toEqual(['lamp_w']);
  });

  it('lights Dome 1’s open door through the frost, and not the Long Night’s dark domes', () => {
    const dome = PROP_GLOWS['prop.dome']!;
    for (const f of ['open', 'frost_1', 'frost_2']) {
      expect(glowsOn(dome, f), f).toBe(true);
      expect(litPixels('prop.dome', [f]), f).toBeGreaterThan(12);
    }
    // The frost rimes the slits: less light gets out.
    expect(litPixels('prop.dome', ['frost_2'])).toBeLessThan(litPixels('prop.dome', ['open']));
    expect(glowsOn(dome, 'dark')).toBe(false);
  });

  it('lights only the feed lines’ slurry among the wrecks', () => {
    const wreck = PROP_GLOWS['prop.wreckage']!;
    for (const f of ['v6', 'v7', 'v6_half']) {
      expect(glowsOn(wreck, f)).toBe(true);
      expect(litPixels('prop.wreckage', [f]), f).toBeGreaterThan(0);
    }
    for (const f of ['v0', 'v2', 'v4']) expect(glowsOn(wreck, f)).toBe(false);
  });
});

describe('lamp pools', () => {
  it('lie wholly inside the lit disc, in stepped bands, brightest at the source', () => {
    for (const r of [1.5, 2]) {
      const { img, ax, ay } = poolImage(r, 'orange.4');
      const alphas = new Set<number>();
      for (let y = 0; y < img.h; y++) {
        for (let x = 0; x < img.w; x++) {
          const a = alphaAt(img, x, y);
          if (a === 0) continue;
          alphas.add(a);
          // The pixel's ground point is inside the disc, short of its edge.
          const u = (x + 0.5 - ax) / HALF_W;
          const v = (y + 0.5 - ay) / HALF_H;
          const d = Math.hypot((u + v) / 2, (v - u) / 2);
          expect(d).toBeLessThanOrEqual(r * POOL_BANDS[POOL_BANDS.length - 1]!.share + 1e-9);
        }
      }
      // Only the ladder's steps (35%, 15%).
      expect([...alphas].toSorted((a, b) => a - b)).toEqual([38, 89]);
      expect(alphaAt(img, ax, ay)).toBe(89);
    }
  });

  it('a cold pool is fainter', () => {
    const { img, ax, ay } = poolImage(2, 'blue.4', 0.5);
    expect(alphaAt(img, ax, ay)).toBe(Math.round(255 * 0.5 * 0.35));
  });
});

describe('the Prism’s crystal halo', () => {
  it('is round, stepped, and fades to its edge', () => {
    const img = prismHaloImage(6, 'blue.4');
    expect(img.w).toBe(13);
    expect(alphaAt(img, 6, 6)).toBe(Math.round(255 * GLOW_STEPS[0]!));
    expect(alphaAt(img, 12, 6)).toBe(Math.round(255 * GLOW_STEPS[2]!));
    expect(alphaAt(img, 0, 0)).toBe(0);
    expect(alphaAt(img, 6, 0)).toBe(alphaAt(img, 0, 6));
  });
});
