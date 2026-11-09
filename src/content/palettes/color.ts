// Color math for palette rules: luminance contrast (path vs pad) and the Hollow hue reservation.

export interface RgbLike {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** sRGB channel (0–255) to linear light. */
function lin(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance (sRGB, Rec. 709 weights), 0–1. */
export function luminance(c: RgbLike): number {
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** WCAG-style contrast ratio between two luminances (always ≥ 1). */
export function contrastRatio(l1: number, l2: number): number {
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Hue in degrees (0–360), saturation and value (0–1). */
export function hsv(c: RgbLike): { h: number; s: number; v: number } {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s: max === 0 ? 0 : d / max, v: max };
}

/**
 * The Hollow's reserved hue (art-direction §2): saturated yellow-green, hue 60–85°, HSV
 * saturation above 60%, value above 50%. Only Hollow palettes and sprites may use it.
 */
export function isHollowReserved(c: RgbLike): boolean {
  const { h, s, v } = hsv(c);
  return h >= 60 && h <= 85 && s > 0.6 && v > 0.5;
}
