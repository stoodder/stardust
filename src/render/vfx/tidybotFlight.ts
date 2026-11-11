// The Tidybots' sweep (design/enemies.md § 8; core-loop.md § 6.7, the `tidybots` dial; art-direction
// §7): pure, on sim ticks, so a sweep holds still while paused and runs fast at 2×; unit-tested.
// views/TidybotView.ts draws it. After a wave resolves, the stardust specks its Skitterkin left are
// split among 1–3 drones (`planSweep`): each hovers in from the nearest map edge, vacuums its stops
// one after another (a speck is gone once the nozzle has worked its stop halfway), chimes at its
// last stop, and leaves by the nearest edge. Two drones never work the same spot: a stop within
// TIDY_STOP_GAP of another drone's is moved off to that distance (a pile of specks gets two
// drones side by side), which leaves every drone's timing as it was. Where the map's drones unload (A2M4's Intake B, the
// `unloading` dial; T501f, T530b), each one, after its chime, rises and flies to the hopper's
// mouth (`dock`, `tidyDock`: the one home of where that is), empties its load into it, and leaves by the edge nearest the hopper; the drones
// take turns at the mouth, a later one hovering at its last stop until the one before it is done.
// The chime keeps its tick either way (app/tidybotChimes.ts rings it from the same sums).
// Allocation-free per frame (`tidyPose` writes in place).
import type { TidybotMode } from '../../content/presentation.ts';
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
/** Unloading: the flight from the last stop up to the hopper's mouth, and the emptying. */
export const TIDY_DOCK_TICKS = 60;
export const TIDY_UNLOAD_TICKS = 72;
/** Each drone after the first sets off this much later, so they don't arrive as one. */
export const TIDY_STAGGER_TICKS = 18;
/** How far past the map's edge a drone enters and leaves (grid units). */
export const TIDY_EDGE_OUT = 1.5;
/** The nearest two drones' stops may be (grid units): no two drones hover on one spot. */
export const TIDY_STOP_GAP = 1;

/** The marker whose prop the drones unload into (A2M4's Intake B). */
export const UNLOAD_MARKER = 'intake_b';

/**
 * Where the drones unload (grid; the hopper's tile centre): the `intake_b` marker on a map whose
 * `tidybots` dial is `unloading`, else none (without the marker they sweep as everywhere else).
 * TidybotView flies them there and app/tidybotChimes.ts times their chimes from it.
 */
export function tidyDock(
  mode: TidybotMode,
  markers: Readonly<Record<string, readonly [number, number]>>,
): Vec2 | null {
  const intake = mode === 'unloading' ? markers[UNLOAD_MARKER] : undefined;
  return intake === undefined ? null : { x: intake[0] + 0.5, y: intake[1] + 0.5 };
}

/** One drone's route: in from `entry`, each stop vacuumed in turn, out to `exit` (grid points). */
export interface TidyPlan {
  readonly entry: Vec2;
  readonly stops: readonly Vec2[];
  readonly exit: Vec2;
  /** Its start, in ticks after the sweep began. */
  readonly delay: number;
  /** Where it unloads (grid; the hopper's ground point), when the map's drones unload. */
  readonly dock?: Vec2;
  /** Ticks it hovers at its last stop after chiming, waiting its turn at the dock. */
  readonly hold?: number;
}

/** A sweep: its drones, and which drone and stop clears each speck (`bot * TIDY_MAX_STOPS + stop`). */
export interface TidySweep {
  readonly plans: readonly TidyPlan[];
  readonly stopOf: readonly number[];
}

export type TidyPhase = 'waiting' | 'fly' | 'vacuum' | 'chime' | 'unload' | 'gone';

