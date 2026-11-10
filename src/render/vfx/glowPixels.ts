// The world's glow, the pure part (art-direction.md §7, *Glow and bloom*; T530b): the light the
// world's own lamps and windows give off, which props don't bake (their art paints the emissive
// pixels; render adds the glow). WorldGlowView draws it.
//
// - **Prop glows** (`PROP_GLOWS`): a prop's emissive pixels, found by their master colors in its
//   frame (every frame of an animated prop, so the churning slurry's glow covers wherever it
//   turns), re-lit at full strength and ringed by a halo in stepped alpha (GLOW_STEPS), drawn just
//   in front of the prop in `world`, so an actor in front of it still hides it. Each glows a
//   little at dusk and fully in the dark (`glowAlpha`): A2M6's wall lamps and Dome 3's window
//   (Pebble asleep in the lettuce), A2M4's violet vats and gold seams.
// - **Lamp pools** (`poolImage`): inside a light source's lit disc, warm light pooled round it in
//   stepped bands that stop short of the disc's edge, so the light falls off toward the edge while
//   the edge itself, the sim's lit range, stays hard and exact (D137: glow never reads as range).
// - **The Prism's crystal**: a cool halo on a beaming Prism Spire's crystal (`prismHaloImage`).
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { GLOW_STEPS } from '../sprites/rasterize.ts';
import { HALF_H, HALF_W } from '../iso.ts';
import type { Rgb } from './lighting.ts';

/** One prop's glow: which of its pixels give light, and how it shines. */
export interface PropGlow {
  /** The frames that glow (any frame when absent). */
  readonly frames?: readonly string[];
  /** The frames whose emissive pixels make one glow (an animated prop's anim). */
  readonly union?: readonly string[];
  /** The master colors that give light. */
  readonly colors: readonly ColorName[];
  /** The halo's reach (px), stepped down GLOW_STEPS. */
  readonly radius: number;
  /** The halo's own color (its nearest emissive pixel's when absent). */
  readonly halo?: ColorName;
  /** How strong it shines at dusk (no darkness); full in the dark. */
  readonly dusk: number;
}

/** The props that glow, by sprite id (art-direction §6 per prop; T540c painted the light). */
export const PROP_GLOWS: Readonly<Record<string, PropGlow>> = {
  // A2M6's wall lamps: the lantern on each gatepost, warm (they stay on all night).
  'prop.wall': {
    frames: ['lamp_w', 'lamp_e'],
    colors: ['gold.3', 'gold.4', 'white.1'],
    radius: 4,
    halo: 'gold.4',
    dusk: 0.35,
  },
  // A2M6's Dome 3: its round window, warm, the lettuce and Pebble asleep in it lit by it.
  'prop.dome': {
    frames: ['window'],
    colors: ['gold.4', 'green.3', 'green.2', 'coral.3', 'coral.4'],
    radius: 5,
    halo: 'orange.4',
    dusk: 0.25,
  },
  // A2M4's vats: the slurry, cold violet (unsung), wherever it churns.
  'prop.vat': {
    union: ['v0', 'v1', 'v2'],
    colors: ['violet.3', 'violet.4'],
    radius: 3,
    halo: 'violet.3',
    dusk: 0.35,
  },
  // A2M4's seams: the stardust veins in the cliff, warm gold flushed pink (sung).
  'prop.seam': {
    union: ['v0', 'v1'],
    colors: ['gold.3', 'gold.4', 'pink.3'],
    radius: 2,
    dusk: 0.3,
  },
};

/**
 * The buildable pads' teal corner brackets (Everglow plates): they glow faintly in the dark only,
 * so where a tower can go still reads at night (art-direction §8, *Tile readability*).
 */
export const PAD_GLOW: PropGlow & { readonly sprite: string; readonly peak: number } = {
  sprite: 'tile.pad',
  colors: ['teal.3'],
  radius: 1,
  dusk: 0,
  peak: 0.7,
};

/** A glow's alpha at darkness `dark` (0–1): its dusk strength at none, full in the dark. */
export function glowAlpha(glow: { readonly dusk: number }, dark: number): number {
  const k = Math.min(1, Math.max(0, dark));
  return glow.dusk + (1 - glow.dusk) * k;
}

const sameRgb = (data: Uint8ClampedArray, i: number, c: Rgb): boolean =>
  data[i] === c.r && data[i + 1] === c.g && data[i + 2] === c.b;

/**
 * The glow of `frames` (one prop's frames, all the same size): every opaque pixel in any frame
 * whose color is one of `colors` gives light; it is re-lit at full strength in its own color, and
 * the halo round the lit pixels steps down GLOW_STEPS out to `radius` px, in `halo` (or the
 * nearest lit pixel's color). Padded by `radius` on every side: draw it with its anchor at the
 * frame's anchor + `radius`. Empty (all clear) when nothing gives light.
 */
