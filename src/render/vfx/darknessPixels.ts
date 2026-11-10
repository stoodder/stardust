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
//   not a dead brown. The world's total is `ground` × `veil` (one image over the ground, one over
//   everything) or, for scenery, its tint × `veil`.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { HALF_H, HALF_W, type IsoOrigin } from '../iso.ts';
import type { Rgb } from './lighting.ts';

/** The night's ink the dark multiplies toward (`act2.dusk`'s near-black plum shade). */
export const NIGHT_SHADE: ColorName = 'act2.dusk.shade';
/**
 * How far toward NIGHT_SHADE full dark takes the world (the ground, the sky, the scenery): deep,
 * so the lit discs, the lamps and the glowing windows carry the picture (art-direction principle
 * 1: vibrant colors against deep darks).
 */
export const NIGHT_WORLD_STRENGTH = 0.88;
/**
 * How far toward NIGHT_SHADE full dark takes the actors (units, allies, towers, projectiles, the
 * effects): a light veil, so they keep their faction palettes and read over the dark ground.
 * Bars and tells draw above it in `overlay` and never darken.
 */
export const NIGHT_VEIL_STRENGTH = 0.22;
/** The night's lift: this share of NIGHT_SHADE added back over everything out of the light. */
export const NIGHT_LIFT = 0.45;

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
}

/** A fresh set of tones at no darkness (white multiplies, no lift). */
export function noDark(): DarkTones {
  return { world: 0xffffff, ground: 0xffffff, veil: 0xffffff, lift: 0 };
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** One channel's multiply `k` of the way from 255 toward `s`. */
const toward = (s: number, k: number): number => Math.round(255 + (s - 255) * k);

const pack = (r: number, g: number, b: number): number => (r << 16) | (g << 8) | b;

/** `a` over `b` per channel (×255, capped at 255): what's left of `a` once `b` has multiplied. */
const over = (a: number, b: number): number => Math.min(255, Math.round((255 * a) / Math.max(1, b)));

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
  return out;
}

/** The channels of a 0xRRGGBB number. */
export function rgbOfNumber(c: number): Rgb {
  return { r: (c >> 16) & 0xff, g: (c >> 8) & 0xff, b: c & 0xff };
}

/** Relative luminance (sRGB, 0–1) of a 0xRRGGBB color: how bright a multiply leaves white. */
export function lumOf(c: number): number {
  const lin = (v: number): number => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((c >> 16) & 0xff) + 0.7152 * lin((c >> 8) & 0xff) + 0.0722 * lin(c & 0xff);
}

/**
 * The tint a piece of scenery wears so that, under the veil, it ends up at `tones.world` times
 * the lighting grade `grade` (white for none): out of the light, `grade` × world ÷ veil; in it,
 * the grade alone (the hole leaves it lit).
 */
export function sceneryTint(grade: number, tones: DarkTones, lit: boolean): number {
  if (lit) return grade;
  const g = tones.ground;
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
  for (let i = 0; i < count; i++) {
    const d = discs[i]!; // i < count ≤ length
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
        if (dx * dx + dy * dy <= d.radiusSq) px[y * w + x] = MASK_LIT;
      }
    }
  }
}
