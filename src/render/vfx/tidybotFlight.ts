// The Tidybots' sweep (design/enemies.md § 8; core-loop.md § 6.7, the `tidybots` dial; art-direction
// §7): pure, on sim ticks, so a sweep holds still while paused and runs fast at 2×; unit-tested.
// views/TidybotView.ts draws it. After a wave resolves, the stardust specks its Skitterkin left are
// split among 1–3 drones (`planSweep`): each hovers in from the nearest map edge, vacuums its stops
// one after another (a speck is gone once the nozzle has worked its stop halfway), chimes at its
// last stop, and leaves by the nearest edge. Allocation-free per frame (`tidyPose` writes in place).
import type { Vec2 } from '../iso.ts';

/** At most this many drones per sweep, and stops per drone. */
export const TIDY_MAX_BOTS = 3;
export const TIDY_MAX_STOPS = 3;
/** About this many specks per drone: a few deaths bring one, a crowd three. */
export const TIDY_SPECKS_PER_BOT = 6;
/** The specks a battle keeps waiting for a sweep (older ones beyond it are swept unseen). */
export const TIDY_MAX_SPECKS = 48;
/** Each leg of a drone's sweep, in sim ticks (60 a second). */
export const TIDY_IN_TICKS = 72;
export const TIDY_HOP_TICKS = 30;
export const TIDY_VAC_TICKS = 48;
export const TIDY_CHIME_TICKS = 24;
export const TIDY_OUT_TICKS = 72;
/** Each drone after the first sets off this much later, so they don't arrive as one. */
export const TIDY_STAGGER_TICKS = 18;
/** How far past the map's edge a drone enters and leaves (grid units). */
export const TIDY_EDGE_OUT = 1.5;

/** One drone's route: in from `entry`, each stop vacuumed in turn, out to `exit` (grid points). */
export interface TidyPlan {
  readonly entry: Vec2;
  readonly stops: readonly Vec2[];
  readonly exit: Vec2;
  /** Its start, in ticks after the sweep began. */
  readonly delay: number;
}

/** A sweep: its drones, and which drone and stop clears each speck (`bot * TIDY_MAX_STOPS + stop`). */
export interface TidySweep {
  readonly plans: readonly TidyPlan[];
  readonly stopOf: readonly number[];
}

export type TidyPhase = 'waiting' | 'fly' | 'vacuum' | 'chime' | 'gone';

/** Where a drone is and what it's doing (`tidyPose` writes it). */
export interface TidyPose {
  x: number;
  y: number;
  phase: TidyPhase;
  /** How many of its stops it has cleared. */
  cleared: number;
}

/** A point just past the map's nearest edge from `p` (grid), on a `cols` × `rows` map. */
export function edgeNear(p: Vec2, cols: number, rows: number): Vec2 {
  const d = [p.x, cols - p.x, p.y, rows - p.y];
  const near = Math.min(...d);
  if (near === d[0]) return { x: -TIDY_EDGE_OUT, y: p.y };
  if (near === d[1]) return { x: cols + TIDY_EDGE_OUT, y: p.y };
  if (near === d[2]) return { x: p.x, y: -TIDY_EDGE_OUT };
  return { x: p.x, y: rows + TIDY_EDGE_OUT };
}

/** Splits `n` items into `k` contiguous runs as evenly as possible: each run's [start, end). */
function runs(n: number, k: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < k; i++) out.push([Math.floor((i * n) / k), Math.floor(((i + 1) * n) / k)]);
  return out;
}

/**
 * The sweep for `specks` (grid points) on a `cols` × `rows` map: none for no specks. The specks are
 * ordered across the screen (left to right, then top to bottom), cut into one run per drone, and
 * each run into up to TIDY_MAX_STOPS stops at their centroids.
 */
