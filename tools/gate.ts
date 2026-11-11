// npm run check: the whole gate (docs/tech/conventions.md § The test loop). Runs each step as
// `npm run <step>`, in order, stopping at the first that fails, then prints how long each took
// against its share of the gate-time budget (GATE_BUDGET: 8 minutes in all, under the 10-minute
// command cap; D137). A step over its share is a warning, not a failure: wall time is noisy under
// load, and a red gate must mean broken code. The table is the guardrail: read it on every run, and fix
// the step that drifts (conventions.md § Gate time says how). The `build` step also measures the
// initial JS (tools/bundleSize.ts): a warning over 900 kB gzipped, a failure over the 1 MB budget.
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { reportInitialJs } from './bundleSize.ts';

/** The gate's steps in order, each with its share of the budget in seconds. */
const GATE_BUDGET: readonly (readonly [step: string, budgetSec: number])[] = [
  ['typecheck', 10],
  ['lint', 25],
  ['test', 60],
  ['build', 15],
  ['sim', 40],
  ['smoke', 325],
  ['check:docs', 5],
];
/** The whole gate's budget: the sum of the shares. */
const GATE_BUDGET_SEC = GATE_BUDGET.reduce((n, [, s]) => n + s, 0);

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const rows: string[] = [];
let total = 0;
let failed: string | null = null;
for (const [step, budget] of GATE_BUDGET) {
  console.log(`\n▶ npm run ${step}`);
  const t0 = performance.now();
  const r = spawnSync(npm, ['run', step], { stdio: 'inherit' });
  // The build's size budget (D143): part of the step, so a bundle over it is a red build.
  const sized = step === 'build' && r.status === 0 ? reportInitialJs('dist') : 0;
  const sec = (performance.now() - t0) / 1000;
  total += sec;
  const over = sec > budget ? `  over its ${budget} s` : '';
  rows.push(
    `  ${step.padEnd(11)} ${sec.toFixed(1).padStart(6)} s / ${String(budget).padStart(3)} s${over}`,
  );
  if (r.status !== 0 || sized !== 0) {
    failed = step;
    break;
  }
}
console.log('\ngate time:');
for (const row of rows) console.log(row);
const overall = `  total       ${total.toFixed(1).padStart(6)} s / ${GATE_BUDGET_SEC} s`;
console.log(
  total > GATE_BUDGET_SEC ? `${overall}  OVER BUDGET (conventions.md § Gate time)` : overall,
);
if (failed !== null) {
  console.error(`\ncheck: '${failed}' failed`);
  process.exit(1);
}
console.log('\ncheck: PASS');
