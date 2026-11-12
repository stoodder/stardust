// The sim CLI's work queue (tools/simPool.ts, T778): jobs slowest first, each run once by the first
// free worker, a failure stopping the pool; and a map judged from records that crossed a thread
// (structured clones, as a worker's replies are) reports exactly what `runMap` does.
import { describe, expect, it } from 'vitest';
import { runKey, type RunRequest } from '../src/balance/checks.ts';
import { FLAG_VARIANT_CONTENT } from '../src/balance/__fixtures__/fireControl.ts';
import { judgeMap, mapRunner, planMap, runMap } from '../src/balance/harness.ts';
import {
  inOrder,
  mapAffinity,
  runPool,
  WAIT,
  type JobSource,
  type PoolWorker,
  type SimJob,
} from './simPool.ts';

/** A job as 'map build#seed', '-' for none, or 'wait'. */
const jobName = (j: SimJob | undefined | typeof WAIT): string =>
  j === undefined ? '-' : j === WAIT ? 'wait' : `${j.mapId} ${runKey(j.req)}`;
/** Job 0 takes 40 ms, the rest 2 ms. */
const zeroIsLong = (job: number): number => (job === 0 ? 40 : 2);
const req = (build: string, seed = 1): RunRequest => ({ build, seed });

/** A fake worker: each job takes `cost(job)` ms; it records what it ran and whether it's closed. */
function fakeWorker(name: string, cost: (job: number) => number, log: string[]) {
  let closed = false;
  const w: PoolWorker<number, string> & { readonly closed: () => boolean } = {
    run: (job) =>
      new Promise((resolve, reject) => {
        if (job < 0) {
          reject(new Error(`job ${job} failed`));
          return;
        }
        setTimeout(() => {
          log.push(`${name}:${job}`);
          resolve(`${job}`);
        }, cost(job));
      }),
    close: () => {
      closed = true;
      return Promise.resolve();
    },
    closed: () => closed,
  };
  return w;
}

