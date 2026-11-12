// The `npm run sim` work queue (T778; conventions.md § Balance sims, Sim time): every map's runs,
// one job per run, shared out over a pool of workers that each take their next job when they're
// free. A heavy map (the finale's ~70 runs) spreads over every free core instead of holding one,
// so the campaign's last minutes aren't one map running alone. Generic over the worker, so the
// scheduling is unit-tested without threads (tools/simPool.test.ts); tools/sim.ts gives it worker
// threads (tools/simWorker.ts).
import { runKey, type RunRecord, type RunRequest } from '../src/balance/checks.ts';
import { firstSeedOf, reuseSeed } from '../src/balance/harness.ts';

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

/** `take`'s answer when no job is ready yet, but one may be once a job in flight finishes. */
export const WAIT: unique symbol = Symbol('wait');

/**
 * Where a pool's workers get their jobs: the next job for worker `w`, undefined when done, or
 * WAIT when every job left waits for one in flight (a later seed for its seed 1; D157).
 */
export interface JobSource<J> {
  take(w: number): J | undefined | typeof WAIT;
}

/**
 * Whether a job runs now, is never needed (`skip`: a later seed whose seed 1 drew no random number,
 * which the judge copies; balance/harness.ts `reuseSeed`), or waits for a job in flight (`wait`).
 */
export type JobGate<J> = (job: J) => 'run' | 'skip' | 'wait';

/**
 * Every map's runs as jobs, slowest map first (the later maps: a campaign map is mostly longer
 * and busier than the ones before it, and the finale is the heaviest), with **map affinity**: a
 * worker keeps taking its map's runs, in its plan's order; when its map has none left it starts the
 * next map nobody has started, and once every map is started it joins the one with the most runs
 * left. So each worker runs few maps (with every worker on every map, the sim took ~10% more CPU,
 * its runs ~7% more: V8 kept re-optimizing for the next map; T778), and the workers still finish
 * within about one run (≤ 2 s of CPU, assertion 13) of each other. With a `gate`, a lane's next
 * job is its first one the gate lets run (dropping the ones it skips, passing over the ones that
 * wait); a lane whose jobs all wait counts as busy, and when every lane left is, `take` says WAIT.
 */
export function mapAffinity(
  maps: readonly PlannedMap[],
  gate: JobGate<SimJob> = () => 'run',
): JobSource<SimJob> {
  const lanes = maps.toReversed().map((m) => ({ mapId: m.mapId, left: [...m.requests] }));
  let started = 0;
  const lane = new Map<number, number>();
  /** Lane `at`'s first job the gate lets run, taken out (skipped ones dropped), or undefined. */
  const pull = (w: number, at: number): SimJob | undefined => {
    const l = lanes[at]!; // `at` indexes lanes
    for (let i = 0; i < l.left.length;) {
      const job = { mapId: l.mapId, req: l.left[i]! }; // i < length
      const g = gate(job);
      if (g === 'wait') {
        i++;
        continue;
      }
      l.left.splice(i, 1);
      if (g === 'skip') continue;
      lane.set(w, at);
      return job;
    }
    return undefined;
  };
  return {
    take(w) {
      const mine = lane.get(w);
      if (mine !== undefined) {
        const job = pull(w, mine);
        if (job !== undefined) return job;
      }
      while (started < lanes.length) {
        const job = pull(w, started++);
        if (job !== undefined) return job;
      }
      // Every map is started: join the one with the most runs left that has one ready.
      const order = [...lanes.keys()]
        .filter((i) => lanes[i]!.left.length > 0)
        .toSorted((a, b) => lanes[b]!.left.length - lanes[a]!.left.length); // stable: earlier lane first
      for (const i of order) {
        const job = pull(w, i);
        if (job !== undefined) return job;
      }
      return lanes.some((l) => l.left.length > 0) ? WAIT : undefined;
    },
  };
}

/**
 * The seed-reuse gate (D157): a build's later seed waits for its seed 1 (when the map plans one),
 * then is skipped if that run drew no random number (the judge copies it, balance/harness.ts
 * `reuseSeed`), else runs. `recordOf` gives a map's finished record by run key, or undefined.
 */
export function seedReuseGate(
  maps: readonly PlannedMap[],
  recordOf: (mapId: string, key: string) => RunRecord | undefined,
): JobGate<SimJob> {
  const planned = new Set(maps.flatMap((m) => m.requests.map((r) => `${m.mapId} ${runKey(r)}`)));
  return ({ mapId, req }) => {
    const first = firstSeedOf(req);
    if (first === null || !planned.has(`${mapId} ${runKey(first)}`)) return 'run';
    const rec = recordOf(mapId, runKey(first));
    if (rec === undefined) return 'wait';
    return reuseSeed(rec, req) === null ? 'run' : 'skip';
  };
}

/** Each map's runs with its later seeds last (`firstSeedOf`), so they find their seed 1 done. */
export function firstSeedsFirst(maps: readonly PlannedMap[]): PlannedMap[] {
  return maps.map((m) => ({
    mapId: m.mapId,
    requests: [
      ...m.requests.filter((r) => firstSeedOf(r) === null),
      ...m.requests.filter((r) => firstSeedOf(r) !== null),
    ],
  }));
}

/** A worker the pool hands jobs to, one at a time. */
export interface PoolWorker<J, R> {
  run(job: J): Promise<R>;
  close(): Promise<void>;
}

/**
 * Runs the source's jobs on `workers` (worker `w` takes `source.take(w)` whenever it's free) and
 * calls `done` with each result as it comes in. A worker told to WAIT idles until the next job in
 * flight finishes (after its `done`), then asks again; a WAIT with nothing in flight is a bug in
 * the source and rejects. The first failure stops every worker taking more jobs and rejects; the
 * workers are closed either way.
 */
export async function runPool<J, R>(
  source: JobSource<J>,
  workers: readonly PoolWorker<J, R>[],
  done: (job: J, result: R) => void,
): Promise<void> {
  let failed = false;
  let inFlight = 0;
  let waiting: (() => void)[] = [];
  const settled = (): void => {
    const wake = waiting;
    waiting = [];
    for (const f of wake) f();
  };
  const drain = async (worker: PoolWorker<J, R>, w: number): Promise<void> => {
    while (!failed) {
      const job = source.take(w);
      if (job === undefined) return;
      if (job === WAIT) {
        if (inFlight === 0) throw new Error('sim pool: every job left waits, and none is running');
        // oxlint-disable-next-line no-await-in-loop -- idle until a job in flight finishes
        await new Promise<void>((resolve) => waiting.push(resolve));
        continue;
      }
      inFlight++;
      try {
        // oxlint-disable-next-line no-await-in-loop -- a worker runs one job at a time; the pool's parallelism is across workers
        done(job, await worker.run(job));
      } catch (err) {
        failed = true;
        throw err;
      } finally {
        inFlight--;
        settled();
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
