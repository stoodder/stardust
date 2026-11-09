// Integer scaling (docs/art/tech-spec.md § Tile and screen).

export const VIEW_W = 640;
export const VIEW_H = 360;

/** The integer scale factor n, computed in device pixels so fractional DPRs stay crisp. */
export function computeScale(innerWidth: number, innerHeight: number, dpr: number): number {
  return Math.max(
    1,
    Math.floor(Math.min((innerWidth * dpr) / VIEW_W, (innerHeight * dpr) / VIEW_H)),
  );
}

/** CSS-pixel zoom for a scale factor: each game pixel covers exactly n device pixels. */
export function cssZoom(scale: number, dpr: number): number {
  return scale / dpr;
}