/** Where a drone is and what it's doing (`tidyPose` writes it). */
export interface TidyPose {
  x: number;
  y: number;
  phase: TidyPhase;
  /** How many of its stops it has cleared. */
  cleared: number;
  /**
   * How far up to the hopper's mouth it has risen (0: hovering over the ground, 1: at the mouth);
   * `tidyPose` always writes it.
   */
  lift?: number;
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

/** `v` kept inside a map `n` tiles across (on a tile's centre at the edges). */
function clamp(v: number, n: number): number {
  return Math.min(Math.max(v, 0.5), Math.max(n - 0.5, 0.5));
}

/**
 * Moves each drone's stops off every earlier drone's (in place) until none is nearer than
 * TIDY_STOP_GAP: straight away from the stop it crowds, or, on the very spot, to the screen's right
 * for odd drones and left for even ones; kept on the map (`cols` × `rows`), turning back if the
 * edge is in the way. A few passes at most; the stops' count and order never change.
 */
function spreadStops(bots: Vec2[][], cols: number, rows: number): void {
  for (let b = 1; b < bots.length; b++) {
    const side = b % 2 === 1 ? 1 : -1;
    const mine = bots[b]!; // b < length
    for (const stop of mine) {
      for (let pass = 0; pass < 4; pass++) {
        let moved = false;
        for (let o = 0; o < b; o++) {
          const theirs = bots[o]!; // o < b < length
          for (const q of theirs) {
            let dx = stop.x - q.x;
            let dy = stop.y - q.y;
            const d = Math.hypot(dx, dy);
            if (d >= TIDY_STOP_GAP - 1e-9) continue;
            if (d < 1e-6) {
              // Screen-right is +x −y on the grid.
              dx = side * Math.SQRT1_2;
              dy = -side * Math.SQRT1_2;
            } else {
              dx /= d;
              dy /= d;
            }
            let x = q.x + dx * TIDY_STOP_GAP;
            let y = q.y + dy * TIDY_STOP_GAP;
            if (clamp(x, cols) !== x || clamp(y, rows) !== y) {
              x = clamp(q.x - dx * TIDY_STOP_GAP, cols);
              y = clamp(q.y - dy * TIDY_STOP_GAP, rows);
            }
            stop.x = x;
            stop.y = y;
            moved = true;
          }
        }
        if (!moved) break;
      }
    }
  }
}

/**
 * The sweep for `specks` (grid points) on a `cols` × `rows` map: none for no specks. The specks are
 * ordered across the screen (left to right, then top to bottom), cut into one run per drone, and
 * each run into up to TIDY_MAX_STOPS stops at their centroids, spread so no two drones' stops are
 * nearer than TIDY_STOP_GAP (`spreadStops`). With a `dock` (the map's unloading hopper, grid),
 * every drone unloads there after its chime, in turn, and leaves from it.
 */
export function planSweep(
  specks: readonly Vec2[],
  cols: number,
  rows: number,
  dock: Vec2 | null = null,
): TidySweep {
  const n = specks.length;
  if (n === 0) return { plans: [], stopOf: [] };
  const order = specks
    .map((p, i) => ({ i, sx: p.x - p.y, sy: p.x + p.y }))
    .toSorted((a, b) => a.sx - b.sx || a.sy - b.sy || a.i - b.i);
  const bots = Math.min(TIDY_MAX_BOTS, Math.ceil(n / TIDY_SPECKS_PER_BOT));
  const stopOf: number[] = Array.from({ length: n }, () => 0);
  const botStops: Vec2[][] = runs(n, bots).map(([from, to], bot) => {
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
    return stops;
  });
  spreadStops(botStops, cols, rows);
  const plans: TidyPlan[] = botStops.map((stops, bot) => {
    const first = stops[0]!; // a run has at least one speck, so one stop
    const last = stops[stops.length - 1]!;
    return {
      entry: edgeNear(first, cols, rows),
      stops,
      exit: edgeNear(dock ?? last, cols, rows),
      delay: bot * TIDY_STAGGER_TICKS,
      ...(dock === null ? {} : { dock: { x: dock.x, y: dock.y }, hold: 0 }),
    };
  });
  return { plans: dock === null ? plans : queueAtDock(plans), stopOf };
}

/** The tick a drone's chime ends, from its sweep's start (its last stop's work done and rung). */
function chimeEnd(plan: TidyPlan): number {
  const n = plan.stops.length;
  return (
    plan.delay + TIDY_IN_TICKS + n * TIDY_VAC_TICKS + (n - 1) * TIDY_HOP_TICKS + TIDY_CHIME_TICKS
  );
}

/** Gives each drone the hold that keeps its turn at the dock from overlapping the one before's. */
function queueAtDock(plans: readonly TidyPlan[]): TidyPlan[] {
  let free = 0;
  return plans
    .map((plan, i) => ({ plan, i, arrive: chimeEnd(plan) + TIDY_DOCK_TICKS }))
    .toSorted((a, b) => a.arrive - b.arrive || a.i - b.i)
    .map(({ plan, i, arrive }) => {
      const hold = Math.max(0, free - arrive);
      free = arrive + hold + TIDY_UNLOAD_TICKS;
      return { i, plan: { ...plan, hold } };
    })
    .toSorted((a, b) => a.i - b.i)
    .map(({ plan }) => plan);
}

/** A drone's whole sweep, from its delay to gone (ticks). */
export function tidyTicks(plan: TidyPlan): number {
  const dock = plan.dock === undefined ? 0 : (plan.hold ?? 0) + TIDY_DOCK_TICKS + TIDY_UNLOAD_TICKS;
  return chimeEnd(plan) + dock + TIDY_OUT_TICKS;
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
  out.lift = 0;
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
  const dock = plan.dock;
  if (dock !== undefined) {
    // Its turn at the hopper: hover here till then, rise to the mouth, empty, and leave from it.
    const hold = plan.hold ?? 0;
    if (t < hold) {
      out.phase = 'fly';
      return out;
    }
    t -= hold;
    if (t < TIDY_DOCK_TICKS) {
      out.phase = 'fly';
      lerp(out, at, dock, t / TIDY_DOCK_TICKS);
      out.lift = ease(t / TIDY_DOCK_TICKS);
      return out;
    }
    t -= TIDY_DOCK_TICKS;
    out.x = dock.x;
    out.y = dock.y;
    out.lift = 1;
    if (t < TIDY_UNLOAD_TICKS) {
      out.phase = 'unload';
      return out;
    }
    t -= TIDY_UNLOAD_TICKS;
    at = dock;
  }
  if (t < TIDY_OUT_TICKS) {
    out.phase = 'fly';
    lerp(out, at, plan.exit, t / TIDY_OUT_TICKS);
    if (dock !== undefined) out.lift = 1 - ease(t / TIDY_OUT_TICKS);
    return out;
  }
  out.phase = 'gone';
  out.x = plan.exit.x;
  out.y = plan.exit.y;
  out.lift = 0;
  return out;
}
