// The balance sims' run clock (assertion 13; conventions.md § Balance sims): this thread's CPU
// time in ms. Each sim worker is one thread, so other processes' load (another agent's gate) only
// slows the run's wall time, not its CPU time, and a real slowdown in the sim still shows.
/** This thread's CPU time (user + system) in ms. */
export function cpuClockMs(): number {
  const u = process.threadCpuUsage();
  return (u.user + u.system) / 1000;
}
