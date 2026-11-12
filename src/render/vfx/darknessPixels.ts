// Sundown's darkness, the pure part (art-direction.md §7, *Darkness and lighting overlay*; T505,
// T530b; sim/darkness.ts holds the rules). DarknessView draws it.
//
// - **The light map** is a mask the size of the view: opaque white everywhere but the light
//   sources' discs, which are clear. A hole is exactly the sim's lit disc, a circle in grid space
//   round the source (an ellipse on screen), tested per pixel against the sim's own squared radius,
//   so a tower drawn inside a hole is a tower the sim keeps at full range (D137: lit on screen = lit
//   in the sim). The mask changes only when the sources do; the dark's tone is the tint its images
//   wear (a multiply over a clear pixel leaves it untouched), so an easing dark costs no redraw.
// - **The tones.** The night darkens the world much more than the actors (D134: the grade dims the
//   world, not the actors; art-direction principle 1, deep darks): the world (the ground, the sky
//   behind it, and the scenery) goes most of the way to `NIGHT_SHADE`, the actors only take a light
//   veil, and a faint lift of the same plum over everything keeps the blacks a deep night violet,
//   not a dead brown: the deep plum of art-direction §3's Act II close. The world's total is
//   `ground` × `veil` (one image over the ground, one over everything) or, for scenery, its tint ×
//   `veil`.
// - **Lamplight.** Inside a lamp's disc the ground and the scenery take a warm lamp tone (`lamp`;
//   a second mask, opaque only in the lamps' discs), so a lamp-lit pool reads as lamplight at night,
//   not as a patch of daylight; a beaming Prism's disc stays clear (its light is the Aelari's
//   own). The actors are never toned (D134).
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { HALF_H, HALF_W, type IsoOrigin } from '../iso.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import type { Rgb } from './lighting.ts';

/** The night's ink the dark multiplies toward (`act2.dusk`'s near-black plum shade). */
export const NIGHT_SHADE: ColorName = 'act2.dusk.shade';
/**
 * How far toward NIGHT_SHADE full dark takes the world (the ground, the sky, the scenery): deep,
 * so the lit discs, the lamps and the glowing windows carry the picture (art-direction principle
 * 1: vibrant colors against deep darks).
 */
export const NIGHT_WORLD_STRENGTH = 0.92;
/**
 * How far toward NIGHT_SHADE full dark takes the actors (units, allies, towers, projectiles, the
 * effects): a light veil, so they keep their faction palettes and read over the dark ground.
 * Bars and tells draw above it in `overlay` and never darken.
 */
export const NIGHT_VEIL_STRENGTH = 0.22;
/** The night's lift: this share of NIGHT_SHADE added back over everything out of the light. */
export const NIGHT_LIFT = 0.6;
/** Lamplight's tone: the ground in a lamp's disc multiplies toward it as the dark falls. */
export const LAMP_LIGHT: ColorName = 'orange.4';

/** The night's tones at a darkness, each a 0xRRGGBB Phaser tint. */
export interface DarkTones {
  /** The world's whole multiply (the ground's image × the veil). */
  world: number;
  /** The multiply over the ground: the world's over the veil's. */
  ground: number;
  /** The multiply over everything (the actors' veil). */
  veil: number;
  /** The additive lift over everything out of the light. */
  lift: number;
  /** The multiply over the ground and the scenery in a lamp's disc (lamplight). */
  lamp: number;
}

