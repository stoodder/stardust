// When the Tidybots chime (T450; D126): render draws their sweep (render/views/TidybotView.ts),
// and this keeps the same books from the same events so the audio rings each drone's chime as its
// chime frame starts. Pure, on sim ticks (pause holds it, 2× runs it fast). A sweep's timing
// depends only on how many specks it sweeps (render/vfx/tidybotFlight.ts `planSweep`: how many
// drones, and how many stops each) and on whether its drones unload (A2M4's Intake B: each one
// takes its turn at the hopper after its chime, so the sweep ends later), so this counts specks
// rather than placing them, and plans with render's dock (`tidyDock`, as views/TidybotView.ts
// finds it).
import type { TidybotMode } from '../content/presentation.ts';
import type { Vec2 } from '../render/iso.ts';
import {
  planSweep,
  tidyTicks,
  TIDY_CHIME_TICKS,
  TIDY_DOCK_TICKS,
  TIDY_MAX_SPECKS,
  TIDY_OUT_TICKS,
  TIDY_UNLOAD_TICKS,
} from '../render/vfx/tidybotFlight.ts';

export interface TidyChimes {
  /** A Skitterkin died: its speck waits for the next sweep. */
  died(): void;
  /** Wave `wave` resolved at sim tick `tick`: a sweep starts (not after the map's last wave). */
  cleared(wave: number, tick: number): void;
  /** The map ended: no sweeps start, and chimes still to come are dropped. */
  ended(): void;
  /** Appends the drone index of each chime due by sim tick `tick` to `out` (each once). */
  due(tick: number, out: number[]): void;
}

const ORIGIN = { x: 0, y: 0 } as const;

/** The marker whose prop the drones unload into (views/TidybotView.ts `UNLOAD_MARKER`). */
const UNLOAD_MARKER = 'intake_b';

/**
 * Where the drones unload (grid; the hopper's tile centre), as TidybotView finds it: the
 * `intake_b` marker on a map whose `tidybots` dial is `unloading`, else none.
 */
export function tidyDock(
  mode: TidybotMode,
  markers: Readonly<Record<string, readonly [number, number]>>,
): Vec2 | null {
  const intake = mode === 'unloading' ? markers[UNLOAD_MARKER] : undefined;
  return intake === undefined ? null : { x: intake[0] + 0.5, y: intake[1] + 0.5 };
}

/**
 * The chimes for a battle whose Tidybots are `on` (the map's `tidybots` dial isn't `off`), whose
 * last wave is `lastWave` (its clear starts no sweep: Results come up instead), and whose drones
 * unload at `dock` (`tidyDock`), if anywhere.
 */
export function createTidyChimes(
  on: boolean,
  lastWave: number,
  dock: Vec2 | null = null,
): TidyChimes {
  /** Specks waiting for a sweep, and specks under the sweep in flight (their slots are taken). */
  let waiting = 0;
  let swept = 0;
  /** When the sweep in flight is over (sim tick), or -1 with none. */
  let sweepEnd = -1;
  let over = false;
  /** Chimes still to ring: [tick, drone]. */
  let chimes: [tick: number, bot: number][] = [];
  return {
    died() {
      // TidybotView's pool: a free slot, else a waiting speck's (the count holds), else unseen.
      if (on && waiting < TIDY_MAX_SPECKS - swept) waiting++;
    },
    cleared(wave, tick) {
      if (!on || over || wave >= lastWave || sweepEnd >= 0 || waiting === 0) return;
      const sweep = planSweep(
        Array.from({ length: waiting }, () => ORIGIN),
        1,
        1,
        dock,
      );
      sweep.plans.forEach((plan, bot) => {
        const end = tidyTicks(plan);
        // Its chime comes before its turn at the dock, if it unloads (its hold, rise, and emptying).
        const unload =
          plan.dock === undefined ? 0 : (plan.hold ?? 0) + TIDY_DOCK_TICKS + TIDY_UNLOAD_TICKS;
        chimes.push([tick + end - TIDY_OUT_TICKS - unload - TIDY_CHIME_TICKS, bot]);
        sweepEnd = Math.max(sweepEnd, tick + end);
      });
      swept = waiting;
      waiting = 0;
    },
    ended() {
      over = true;
      chimes = [];
    },
    due(tick, out) {
      if (sweepEnd >= 0 && tick >= sweepEnd) {
        sweepEnd = -1;
        swept = 0;
      }
      if (chimes.length === 0) return;
      for (const [at, bot] of chimes) if (at <= tick) out.push(bot);
      chimes = chimes.filter(([at]) => at > tick);
    },
  };
}
