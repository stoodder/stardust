// The `npm run sim` work queue (T778; conventions.md § Balance sims, Sim time): every map's runs,
// one job per run, shared out over a pool of workers that each take their next job when they're
// free. A heavy map (the finale's ~70 runs) spreads over every free core instead of holding one,
// so the campaign's last minutes aren't one map running alone. Generic over the worker, so the
// scheduling is unit-tested without threads (tools/simPool.test.ts); tools/sim.ts gives it worker
// threads (tools/simWorker.ts).
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

/** Where a pool's workers get their jobs: the next job for worker `w`, or undefined when done. */
export interface JobSource<J> {
  take(w: number): J | undefined;
}

/**
 * Every map's runs as jobs, slowest map first (the later maps: a campaign map is mostly longer
 * and busier than the ones before it, and the finale is the heaviest), with **map affinity**: a
 * worker keeps taking its map's runs, in its plan's order; when its map has none left it starts the
 * next map nobody has started, and once every map is started it joins the one with the most runs
 * left. So each worker runs few maps (with every worker on every map, the sim took ~10% more CPU,
 * its runs ~7% more: V8 kept re-optimizing for the next map; T778), and the workers still finish
 * within about one run (≤ 2 s of CPU, assertion 13) of each other.
 */
export function mapAffinity(maps: readonly PlannedMap[]): JobSource<SimJob> {
  const lanes = maps.toReversed().map((m) => ({ mapId: m.mapId, left: [...m.requests] }));
  let started = 0;
  const lane = new Map<number, number>();
  const next = (w: number, at: number): SimJob | undefined => {
    lane.set(w, at);
    const l = lanes[at]!; // `at` indexes lanes
    const req = l.left.shift();
    return req === undefined ? undefined : { mapId: l.mapId, req };
  };
  return {
    take(w) {
      const mine = lane.get(w);
      if (mine !== undefined && lanes[mine]!.left.length > 0) return next(w, mine);
      if (started < lanes.length) return next(w, started++);
      let most = -1;
      for (const [i, l] of lanes.entries()) {
        if (l.left.length > 0 && (most < 0 || l.left.length > lanes[most]!.left.length)) most = i;
      }
      return most < 0 ? undefined : next(w, most);
    },
  };
}

/** A worker the pool hands jobs to, one at a time. */
export interface PoolWorker<J, R> {
  run(job: J): Promise<R>;
  close(): Promise<void>;
}

/**
 * Runs the source's jobs on `workers` (worker `w` takes `source.take(w)` whenever it's free) and
 * calls `done` with each result as it comes in. The first failure stops every worker taking more
 * jobs and rejects; the workers are closed either way.
 */
export async function runPool<J, R>(
  source: JobSource<J>,
  workers: readonly PoolWorker<J, R>[],
  done: (job: J, result: R) => void,
): Promise<void> {
  let failed = false;
  const drain = async (worker: PoolWorker<J, R>, w: number): Promise<void> => {
    while (!failed) {
      const job = source.take(w);
      if (job === undefined) return;
      try {
        // oxlint-disable-next-line no-await-in-loop -- a worker runs one job at a time; the pool's parallelism is across workers
        done(job, await worker.run(job));
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

/** A source over a fixed list, every worker taking the next job in order (tests, small pools). */
export function inOrder<J>(jobs: readonly J[]): JobSource<J> {
  let i = 0;
  return { take: () => jobs[i++] };
}
