// The keyboard tile cursor (T126; architecture.md § Rendering, Input): where an arrow key moves
// it. Pure, so the rule is unit-tested; the cursor's state lives in BattleInteraction and the
// arrow keys reach it through app/commands.ts `moveCursor`.
//
// The rule: an arrow picks the nearest target in its screen direction. Distances are measured on
// the screen with vertical pixels counted double (an iso tile is twice as wide as it is tall, so
// one tile step is the same "distance" whichever way it goes on screen). A target counts as "in
// the direction" if it lies within 45° of it in that measure (so the iso diagonals, the tiles
// that share an edge with this one, count for both of the arrows they sit between); only when
// nothing lies in that cone does anything at all on that side count. Among those, the score is
// the distance along the arrow plus half the distance off the line the cursor started moving on
// (the anchor, kept while the same axis repeats), so repeated presses travel a straight screen
// line, zig-zagging over the tiles on it instead of drifting off it. Ties go to the target that
// changes the row for Up and Down and the column for Left and Right (so a first press follows a
// grid axis), then to the lower tile index. Nothing on that side: the cursor stays put.
//
// Targets: the buildable tiles (pads, high ground, power nodes, so every tower too); while an
// ability is aimed, every tile on the map (a strike lands on paths).
import { HALF_H, HALF_W } from '../iso.ts';

export type CursorDir = 'up' | 'down' | 'left' | 'right';
export type CursorAxis = 'h' | 'v';

/** Where the cursor goes, and the anchor line it travels on. */
export interface CursorMove {
  /** The new tile index (the same as `from` when nothing lies that way). */
  readonly index: number;
  readonly axis: CursorAxis;
  /** The anchor line's coordinate (the measure's y for Left/Right, x for Up/Down). */
  readonly anchor: number;
}

/** The axis an arrow moves along. */
export function axisOf(dir: CursorDir): CursorAxis {
  return dir === 'left' || dir === 'right' ? 'h' : 'v';
}

/** Weight of the distance off the anchor line in the score. */
const OFF_LINE_WEIGHT = 0.5;
/** Added to a target outside the 45° cone, so any target inside it wins. */
const OUT_OF_CONE = 1e6;

/** A tile's position in the measure: screen x, and screen y counted double. */
function measureX(col: number, row: number): number {
  return (col - row) * HALF_W;
}
function measureY(col: number, row: number): number {
  return (col + row) * HALF_H * 2;
}

/**
 * The anchor coordinate for a move along `axis` from tile (col, row): the measure's y for a
 * horizontal move, x for a vertical one.
 */
export function anchorOf(axis: CursorAxis, col: number, row: number): number {
  return axis === 'h' ? measureY(col, row) : measureX(col, row);
}

/**
 * One arrow press from tile `from` on a `cols`-wide map of `count` tiles. `isTarget(i)` says
 * which tiles the cursor can land on. `prev` is the last move's axis and anchor (null after the
 * cursor appeared or jumped), so a repeated axis keeps its line.
 */
export function cursorStep(
  cols: number,
  count: number,
  from: number,
  dir: CursorDir,
  isTarget: (index: number) => boolean,
  prev: { readonly axis: CursorAxis; readonly anchor: number } | null = null,
): CursorMove {
  const axis = axisOf(dir);
  const fc = from % cols;
  const fr = (from - fc) / cols;
  const anchor = prev !== null && prev.axis === axis ? prev.anchor : anchorOf(axis, fc, fr);
  const fx = measureX(fc, fr);
  const fy = measureY(fc, fr);
  const sign = dir === 'right' || dir === 'down' ? 1 : -1;
  let best = from;
  let bestScore = Infinity;
  let bestTie = Infinity;
  for (let i = 0; i < count; i++) {
    if (i === from || !isTarget(i)) continue;
    const c = i % cols;
    const r = (i - c) / cols;
    const x = measureX(c, r);
    const y = measureY(c, r);
    const along = sign * (axis === 'h' ? x - fx : y - fy);
    if (along <= 0) continue;
    const across = Math.abs(axis === 'h' ? y - fy : x - fx);
    const off = Math.abs((axis === 'h' ? y : x) - anchor);
    const score = along + OFF_LINE_WEIGHT * off + (across > along ? OUT_OF_CONE : 0);
    // A first press follows a grid axis: rows for Up/Down, columns for Left/Right.
    const tie = axis === 'v' ? Math.abs(c - fc) : Math.abs(r - fr);
    if (score < bestScore || (score === bestScore && tie < bestTie)) {
      best = i;
      bestScore = score;
      bestTie = tie;
    }
  }
  return { index: best, axis, anchor };
}

/**
 * Where the cursor appears when it's hidden: `preferred` if it's a target, else the target
 * nearest to it (or to the map's middle when `preferred` is −1), in the same measure. −1 when the
 * map has no targets.
 */
export function cursorStart(
  cols: number,
  rows: number,
  preferred: number,
  isTarget: (index: number) => boolean,
): number {
  const count = cols * rows;
  if (preferred >= 0 && preferred < count && isTarget(preferred)) return preferred;
  let px: number;
  let py: number;
  if (preferred >= 0 && preferred < count) {
    const c = preferred % cols;
    px = measureX(c, (preferred - c) / cols);
    py = measureY(c, (preferred - c) / cols);
  } else {
    px = measureX((cols - 1) / 2, (rows - 1) / 2);
    py = measureY((cols - 1) / 2, (rows - 1) / 2);
  }
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < count; i++) {
    if (!isTarget(i)) continue;
    const c = i % cols;
    const r = (i - c) / cols;
    const d = Math.hypot(measureX(c, r) - px, measureY(c, r) - py);
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
}