describe('the sim work queue (T778)', () => {
  it('starts the later maps first, keeps each worker on its map, then joins the fullest', () => {
    const maps = [
      { mapId: 'a1_m01', requests: [req('par'), req('none')] },
      { mapId: 'a1_m02', requests: [req('par')] },
      { mapId: 'a1_m03', requests: [1, 2, 3, 4, 5].map((n) => req('par', n)) },
    ];
    const src = mapAffinity(maps);
    const took = (w: number) => jobName(src.take(w));
    // Workers 0 and 1 start the two latest maps; worker 0 stays on a1_m03.
    expect(took(0)).toBe('a1_m03 par#1');
    expect(took(1)).toBe('a1_m02 par#1');
    expect(took(0)).toBe('a1_m03 par#2');
    // a1_m02 is done: worker 1 starts the next unstarted map, a1_m01.
    expect(took(1)).toBe('a1_m01 par#1');
    expect(took(1)).toBe('a1_m01 none#1');
    // Every map is started and worker 1's is done: it joins the one with the most runs left.
    expect(took(1)).toBe('a1_m03 par#3');
    expect(took(0)).toBe('a1_m03 par#4');
    expect(took(1)).toBe('a1_m03 par#5');
    expect(took(0)).toBe('-');
    expect(took(1)).toBe('-');
  });

  it('gives every planned run exactly once, whatever the workers’ timing', () => {
    const maps = ['a', 'b', 'c', 'd'].map((mapId, i) => ({
      mapId,
      requests: Array.from({ length: 3 + 2 * i }, (_, n) => req('par', n + 1)),
    }));
    const src = mapAffinity(maps);
    const seen: string[] = [];
    // A fixed, uneven interleaving of three workers.
    const order = [0, 1, 2, 0, 0, 2, 1, 1, 1, 0, 2, 2, 2, 0, 1];
    for (let k = 0; seen.length < 24 && k < 200; k++) {
      const job = src.take(order[k % order.length]!);
      if (job !== undefined && job !== WAIT) seen.push(`${job.mapId} ${runKey(job.req)}`);
    }
    const all = maps.flatMap((m) => m.requests.map((r) => `${m.mapId} ${runKey(r)}`));
    expect(seen.toSorted()).toEqual(all.toSorted());
    expect([0, 1, 2].map((w) => src.take(w))).toEqual([undefined, undefined, undefined]);
  });

  it('runs every job once, the next one going to whichever worker is free', async () => {
    const log: string[] = [];
    // Job 0 is long: worker a holds it while b runs the rest.
    const workers = [fakeWorker('a', zeroIsLong, log), fakeWorker('b', zeroIsLong, log)];
    const results = new Map<number, string>();
    await runPool(inOrder([0, 1, 2, 3, 4]), workers, (job, r) => results.set(job, r));
    expect([...results.keys()].toSorted((x, y) => x - y)).toEqual([0, 1, 2, 3, 4]);
    expect([...results.entries()].every(([job, r]) => r === `${job}`)).toBe(true);
    expect(log.filter((l) => l.startsWith('b:'))).toEqual(['b:1', 'b:2', 'b:3', 'b:4']);
    expect(workers.every((w) => w.closed())).toBe(true);
  });

  it('stops taking jobs after a failure, rejects, and closes every worker', async () => {
    const log: string[] = [];
    const workers = [fakeWorker('a', () => 2, log), fakeWorker('b', () => 2, log)];
    await expect(runPool(inOrder([1, -1, 2, 3, 4, 5, 6]), workers, () => {})).rejects.toThrow(
      'job -1 failed',
    );
    expect(log.length).toBeLessThan(6);
    expect(workers.every((w) => w.closed())).toBe(true);
  });

  it('an empty queue closes its workers', async () => {
    const workers = [fakeWorker('a', () => 1, [])];
    await runPool(inOrder<number>([]), workers, () => {});
    expect(workers[0]!.closed()).toBe(true);
  });

  it('with a gate: skipped jobs drop, waiting ones are passed over, and all-waiting says WAIT', () => {
    const maps = [
      { mapId: 'a', requests: [req('par'), req('par', 2), req('par', 3), req('none')] },
    ];
    const done = new Set<string>();
    // A later seed waits for its seed 1, then is skipped (seed 1 drew nothing; D157).
    const src = mapAffinity(maps, ({ req: r }) =>
      r.seed === 1 ? 'run' : done.has(r.build) ? 'skip' : 'wait',
    );
    const took = (w: number) => jobName(src.take(w));
    expect(took(0)).toBe('a par#1');
    expect(took(1)).toBe('a none#1'); // par#2 and #3 wait behind par#1, still running
    expect(took(1)).toBe('wait');
    done.add('par');
    expect(took(1)).toBe('-'); // both skipped: nothing left
    expect(took(0)).toBe('-');
  });

  it('a worker told to WAIT idles until a job in flight finishes, then takes the job it freed', async () => {
    const log: string[] = [];
    let first = false;
    const jobs = [0, 1];
    // Job 1 waits until job 0 is done (job 0 is long, so worker b is told to WAIT first).
    const src: JobSource<number> = {
      take: () => {
        if (jobs[0] === 1 && !first) return WAIT;
        return jobs.shift();
      },
    };
    const workers = [fakeWorker('a', zeroIsLong, log), fakeWorker('b', zeroIsLong, log)];
    await runPool(src, workers, (job) => {
      if (job === 0) first = true;
    });
    expect(log).toEqual(['a:0', expect.stringMatching(/^[ab]:1$/)]);
    expect(workers.every((w) => w.closed())).toBe(true);
  });

  it('WAIT with no job in flight is a bug in the source: it rejects', async () => {
    const workers = [fakeWorker('a', () => 1, [])];
    await expect(runPool({ take: () => WAIT }, workers, () => {})).rejects.toThrow(/waits/);
    expect(workers[0]!.closed()).toBe(true);
  });

  it('a map judged from cloned records (a worker’s replies) is the same report as runMap', () => {
    const content = FLAG_VARIANT_CONTENT;
    const opts = { seeds: 3 };
    const plan = planMap(content, 'fx_map', opts);
    const run = mapRunner(content, 'fx_map', opts);
    // Out of order, as workers finish them.
    const records = new Map(
      plan.requests.toReversed().map((r) => [runKey(r), structuredClone(run(r))]),
    );
    const report = judgeMap(
      content,
      plan,
      (r) => records.get(runKey(r))!,
      () => 0,
    );
    const whole = runMap(content, 'fx_map', opts);
    expect(JSON.stringify(report)).toBe(JSON.stringify(whole));
  });
});
