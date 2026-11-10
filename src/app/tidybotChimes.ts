// When the Tidybots chime (T450; D126): render draws their sweep (render/views/TidybotView.ts),
// and this keeps the same books from the same events so the audio rings each drone's chime as its
// chime frame starts. Pure, on sim ticks (pause holds it, 2× runs it fast). A sweep's timing
// depends only on how many specks it sweeps (render/vfx/tidybotFlight.ts `planSweep`: how many
// drones, and how many stops each), so this counts specks rather than placing them.
import {
  planSweep,
  tidyTicks,
  TIDY_CHIME_TICKS,
  TIDY_MAX_SPECKS,
  TIDY_OUT_TICKS,
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

/**
 * The chimes for a battle whose Tidybots are `on` (the map's `tidybots` dial isn't `off`) and
 * whose last wave is `lastWave` (its clear starts no sweep: Results come up instead).
 */
export function createTidyChimes(on: boolean, lastWave: number): TidyChimes {
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
      );
      sweep.plans.forEach((plan, bot) => {
        const end = tidyTicks(plan);
        chimes.push([tick + end - TIDY_OUT_TICKS - TIDY_CHIME_TICKS, bot]);
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