export function planSweep(specks: readonly Vec2[], cols: number, rows: number): TidySweep {
  const n = specks.length;
  if (n === 0) return { plans: [], stopOf: [] };
  const order = specks
    .map((p, i) => ({ i, sx: p.x - p.y, sy: p.x + p.y }))
    .toSorted((a, b) => a.sx - b.sx || a.sy - b.sy || a.i - b.i);
  const bots = Math.min(TIDY_MAX_BOTS, Math.ceil(n / TIDY_SPECKS_PER_BOT));
  const stopOf: number[] = Array.from({ length: n }, () => 0);
  const plans: TidyPlan[] = [];
  runs(n, bots).forEach(([from, to], bot) => {
    // Within a drone's run, visit top to bottom of the screen.
    const mine = order.slice(from, to).toSorted((a, b) => a.sy - b.sy || a.i - b.i);
    const count = Math.min(TIDY_MAX_STOPS, Math.ceil(mine.length / 2));
    const stops: Vec2[] = runs(mine.length, count).map(([a, b], stop) => {
      let x = 0;
      let y = 0;
      for (let j = a; j < b; j++) {
        const s = mine[j]!; // j < mine.length
        const p = specks[s.i]!; // s.i < n
        x += p.x;
        y += p.y;
        stopOf[s.i] = bot * TIDY_MAX_STOPS + stop;
      }
      return { x: x / (b - a), y: y / (b - a) };
    });
    const first = stops[0]!; // a run has at least one speck, so one stop
    const last = stops[stops.length - 1]!;
    plans.push({
      entry: edgeNear(first, cols, rows),
      stops,
      exit: edgeNear(last, cols, rows),
      delay: bot * TIDY_STAGGER_TICKS,
    });
  });
  return { plans, stopOf };
}

/** A drone's whole sweep, from its delay to gone (ticks). */
export function tidyTicks(plan: TidyPlan): number {
  const n = plan.stops.length;
  return (
    plan.delay +
    TIDY_IN_TICKS +
    n * TIDY_VAC_TICKS +
    (n - 1) * TIDY_HOP_TICKS +
    TIDY_CHIME_TICKS +
    TIDY_OUT_TICKS
  );
}

/** Smoothstep: the drone lifts off and settles rather than snapping. */
function ease(t: number): number {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return k * k * (3 - 2 * k);
}

function lerp(out: TidyPose, a: Vec2, b: Vec2, t: number): void {
  const e = ease(t);
  out.x = a.x + (b.x - a.x) * e;
  out.y = a.y + (b.y - a.y) * e;
}

/** Writes where `plan`'s drone is `ticks` after its sweep began into `out`. */
export function tidyPose(plan: TidyPlan, ticks: number, out: TidyPose): TidyPose {
  const n = plan.stops.length;
  let t = ticks - plan.delay;
  out.cleared = 0;
  if (t < 0 || n === 0) {
    out.phase = n === 0 ? 'gone' : 'waiting';
    out.x = plan.entry.x;
    out.y = plan.entry.y;
    return out;
  }
  let at = plan.entry;
  for (let i = 0; i < n; i++) {
    const stop = plan.stops[i]!; // i < n
    const legTicks = i === 0 ? TIDY_IN_TICKS : TIDY_HOP_TICKS;
    if (t < legTicks) {
      out.phase = 'fly';
      lerp(out, at, stop, t / legTicks);
      return out;
    }
    t -= legTicks;
    out.x = stop.x;
    out.y = stop.y;
    if (t < TIDY_VAC_TICKS) {
      out.phase = 'vacuum';
      out.cleared = i + (t >= TIDY_VAC_TICKS / 2 ? 1 : 0);
      return out;
    }
    t -= TIDY_VAC_TICKS;
    out.cleared = i + 1;
    at = stop;
  }
  if (t < TIDY_CHIME_TICKS) {
    out.phase = 'chime';
    return out;
  }
  t -= TIDY_CHIME_TICKS;
  if (t < TIDY_OUT_TICKS) {
    out.phase = 'fly';
    lerp(out, at, plan.exit, t / TIDY_OUT_TICKS);
    return out;
  }
  out.phase = 'gone';
  out.x = plan.exit.x;
  out.y = plan.exit.y;
  return out;
}
