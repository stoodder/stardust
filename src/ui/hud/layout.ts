// Pure HUD layout math, in game pixels (the #ui box is 640×360).

export const UI_W = 640;
export const UI_H = 360;
/** Clear space between the HUD and the screen edge. */
export const EDGE = 4;
/** Horizontal gap between a tower's ground point and its panel (clears TOWER_BOX). */
const GAP = 14;
/** Vertical gap between a tower's box and a panel above or below it. */
const GAP_Y = 4;

/** A screen point in game pixels. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * A tower's footprint on screen, relative to its ground point (the tile center): the base and
 * the tallest head above it, a little inside the 32 px tile so a panel GAP px to the side clears.
 */
export const TOWER_BOX = { dx: -12, dy: -28, w: 24, h: 34 } as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** Whether the w×h panel at (left, top) overlaps the box of the tower standing at `p`. */
function covers(left: number, top: number, w: number, h: number, p: Point): boolean {
  const bx = p.x + TOWER_BOX.dx;
  const by = p.y + TOWER_BOX.dy;
  return left < bx + TOWER_BOX.w && bx < left + w && top < by + TOWER_BOX.h && by < top + h;
}

/**
 * Where the selected tower's panel goes (T126; art-direction § Look). The candidates, in order of
 * preference: beside the tower on the side away from the screen center, then the other side
 * (each level with the tower, then raised, then lowered by half the panel), then above and below
 * it (centered, then shifted left, then right). Each is clamped onto the screen. The first one
 * that covers none of the `others` (the other towers' ground points) wins; failing that, the one
 * covering the fewest. A candidate that covers the selected tower itself only wins when every
 * one does.
 */
export function placePanel(
  towerX: number,
  towerY: number,
  w: number,
  h: number,
  others: readonly Point[] = [],
): { left: number; top: number } {
  const self: Point = { x: towerX, y: towerY };
  const level = Math.round(towerY - h / 2 - 8);
  const leftX = towerX - GAP - w;
  const rightX = towerX + GAP;
  const sides = towerX < UI_W / 2 ? [leftX, rightX] : [rightX, leftX];
  const shiftsY = [0, -Math.round(h / 2), Math.round(h / 2)];
  const aboveY = towerY + TOWER_BOX.dy - GAP_Y - h;
  const belowY = towerY + TOWER_BOX.dy + TOWER_BOX.h + GAP_Y;
  const centerX = Math.round(towerX - w / 2);
  const shiftsX = [0, -Math.round(w / 2), Math.round(w / 2)];
  const candidates: [number, number][] = [];
  for (const x of sides) for (const dy of shiftsY) candidates.push([x, level + dy]);
  for (const y of [aboveY, belowY]) for (const dx of shiftsX) candidates.push([centerX + dx, y]);

  let best = { left: 0, top: 0 };
  let bestScore = Infinity;
  for (const [x, y] of candidates) {
    const left = clamp(x, EDGE, UI_W - EDGE - w);
    const top = clamp(y, EDGE, UI_H - EDGE - h);
    let score = covers(left, top, w, h, self) ? 1000 : 0;
    for (const p of others) if (covers(left, top, w, h, p)) score++;
    if (score < bestScore) {
      best = { left, top };
      bestScore = score;
      if (score === 0) break;
    }
  }
  return best;
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
