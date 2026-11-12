// Floating text that never piles up (T334, T332): a new floater (a credit number, a link callout,
// Gerald's "RECIPIENT: ARMED.") that would overlap one already up steps a text row higher, up to
// FLOAT_STACK_ROWS rows; a spot already that full drops it. So a build's cost and a link's callout
// read apart, and a test's fast-forward (a minute of events in one frame) shows a short stack, not
// a smear. Pure, so the rule is unit-tested; TransientFx calls it as each floater spawns.

/** One text row: the 3×5 font's 5 px, its 1 px outline above and below. */
export const FLOAT_ROW_PX = 7;
/** Floaters stacked on one spot at most (the first, and two rows above it). */
export const FLOAT_STACK_ROWS = 3;
/** Clear space kept between two floaters side by side, in px. */
const GAP_PX = 1;

/** A floater as the stack reads it: its center x, its baseline y as drawn now, and its width. */
export interface FloatSlot {
  readonly active: boolean;
  readonly cx: number;
  readonly baseY: number;
  readonly w: number;
}

function overlapping(
  slots: readonly FloatSlot[],
  cx: number,
  baseY: number,
  w: number,
): FloatSlot | null {
  let hit: FloatSlot | null = null;
  for (const s of slots) {
    if (!s.active) continue;
    if (Math.abs(s.cx - cx) * 2 >= s.w + w + GAP_PX * 2) continue;
    if (Math.abs(s.baseY - baseY) >= FLOAT_ROW_PX) continue;
    // The highest one it touches: stepping above it clears the rest of that column.
    if (hit === null || s.baseY < hit.baseY) hit = s;
  }
  return hit;
}

/**
 * The baseline y for a new floater `w` px wide centered at `cx` with its baseline at `baseY`:
 * `baseY` where it's clear, else a row above the floater it would overlap, up to
 * FLOAT_STACK_ROWS rows in all; null when the spot is full (the floater is dropped).
 */
export function stackFloat(
  slots: readonly FloatSlot[],
  cx: number,
  baseY: number,
  w: number,
): number | null {
  let y = baseY;
  for (let row = 0; row < FLOAT_STACK_ROWS; row++) {
    const hit = overlapping(slots, cx, y, w);
    if (hit === null) return y;
    y = hit.baseY - FLOAT_ROW_PX;
  }
  return null;
}

// One pop per unit (T803b; D153's declutter): a number rising where one of its own kind is still in
// the first part of its rise merges into it ("−225", "−120", "−150" over one tower's upgrades read
// "−495"; three leaks at the gate, "−3"), and a callout already up near the same spot isn't drawn
// again (three Harmony links formed by one build: one HARMONY).

/** Floaters rising from points this close on the grid (tiles) are the same target's. */
export const SAME_TARGET_TILES = 0.25;
/** A callout already up within this many tiles of a new one with the same words keeps it. */
export const SAME_CALLOUT_TILES = 2;

/** A floater's signed amount ("−150" → −150, "+40" → 40), or null for words ("CROSSFIRE!"). */
export function floatAmount(text: string): number | null {
  const m = /^([+−-])(\d+)$/.exec(text);
  if (m === null) return null;
  const n = Number(m[2]);
  return m[1] === '+' ? n : -n;
}

/** An amount in a floater's words: "+40", "−150" (the typographic minus, as the events float). */
export function amountText(n: number): string {
  return n < 0 ? `−${-n}` : `+${n}`;
}

/** Whether grid points (ax, ay) and (bx, by) are within `tiles` of each other. */
export function withinTiles(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  tiles: number,
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy <= tiles * tiles;
}
