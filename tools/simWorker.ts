// One `npm run sim` worker (tools/sim.ts shares every map's runs over a pool of these;
// tools/simPool.ts; conventions.md § Balance sims, Sim time). It compiles the content once, then
// runs each job the CLI sends (one run of one map, `mapRunner`) and posts back its record and wall
// time, or the error that stopped it. Results don't depend on which thread ran a run: every run is
// deterministic and the sim shares nothing between runs.
import { performance } from 'node:perf_hooks';
import { parentPort } from 'node:worker_threads';
import type { RunRecord, RunRequest } from '../src/balance/checks.ts';
import { mapRunner, type HarnessOptions } from '../src/balance/harness.ts';
import { ALL_ACT_CHUNKS } from '../src/app/acts/all.ts';
import { registerActChunk } from '../src/app/actContent.ts';
import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import { cpuClockMs } from './simClock.ts';
import type { SimJob } from './simPool.ts';

/** A worker's answer for one job: the run's record and its wall time in ms, or an error. */
export type SimWorkerReply =
  { readonly record: RunRecord; readonly ms: number } | { readonly error: string };

const port = parentPort;
if (port === null) throw new Error('simWorker: run me as a worker thread (tools/sim.ts)');
const opts: HarnessOptions = { now: () => performance.now(), cpuNow: cpuClockMs };
// Every act's content, so validation sees all of it (the game loads them an act at a time; T802).
for (const chunk of ALL_ACT_CHUNKS) registerActChunk(chunk);
const content = compileContent(RAW_CONTENT);
/** One runner per map this worker has run, so a map's profiles are built once per worker. */
const runners = new Map<string, (req: RunRequest) => RunRecord>();

port.on('message', ({ mapId, req }: SimJob) => {
  let reply: SimWorkerReply;
  try {
    let run = runners.get(mapId);
    if (run === undefined) {
      const id = content.campaign.find((m) => m === mapId);
      if (id === undefined) throw new RangeError(`unknown campaign map '${mapId}'`);
      run = mapRunner(content, id, opts);
      runners.set(mapId, run);
    }
    const t0 = performance.now();
    const record = run(req);
    reply = { record, ms: performance.now() - t0 };
  } catch (err) {
    reply = { error: err instanceof Error ? err.message : String(err) };
  }
  port.postMessage(reply);
});
