// One `npm run sim` worker (tools/sim.ts runs the campaign's maps in parallel; conventions.md
// § Balance sims, Gate time). It compiles the content once, then runs `runMap` for each map id the
// CLI sends and posts back the map's report, or the error that stopped it. Results don't depend on
// which thread ran a map: every run is deterministic and the sim shares nothing between runs.
import { performance } from 'node:perf_hooks';
import { parentPort, workerData } from 'node:worker_threads';
import { runMap, type HarnessOptions, type MapReport } from '../src/balance/harness.ts';
import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';

/** What the CLI hands each worker. */
export interface SimWorkerData {
  readonly seeds?: number;
  readonly build?: string;
}

/** A worker's answer for one map. */
export type SimWorkerReply =
  | { readonly mapId: string; readonly report: MapReport }
  | { readonly mapId: string; readonly error: string };

const port = parentPort;
if (port === null) throw new Error('simWorker: run me as a worker thread (tools/sim.ts)');
/** workerData as SimWorkerData: its seed count and build filter, each kept only if well typed. */
function dataOf(raw: unknown): SimWorkerData {
  if (typeof raw !== 'object' || raw === null) return {};
  const seeds: unknown = Reflect.get(raw, 'seeds');
  const build: unknown = Reflect.get(raw, 'build');
  return {
    ...(typeof seeds === 'number' ? { seeds } : {}),
    ...(typeof build === 'string' ? { build } : {}),
  };
}
const data = dataOf(workerData);
const opts: HarnessOptions = {
  ...(data.seeds === undefined ? {} : { seeds: data.seeds }),
  ...(data.build === undefined ? {} : { build: data.build }),
  now: () => performance.now(),
};
const content = compileContent(RAW_CONTENT);

port.on('message', (mapId: string) => {
  let reply: SimWorkerReply;
  try {
    const id = content.campaign.find((m) => m === mapId);
    if (id === undefined) throw new RangeError(`unknown campaign map '${mapId}'`);
    reply = { mapId, report: runMap(content, id, opts) };
  } catch (err) {
    reply = { mapId, error: err instanceof Error ? err.message : String(err) };
  }
  port.postMessage(reply);
});
