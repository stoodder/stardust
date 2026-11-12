// The `npm run sim` work queue (T778; conventions.md § Balance sims, Sim time): every map's runs,
// one job per run, shared out over a pool of workers that each take the next job when they're
// free. A heavy map (the finale's ~70 runs) spreads over every core instead of holding one, and
// the campaign's last minutes aren't one map running alone. Generic over the worker, so the
// scheduling is unit-tested without threads (tools/simPool.test.ts); tools/sim.ts gives it
// worker threads (tools/simWorker.ts).
import type { RunRequest } from '../src/balance/checks.ts';

/** One run of one map: a job for any worker. */
export interface SimJob {
  readonly mapId: string;
  readonly req: RunRequest;
}

/** A map's planned runs (balance/harness.ts `planMap`), in its plan's order. */
export interface PlannedMap {
  readonly mapId: string;
  readonly requests: readonly RunRequest[];
}

/**
 * Every map's runs as jobs, slowest first: the later maps first (a campaign map is longer and
 * busier than the one before it; the finale is the heaviest), each map's runs in its plan's order.
 * A job is one run (≤ 2 s of CPU, assertion 13), so whatever ran last, the pool's workers finish
 * within about one run of each other.
 */
export function jobsSlowestFirst(maps: readonly PlannedMap[]): SimJob[] {
  return maps.toReversed().flatMap((m) => m.requests.map((req) => ({ mapId: m.mapId, req })));
}

/** A worker the pool hands jobs to, one at a time. */
export interface PoolWorker<J, R> {
  run(job: J): Promise<R>;
  close(): Promise<void>;
}

/**
 * Runs `jobs` on `workers`, each taking the next job in order when it's free, and calls `done`
 * with each result as it comes in. The first failure stops every worker taking more jobs and
 * rejects; the workers are closed either way.
 */
export async function runPool<J, R>(
  jobs: readonly J[],
  workers: readonly PoolWorker<J, R>[],
  done: (job: J, result: R) => void,
): Promise<void> {
  let next = 0;
  let failed = false;
  const drain = async (w: PoolWorker<J, R>): Promise<void> => {
    while (!failed && next < jobs.length) {
      const job = jobs[next++]!; // next < jobs.length
      try {
        // oxlint-disable-next-line no-await-in-loop -- a worker runs one job at a time; the pool's parallelism is across workers
        done(job, await w.run(job));
      } catch (err) {
        failed = true;
        throw err;
      }
    }
  };
  try {
    await Promise.all(workers.map(drain));
  } finally {
    await Promise.all(workers.map((w) => w.close()));
  }
}