export function emissiveGlow(
  frames: readonly RgbaImage[],
  colors: readonly ColorName[],
  radius: number,
  halo: ColorName | null = null,
): RgbaImage {
  const first = frames[0];
  const fw = first?.w ?? 0;
  const fh = first?.h ?? 0;
  const w = fw + 2 * radius;
  const h = fh + 2 * radius;
  const data = new Uint8ClampedArray(w * h * 4);
  const lights = colors.map(rgbOf);
  /** Each source pixel's color, by its padded index (later frames fill only empty ones). */
  const src = new Map<number, Rgb>();
  for (const f of frames) {
    for (let y = 0; y < Math.min(fh, f.h); y++) {
      for (let x = 0; x < Math.min(fw, f.w); x++) {
        const i = (y * f.w + x) * 4;
        if ((f.data[i + 3] ?? 0) === 0) continue;
        const c = lights.find((l) => sameRgb(f.data, i, l));
        const at = (y + radius) * w + x + radius;
        if (c !== undefined && !src.has(at)) src.set(at, c);
      }
    }
  }
  if (src.size === 0) return { w, h, data };
  const sources = [...src.entries()].map(([at, c]) => ({ x: at % w, y: Math.floor(at / w), c }));
  const haloRgb = halo === null ? null : rgbOf(halo);
  const lastStep = GLOW_STEPS.length - 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const own = src.get(y * w + x);
      const i = (y * w + x) * 4;
      if (own !== undefined) {
        data[i] = own.r;
        data[i + 1] = own.g;
        data[i + 2] = own.b;
        data[i + 3] = 255;
        continue;
      }
      let best = Infinity;
      let near: Rgb | null = null;
      for (const s of sources) {
        const d2 = (s.x - x) * (s.x - x) + (s.y - y) * (s.y - y);
        if (d2 < best) {
          best = d2;
          near = s.c;
        }
      }
      const d = Math.round(Math.sqrt(best));
      if (near === null || d > radius || d < 1) continue;
      const c = haloRgb ?? near;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = Math.round(255 * (GLOW_STEPS[Math.min(d - 1, lastStep)] ?? 0));
    }
  }
  return { w, h, data };
}

/** The bands of a lamp's pool: out to each share of its disc's radius, at each alpha. */
export const POOL_BANDS: readonly { readonly share: number; readonly alpha: number }[] = [
  { share: 0.35, alpha: 0.35 },
  { share: 0.65, alpha: 0.15 },
  // The outer band is dithered at 15% (every other pixel), and it stops short of the edge.
  { share: 0.85, alpha: -0.15 },
];

/**
 * The pool of light round a source of `radiusTiles` (its lit disc), in `color`: stepped bands
 * (POOL_BANDS) by grid distance from its centre, every one inside the disc. The image's centre
 * pixel (`ax`, `ay`) sits on the source's ground point. A negative alpha is a 50% dither of it.
 * `strength` scales every band (a cold light pools fainter: it washes warm ground grey).
 */
export function poolImage(
  radiusTiles: number,
  color: ColorName,
  strength = 1,
): { readonly img: RgbaImage; readonly ax: number; readonly ay: number } {
  const ex = Math.ceil(radiusTiles * Math.SQRT2 * HALF_W) + 1;
  const ey = Math.ceil(radiusTiles * Math.SQRT2 * HALF_H) + 1;
  const w = 2 * ex;
  const h = 2 * ey;
  const data = new Uint8ClampedArray(w * h * 4);
  const c = rgbOf(color);
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5 - ey) / HALF_H;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5 - ex) / HALF_W;
      const gx = (u + v) / 2;
      const gy = (v - u) / 2;
      const d = Math.sqrt(gx * gx + gy * gy) / radiusTiles;
      const band = POOL_BANDS.find((b) => d <= b.share);
      if (band === undefined) continue;
      if (band.alpha < 0 && (x + y) % 2 === 1) continue;
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = Math.round(255 * strength * Math.abs(band.alpha));
    }
  }
  return { img: { w, h, data }, ax: ex, ay: ey };
}

/** The Prism's crystal halo: a small cool disc stepped down GLOW_STEPS, centred at (r, r). */
export function prismHaloImage(radius: number, color: ColorName): RgbaImage {
  const w = 2 * radius + 1;
  const data = new Uint8ClampedArray(w * w * 4);
  const c = rgbOf(color);
  const lastStep = GLOW_STEPS.length - 1;
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      // A 2:1 halo would read as ground light; the crystal's is round, in the air.
      const d = Math.round(Math.hypot(x - radius, y - radius));
      if (d > radius) continue;
      const step = Math.max(0, d - (radius - GLOW_STEPS.length));
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = Math.round(255 * (GLOW_STEPS[Math.min(step, lastStep)] ?? 0));
    }
  }
  return { w, h: w, data };
}
