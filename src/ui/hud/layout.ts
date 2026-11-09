// Pure HUD layout math, in game pixels (the #ui box is 640×360).

export const UI_W = 640;
export const UI_H = 360;
/** Clear space between the HUD and the screen edge. */
export const EDGE = 4;
/** Horizontal gap between a tower and its panel. */
const GAP = 14;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * Where the selected tower's panel goes (art-direction § Look): beside the tower, on the side away
 * from the screen center, or the other side if it doesn't fit there; clamped onto the screen.
 */
export function placePanel(
  towerX: number,
  towerY: number,
  w: number,
  h: number,
): { left: number; top: number } {
  const leftSide = towerX - GAP - w;
  const rightSide = towerX + GAP;
  const preferLeft = towerX < UI_W / 2;
  const fitsLeft = leftSide >= EDGE;
  const fitsRight = rightSide + w <= UI_W - EDGE;
  const left = (preferLeft ? fitsLeft || !fitsRight : !fitsRight && fitsLeft)
    ? leftSide
    : rightSide;
  return {
    left: clamp(left, EDGE, UI_W - EDGE - w),
    top: clamp(Math.round(towerY - h / 2 - 8), EDGE, UI_H - EDGE - h),
  };
}

/**
 * One step of a counter that ticks toward its target instead of jumping (art-direction § Look):
 * it covers any gap in about `durationMs`, at least 1 per step.
 */
export function tickToward(shown: number, target: number, dtMs: number, durationMs = 250): number {
  const diff = target - shown;
  if (diff === 0) return shown;
  const step = Math.max(1, Math.ceil((Math.abs(diff) * Math.max(dtMs, 0)) / durationMs));
  return Math.abs(diff) <= step ? target : shown + Math.sign(diff) * step;
}