/** A fresh set of tones at no darkness (white multiplies, no lift). */
export function noDark(): DarkTones {
  return { world: 0xffffff, ground: 0xffffff, veil: 0xffffff, lift: 0, lamp: 0xffffff };
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** One channel's multiply `k` of the way from 255 toward `s`. */
const toward = (s: number, k: number): number => Math.round(255 + (s - 255) * k);

const pack = (r: number, g: number, b: number): number => (r << 16) | (g << 8) | b;

/** `a` over `b` per channel (×255, capped at 255): what's left of `a` once `b` has multiplied. */
const over = (a: number, b: number): number =>
  Math.min(255, Math.round((255 * a) / Math.max(1, b)));

/** Writes the night's tones at darkness `dark` (0–1) into `out` (no allocation). */
export function darkTones(dark: number, out: DarkTones): DarkTones {
  const k = clamp01(dark);
  const s = rgbOf(NIGHT_SHADE);
  const wr = toward(s.r, NIGHT_WORLD_STRENGTH * k);
  const wg = toward(s.g, NIGHT_WORLD_STRENGTH * k);
  const wb = toward(s.b, NIGHT_WORLD_STRENGTH * k);
  const vr = toward(s.r, NIGHT_VEIL_STRENGTH * k);
  const vg = toward(s.g, NIGHT_VEIL_STRENGTH * k);
  const vb = toward(s.b, NIGHT_VEIL_STRENGTH * k);
  out.world = pack(wr, wg, wb);
  out.veil = pack(vr, vg, vb);
  out.ground = pack(over(wr, vr), over(wg, vg), over(wb, vb));
  const l = NIGHT_LIFT * k;
  out.lift = pack(Math.round(s.r * l), Math.round(s.g * l), Math.round(s.b * l));
  const lamp = rgbOf(LAMP_LIGHT);
  out.lamp = pack(toward(lamp.r, k), toward(lamp.g, k), toward(lamp.b, k));
  return out;
}

/** The channels of a 0xRRGGBB number. */
export function rgbOfNumber(c: number): Rgb {
  return { r: (c >> 16) & 0xff, g: (c >> 8) & 0xff, b: c & 0xff };
}

/** One sRGB channel (0–255), linearized. */
function lin(v: number): number {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance (sRGB, 0–1) of a 0xRRGGBB color: how bright a multiply leaves white. */
export function lumOf(c: number): number {
  return 0.2126 * lin((c >> 16) & 0xff) + 0.7152 * lin((c >> 8) & 0xff) + 0.0722 * lin(c & 0xff);
}

/** Where a piece of scenery stands: out of the light, in a lamp's disc, or lit otherwise. */
export type SceneryLight = 'dark' | 'lamp' | 'lit';

/**
 * The tint a piece of scenery wears so that it ends up where the ground under it does: out of the
 * light, `grade` × world ÷ veil (the veil does the rest); in a lamp's disc, `grade` × the lamp's
 * tone; lit otherwise (a beaming Prism's), the grade alone. `grade` is the lighting grade (white
 * for none).
 */
export function sceneryTint(grade: number, tones: DarkTones, light: SceneryLight): number {
  if (light === 'lit') return grade;
  const g = light === 'lamp' ? tones.lamp : tones.ground;
  const ch = (shift: number): number =>
    Math.round((((grade >> shift) & 0xff) * ((g >> shift) & 0xff)) / 255);
  return pack(ch(16), ch(8), ch(0));
}

/** One light source's disc: its grid centre and squared radius (the sim's). */
export interface LightDisc {
  x: number;
  y: number;
  radiusSq: number;
}

/** An opaque white pixel, and a clear one, as little-endian RGBA words (an ImageData's view). */
export const MASK_DARK = 0xffffffff;
export const MASK_LIT = 0;

/**
 * Draws the light map's mask into `px` (`w`×`h`, row-major, a Uint32 view of RGBA bytes): opaque
 * white everywhere, then clear over every pixel whose centre lies in a disc (grid distance ≤
 * radius on the ground plane). The buffer's (0, 0) sits at screen (`left`, `top`) (the overhang).
 */
export function drawDarkMask(
  px: Uint32Array,
  w: number,
  h: number,
  left: number,
  top: number,
  origin: IsoOrigin,
  discs: readonly LightDisc[],
  count: number = discs.length,
): void {
  px.fill(MASK_DARK);
  stampDiscs(px, w, h, left, top, origin, discs, 0, count, MASK_LIT);
}

/**
 * Draws the lamplight mask into `px` (as drawDarkMask): clear everywhere, opaque white over every
 * pixel in one of the first `lamps` discs (the map's lamps), exactly as the dark mask clears them.
 */
export function drawLampMask(
  px: Uint32Array,
  w: number,
  h: number,
  left: number,
  top: number,
  origin: IsoOrigin,
  discs: readonly LightDisc[],
  lamps: number,
): void {
  px.fill(MASK_LIT);
  stampDiscs(px, w, h, left, top, origin, discs, 0, lamps, MASK_DARK);
}

/** Writes `word` over every pixel of `px` whose centre lies in one of `discs[from..to)`. */
export function stampDiscs(
  px: Uint32Array,
  w: number,
  h: number,
  left: number,
  top: number,
  origin: IsoOrigin,
  discs: readonly LightDisc[],
  from: number,
  to: number,
  word: number,
): void {
  for (let i = from; i < to; i++) {
    const d = discs[i]!; // i < to ≤ length
    const r = Math.sqrt(d.radiusSq);
    const cx = (d.x - d.y) * HALF_W + origin.x - left;
    const cy = (d.x + d.y) * HALF_H + origin.y - top;
    const ex = r * Math.SQRT2 * HALF_W + 1;
    const ey = r * Math.SQRT2 * HALF_H + 1;
    const x0 = Math.max(0, Math.floor(cx - ex));
    const x1 = Math.min(w - 1, Math.ceil(cx + ex));
    const y0 = Math.max(0, Math.floor(cy - ey));
    const y1 = Math.min(h - 1, Math.ceil(cy + ey));
    for (let y = y0; y <= y1; y++) {
      const v = (y + 0.5 + top - origin.y) / HALF_H;
      for (let x = x0; x <= x1; x++) {
        const u = (x + 0.5 + left - origin.x) / HALF_W;
        const dx = (u + v) / 2 - d.x;
        const dy = (v - u) / 2 - d.y;
        if (dx * dx + dy * dy <= d.radiusSq) px[y * w + x] = word;
      }
    }
  }
}

/**
 * The ghost disc's dots (D139 S6): one rim pixel lit in every GHOST_DOT_PERIOD round the rim, so
 * the light's promise reads as a dotted gold ring, apart from the pale dashes of the range rings
 * and the links' tethers.
 */
export const GHOST_DOT_PERIOD = 3;
/**
 * The ghost disc's dots alternate these two golds (the light's warm gold, never a range's pale):
 * the pale one carries the ring on A2M6's daylight sand, the deep one keeps it gold in the dark.
 */
export const GHOST_COLORS: readonly [ColorName, ColorName] = ['gold.4', 'gold.3'];
/** The ghost's dots carry a 1 px under-stroke (the range rings'), so they read on gold ground. */
export const GHOST_UNDER: ColorName = 'ink.0';

/** A ghost disc's pixels, and the pixel corner its source's ground point sits on. */
export interface GhostDisc {
  readonly image: RgbaImage;
  readonly cx: number;
  readonly cy: number;
}

/**
 * The ghost of a light source's disc (review R9: a Prism at rest, and the placement preview of
 * one): only its rim, dotted in `colors`, so it promises light without reading as lit. The rim is
 * the edge of exactly the disc the dark mask clears (the same per-pixel test, `stampDiscs`): the
 * disc's pixels with a 4-neighbour outside it. Walked round by angle on the ground plane, every
 * GHOST_DOT_PERIOD-th rim pixel is a dot (D139 S6), alternating GHOST_COLORS, each over a 1 px `ink.0` under-stroke where
 * the pixel under it is clear (as the range rings carry), so the dots read on A2M6's gold before
 * the dark. The source's ground point is the image's pixel corner (`cx`, `cy`), as a tile centre
 * lands on a pixel corner on screen. Its inside stays clear but for those under-strokes: nothing
 * under a ghost lightens (D137: a rim only, never a hole or a pool). Baked once per radius.
 */
export function ghostDiscImage(
  radiusSq: number,
  colors: readonly [ColorName, ColorName] = GHOST_COLORS,
): GhostDisc {
  const r = Math.sqrt(Math.max(0, radiusSq));
  const cx = Math.ceil(r * Math.SQRT2 * HALF_W) + 2;
  const cy = Math.ceil(r * Math.SQRT2 * HALF_H) + 2;
  const w = 2 * cx;
  const h = 2 * cy;
  const inside = new Uint32Array(w * h);
  const disc: LightDisc = { x: 0, y: 0, radiusSq };
  stampDiscs(inside, w, h, 0, 0, { x: cx, y: cy }, [disc], 0, 1, 1);
  const data = new Uint8ClampedArray(w * h * 4);
  const dot = new Uint8Array(w * h);
  const cs = [rgbOf(colors[0]), rgbOf(colors[1])] as const;
  const isIn = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < w && y < h && inside[y * w + x] === 1;
  // The rim's pixels, by their angle on the ground plane (the screen ellipse un-squashed).
  const rim: { readonly o: number; readonly a: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isIn(x, y)) continue;
      if (isIn(x - 1, y) && isIn(x + 1, y) && isIn(x, y - 1) && isIn(x, y + 1)) continue;
      rim.push({ o: (y * w + x) * 4, a: Math.atan2((y + 0.5 - cy) * 2, x + 0.5 - cx) });
    }
  }
  rim.sort((p, q) => p.a - q.a);
  for (let i = 0, n = 0; i < rim.length; i += GHOST_DOT_PERIOD, n++) {
    const o = rim[i]!.o; // i < length
    const c = cs[n % 2]!; // 0 or 1
    dot[o / 4] = 1;
    data[o] = c.r;
    data[o + 1] = c.g;
    data[o + 2] = c.b;
    data[o + 3] = 255;
  }
  // The under-strokes, bottom-up, so one never lands on a dot.
  const u = rgbOf(GHOST_UNDER);
  for (let y = h - 1; y >= 1; y--) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const above = o - w * 4;
      if (data[o + 3] !== 0 || dot[above / 4] !== 1) continue;
      data[o] = u.r;
      data[o + 1] = u.g;
      data[o + 2] = u.b;
      data[o + 3] = 255;
    }
  }
  return { image: { w, h, data }, cx, cy };
}
