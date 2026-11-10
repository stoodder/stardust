// The balance sims' run clock (assertion 13; conventions.md § Balance sims): this thread's CPU
// time in ms. Each sim worker is one thread, so other processes' load (another agent's gate) only
// slows the run's wall time, not its CPU time, and a real slowdown in the sim still shows.
import { performance } from 'node:perf_hooks';

/**
 * This thread's CPU time (user + system) in ms; on a Node too old for `process.threadCpuUsage`
 * (the engines floor, 22.6, may lack it), wall time, as assertion 13 measured before.
 */
export const cpuClockMs: () => number =
  'threadCpuUsage' in process
    ? () => {
        const u = process.threadCpuUsage();
        return (u.user + u.system) / 1000;
      }
    : () => performance.now();
