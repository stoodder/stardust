// npm run sim: headless balance sims for every campaign map (docs/tech/conventions.md § Balance
// sims). The CLI over src/balance/: it compiles the content in plain Node, runs the harness,
// prints the verdicts, and exits 1 on any failed check.
//
//   npm run sim                          every campaign map, seeds 1–5
//   npm run sim -- --map a1_m01          one map (skips the cross-map monotonic check)
//   npm run sim -- --seeds 2             seeds 1–2 for the every-seed checks
//   npm run sim -- --build rivet_only    only the checks about one build ('par', 'none', …)
//   npm run sim -- --report              also write reports/balance.{json,md}
import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { formatMarkdown, formatText } from '../src/balance/report.ts';
import { runCampaign } from '../src/balance/harness.ts';
import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';

const { values } = parseArgs({
  options: {
    map: { type: 'string' },
    seeds: { type: 'string' },
    build: { type: 'string' },
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

const content = compileContent(RAW_CONTENT);
let report;
try {
  report = runCampaign(content, {
    ...(values.map === undefined ? {} : { mapId: values.map }),
    ...(seeds === undefined ? {} : { seeds }),
    ...(values.build === undefined ? {} : { build: values.build }),
    now: () => performance.now(),
  });
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
