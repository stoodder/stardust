// npm run sim: headless balance sims for every campaign map (docs/tech/conventions.md § Balance
// sims). The CLI over src/balance/: it compiles the content in plain Node, runs the harness,
// prints the verdicts, and exits 1 on any failed check. Maps run in parallel on worker threads
// (tools/simWorker.ts), one per core up to the map count; the campaign is judged once every
// report is in, in campaign order, so the output doesn't depend on the job count.
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
import { formatMarkdown, formatText } from '../src/balance/report.ts';
import {
  campaignMapIds,
  judgeCampaign,
  runMap,
  type CampaignReport,
  type HarnessOptions,
  type MapReport,
} from '../src/balance/harness.ts';
import { ALL_ACT_CHUNKS } from '../src/app/acts/all.ts';
import { registerActChunk } from '../src/app/actContent.ts';
import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import { cpuClockMs } from './simClock.ts';
import type { SimWorkerData, SimWorkerReply } from './simWorker.ts';

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

/**
 * Runs `ids` on up to `jobs` worker threads and returns their reports in `ids`' order. The later
 * (longer) maps go first, so the slowest map never starts last.
 */
async function runParallel(ids: readonly string[], data: SimWorkerData): Promise<MapReport[]> {
  const queue = ids.toReversed();
  const reports = new Map<string, MapReport>();
  const worker = async (): Promise<void> => {
    const w = new Worker(new URL('./simWorker.ts', import.meta.url), { workerData: data });
    try {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        const asked = id;
        // One map at a time per worker: the pool's parallelism is across workers.
        // oxlint-disable-next-line no-await-in-loop -- each worker takes the next map when it's free
        const reply = await new Promise<SimWorkerReply>((resolve, reject) => {
          w.once('message', resolve);
          w.once('error', reject);
          // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a worker thread, not a window
          w.postMessage(asked);
        });
        w.removeAllListeners('error');
        if ('error' in reply) throw new Error(reply.error);
        reports.set(reply.mapId, reply.report);
      }
    } finally {
      await w.terminate();
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, ids.length) }, worker));
  return ids.map((id) => reports.get(id)!); // every id was run, or a worker threw
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
    jobs === 1 || ids.length === 1
      ? ids.map((id) => runMap(content, id, opts))
      : await runParallel(ids, {
          ...(seeds === undefined ? {} : { seeds }),
          ...(values.build === undefined ? {} : { build: values.build }),
        });
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
