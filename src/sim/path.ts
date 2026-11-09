// Route following (architecture.md § Entity model): an enemy's place on its route is the pair
// (seg, dist), and its position is derived from them. Only +, −, ×, ÷ on doubles (and the route
// lengths compile precomputed with the exactly rounded Math.sqrt), so results are bit-identical on
// every engine. Allocation-free: positions are written into the caller's object.
import type { CompiledRoute } from '../content/compiled.ts';

/** A mutable point in tiles. */
export interface Point {
  x: number;
  y: number;
}

/** Anything that walks a route: enemies now, route-following allies later. */
export interface RouteFollower extends Point {
  route: CompiledRoute | null;
  /** Distance traveled along the route, in tiles. */
  dist: number;
  /** The segment `dist` lies on: cumLenTiles[seg] ≤ dist < cumLenTiles[seg + 1]. */
  seg: number;
}

/**
 * The segment `dist` lies on, scanning forward from `fromSeg` (pass the follower's current seg:
 * movement is monotonic, so the scan is O(1) per tick). Clamped to [0, last segment]; a `dist` at
 * or past the end lies on the last segment.
 */
export function segmentAt(route: CompiledRoute, dist: number, fromSeg = 0): number {
  const cum = route.cumLenTiles;
  const lastSeg = cum.length - 2;
  if (lastSeg < 0) return 0;
  let seg = fromSeg < 0 ? 0 : fromSeg > lastSeg ? lastSeg : fromSeg;
  // Walk back first, so a stale or too-far hint still gives the right answer.
  while (seg > 0 && dist < cum[seg]!) seg--; // 0 < seg ≤ lastSeg < cum.length
  while (seg < lastSeg && dist >= cum[seg + 1]!) seg++; // seg + 1 ≤ lastSeg + 1 < cum.length
  return seg;
}

/**
 * Writes the route position at `dist` (clamped to [0, length]) into `out`, starting the segment
 * scan at `fromSeg`, and returns the segment. Lead targeting predicts with this too.
 */
export function pointAt(route: CompiledRoute, dist: number, out: Point, fromSeg = 0): number {
  const { xs, ys, cumLenTiles: cum } = route;
  const seg = segmentAt(route, dist, fromSeg);
  const x0 = xs[seg] ?? 0;
  const y0 = ys[seg] ?? 0;
  const start = cum[seg] ?? 0;
  const end = cum[seg + 1];
  if (end === undefined || end <= start) {
    out.x = x0;
    out.y = y0;
    return seg;
  }
  const d = dist <= start ? 0 : dist >= end ? end - start : dist - start;
  const t = d / (end - start);
  out.x = x0 + ((xs[seg + 1] ?? x0) - x0) * t;
  out.y = y0 + ((ys[seg + 1] ?? y0) - y0) * t;
  return seg;
}

/** Puts a follower on `route` at `dist` (0: its spawn tile's center), with seg and x, y derived. */
export function placeOnRoute(f: RouteFollower, route: CompiledRoute, dist = 0): void {
  f.route = route;
  f.dist = dist;
  f.seg = pointAt(route, dist, f, 0);
}

/** Distance left to the route's end ("first" targeting ranks by it, design/towers.md §5). */
export function remainingDist(f: RouteFollower): number {
  return f.route === null ? 0 : f.route.lengthTiles - f.dist;
}
