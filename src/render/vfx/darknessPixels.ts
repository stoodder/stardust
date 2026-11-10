// Sundown's darkness overlay, the pure part (art-direction.md §7, *Darkness and lighting overlay*;
// T505; sim/darkness.ts holds the rules): a light map the size of the view, filled with the dark's
// tone and punched out (white, so the multiply leaves it untouched) wherever a light source lights
// the ground. A hole is exactly the sim's lit disc, a circle in grid space round the source
// (an ellipse on screen), tested per pixel against the sim's own squared radius, so a tower drawn
// inside a hole is a tower the sim keeps at full range (D137: lit on screen = lit in the sim).
// DarknessView applies it with multiply blend in the `lighting` layer.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { HALF_H, HALF_W, type IsoOrigin } from '../iso.ts';
import type { Rgb } from './lighting.ts';

/** The night's ink the dark multiplies toward (`act2.dusk`'s near-black plum shade). */
export const DARK_SHADE: ColorName = 'act2.dusk.shade';
/**
 * How far toward DARK_SHADE full dark goes: the world (and the actors in it) at about half their
 * value in a cold plum, so a lit circle reads at a glance and the units still read in the dark.
 * Bars and tells draw above it in `overlay` and never darken.
 */
export const DARK_SHADE_STRENGTH = 0.6;

/** The multiply tone at darkness `dark` (0–1): white at 0, DARK_SHADE_STRENGTH toward the shade at 1. */
export function darkTone(dark: number): Rgb {
  const s = rgbOf(DARK_SHADE);
  const k = DARK_SHADE_STRENGTH * Math.min(1, Math.max(0, dark));
  return {
    r: Math.round(255 + (s.r - 255) * k),
    g: Math.round(255 + (s.g - 255) * k),
    b: Math.round(255 + (s.b - 255) * k),
  };
}

/** One light source's disc: its grid centre and squared radius (the sim's). */
export interface LightDisc {
  x: number;
  y: number;
  radiusSq: number;
}

/** An opaque pixel of `c` as one little-endian RGBA word (an ImageData's Uint32 view). */
export function packPixel(c: Rgb): number {
  return ((255 << 24) | (c.b << 16) | (c.g << 8) | c.r) >>> 0;
}

const WHITE = 0xffffffff;

/**
 * Draws the light map into `px` (`w`×`h`, row-major, a Uint32 view of RGBA bytes): `tone`
 * everywhere, then white over every pixel whose centre lies in a disc (grid distance ≤ radius on
 * the ground plane). The buffer's (0, 0) sits at screen (`left`, `top`) (the overhang).
 */
export function drawDarkness(
  px: Uint32Array,
  w: number,
  h: number,
  left: number,
  top: number,
  origin: IsoOrigin,
  tone: Rgb,
  discs: readonly LightDisc[],
  count: number = discs.length,
): void {
  px.fill(packPixel(tone));
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
        if (dx * dx + dy * dy <= d.radiusSq) px[y * w + x] = WHITE;
      }
    }
  }
}
