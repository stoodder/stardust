// npm run sim: headless balance sims for every campaign map (docs/tech/conventions.md § Balance
// sims). The CLI over src/balance/: it compiles the content in plain Node, runs the harness,
// prints the verdicts, and exits 1 on any failed check. It plans every map's checks on this thread
// (`planMap`), shares their runs out one at a time over worker threads (tools/simPool.ts,
// tools/simWorker.ts; one per core), the later maps' first, so a heavy map's runs spread over every
// core (T778), then judges each map from its runs (`judgeMap`) and the campaign in campaign order,
// so the output doesn't depend on the job count.
//
//   npm run sim                          every campaign map, seeds 1–5
//   npm run sim -- --map a1_m01          one map (skips the cross-map monotonic check)
//   npm run sim -- --seeds 2             seeds 1–2 for the every-seed checks
//   npm run sim -- --build rivet_only    only the checks about one build ('par', 'none', …)
//   npm run sim -- --jobs 1              on this thread only (default: one worker per core)
//   npm run sim -- --report              also write reports/balance.{json,md}
import { mkdirSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { Worker } from 'node:worker_threads';
import { runKey, type RunRecord, type RunRequest } from '../src/balance/checks.ts';
import { formatMarkdown, formatText } from '../src/balance/report.ts';
import {
  campaignMapIds,
  judgeCampaign,
  judgeMap,
  mapRunner,
  planMap,
  runMap,
  type CampaignReport,
  type HarnessOptions,
  type MapReport,
} from '../src/balance/harness.ts';
import { ALL_ACT_CHUNKS } from '../src/app/acts/all.ts';
import { registerActChunk } from '../src/app/actContent.ts';
import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import type { LiveIds } from '../src/content/types.ts';
import { cpuClockMs } from './simClock.ts';
import { jobsSlowestFirst, runPool, type PoolWorker, type SimJob } from './simPool.ts';
import type { SimWorkerReply } from './simWorker.ts';

const { values } = parseArgs({
  options: {
    map: { type: 'string' },
    seeds: { type: 'string' },
    build: { type: 'string' },
    jobs: { type: 'string' },
    report: { type: 'boolean', default: false },
  },
  strict: true,
});

function fail(message: string): never {
  console.error(`sim: ${message}`);
  process.exit(1);
}

let seeds: number | undefined;
if (values.seeds !== undefined) {
  seeds = Number(values.seeds);
  if (!Number.isInteger(seeds) || seeds < 1)
    fail(`--seeds needs a positive integer (got '${values.seeds}')`);
}
let jobs = availableParallelism();
if (values.jobs !== undefined) {
  jobs = Number(values.jobs);
  if (!Number.isInteger(jobs) || jobs < 1)
    fail(`--jobs needs a positive integer (got '${values.jobs}')`);
}

const now = (): number => performance.now();

/** A worker's record of one run, and the run's wall time in ms. */
type Done = { readonly record: RunRecord; readonly ms: number };

/** A worker thread (tools/simWorker.ts) as the pool's worker. */
function threadWorker(): PoolWorker<SimJob, Done> {
  const w = new Worker(new URL('./simWorker.ts', import.meta.url));
  return {
    run: (job) =>
      new Promise<Done>((resolve, reject) => {
        const onExit = (code: number): void => reject(new Error(`a sim worker exited (${code})`));
        const settle = (): void => {
          w.off('error', reject);
          w.off('exit', onExit);
        };
        w.once('error', reject);
        w.once('exit', onExit);
        w.once('message', (reply: SimWorkerReply) => {
          settle();
          if ('error' in reply) reject(new Error(reply.error));
          else resolve(reply);
        });
        // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker thread, not a window
        w.postMessage(job);
      }),
    close: async () => {
      w.removeAllListeners();
      await w.terminate();
    },
  };
}

/**
 * Every map in `ids` on up to `jobs` worker threads, one run per job (tools/simPool.ts): planned
 * here, run there, judged here, in `ids`' order. A map's time is its planning, its runs' wall time
 * wherever they ran, and its judging.
 */
async function runSplit(
  ids: readonly LiveIds['map'][],
  opts: HarnessOptions,
): Promise<MapReport[]> {
  const maps = ids.map((id) => {
    const t0 = now();
    const plan = planMap(content, id, opts);
    return { plan, records: new Map<string, RunRecord>(), ms: now() - t0 };
  });
  const byId = new Map<string, (typeof maps)[number]>(maps.map((m) => [m.plan.mapId, m]));
  const queue = jobsSlowestFirst(maps.map((m) => m.plan));
  const workers = Array.from({ length: Math.min(jobs, queue.length) }, threadWorker);
  await runPool(queue, workers, (job, done) => {
    const m = byId.get(job.mapId)!; // every job is a planned map's
    m.records.set(runKey(job.req), done.record);
    m.ms += done.ms;
  });
  return maps.map(({ plan, records, ms }) => {
    const t1 = now();
    // A check reading a run it didn't plan for runs it here (none does today).
    let local: ((req: RunRequest) => RunRecord) | undefined;
    const run = (req: RunRequest): RunRecord =>
      records.get(runKey(req)) ?? (local ??= mapRunner(content, plan.mapId, opts))(req);
    return judgeMap(content, plan, run, () => ms + now() - t1);
  });
}

// Every act's content, so validation sees all of it (the game loads them an act at a time; T802).
for (const chunk of ALL_ACT_CHUNKS) registerActChunk(chunk);
const content = compileContent(RAW_CONTENT);
const opts: HarnessOptions & { readonly mapId?: string } = {
  ...(values.map === undefined ? {} : { mapId: values.map }),
  ...(seeds === undefined ? {} : { seeds }),
  ...(values.build === undefined ? {} : { build: values.build }),
  now: () => performance.now(),
  cpuNow: cpuClockMs,
};
let report: CampaignReport;
try {
  const t0 = performance.now();
  const ids = campaignMapIds(content, opts.mapId);
  const reports =
    jobs === 1 ? ids.map((id) => runMap(content, id, opts)) : await runSplit(ids, opts);
  report = judgeCampaign(content, reports, opts, performance.now() - t0);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}

console.log(formatText(report));
if (values.report) {
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/balance.json', `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync('reports/balance.md', formatMarkdown(report));
  console.log('sim: wrote reports/balance.json and reports/balance.md');
}
process.exit(report.ok ? 0 : 1);
