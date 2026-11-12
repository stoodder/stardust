// The balance sims' run clock (assertion 13; conventions.md § Balance sims): this thread's CPU
// time in ms. Each sim worker is one thread, so other processes' load (another agent's gate) only
// slows the run's wall time, not its CPU time, and a real slowdown in the sim still shows.
// The clock reads in the reference machine's ms: on a slower machine (a CI runner) that declares
// itself with `SIM_CPU_SCALE` (≥ 1; the Deploy workflow sets it, architecture.md § 5), CPU time is
// divided by that scale, so assertion 13's budget means the same work everywhere.
import { performance } from 'node:perf_hooks';

/** The machine's declared CPU slowdown against the reference (`SIM_CPU_SCALE`, ≥ 1; else 1). */
export function simCpuScale(env: string | undefined = process.env.SIM_CPU_SCALE): number {
  if (env === undefined || env.trim() === '') return 1;
  const n = Number(env);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

const scale = simCpuScale();

/** This thread's raw CPU time (user + system) in ms, or wall time on a Node without it. */
const rawClockMs: () => number =
  'threadCpuUsage' in process
    ? () => {
        const u = process.threadCpuUsage();
        return (u.user + u.system) / 1000;
      }
    : () => performance.now();

/**
 * This thread's CPU time (user + system) in reference-machine ms (raw ms / `simCpuScale()`); on a
 * Node too old for `process.threadCpuUsage` (the engines floor, 22.6, may lack it), wall time, as
 * assertion 13 measured before.
 */
export const cpuClockMs: () => number = () => rawClockMs() / scale;
