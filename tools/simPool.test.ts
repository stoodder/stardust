// The sim CLI's work queue (tools/simPool.ts, T778): jobs slowest first, each run once by the first
// free worker, a failure stopping the pool; and a map judged from records that crossed a thread
// (structured clones, as a worker's replies are) reports exactly what `runMap` does.
import { describe, expect, it } from 'vitest';
import { runKey, type RunRequest } from '../src/balance/checks.ts';
import { FLAG_VARIANT_CONTENT } from '../src/balance/__fixtures__/fireControl.ts';
import { judgeMap, mapRunner, planMap, runMap } from '../src/balance/harness.ts';
import { jobsSlowestFirst, runPool, type PoolWorker } from './simPool.ts';

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
  it('queues the later maps first, each map’s runs in its plan’s order', () => {
    const jobs = jobsSlowestFirst([
      { mapId: 'a1_m01', requests: [req('par'), req('none')] },
      { mapId: 'a1_m02', requests: [req('par', 1), req('par', 2)] },
    ]);
    expect(jobs.map((j) => `${j.mapId} ${runKey(j.req)}`)).toEqual([
      'a1_m02 par#1',
      'a1_m02 par#2',
      'a1_m01 par#1',
      'a1_m01 none#1',
    ]);
  });

  it('runs every job once, the next one going to whichever worker is free', async () => {
    const log: string[] = [];
    // Job 0 is long: worker a holds it while b runs the rest.
    const workers = [fakeWorker('a', zeroIsLong, log), fakeWorker('b', zeroIsLong, log)];
    const results = new Map<number, string>();
    await runPool([0, 1, 2, 3, 4], workers, (job, r) => results.set(job, r));
    expect([...results.keys()].toSorted((x, y) => x - y)).toEqual([0, 1, 2, 3, 4]);
    expect([...results.entries()].every(([job, r]) => r === `${job}`)).toBe(true);
    expect(log.filter((l) => l.startsWith('b:'))).toEqual(['b:1', 'b:2', 'b:3', 'b:4']);
    expect(workers.every((w) => w.closed())).toBe(true);
  });

  it('stops taking jobs after a failure, rejects, and closes every worker', async () => {
    const log: string[] = [];
    const workers = [fakeWorker('a', () => 2, log), fakeWorker('b', () => 2, log)];
    await expect(runPool([1, -1, 2, 3, 4, 5, 6], workers, () => {})).rejects.toThrow(
      'job -1 failed',
    );
    expect(log.length).toBeLessThan(6);
    expect(workers.every((w) => w.closed())).toBe(true);
  });

  it('an empty queue closes its workers', async () => {
    const workers = [fakeWorker('a', () => 1, [])];
    await runPool([], workers, () => {});
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
