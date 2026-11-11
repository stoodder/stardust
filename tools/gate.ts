// npm run check: the whole gate (docs/tech/conventions.md § The test loop). `npm run check:fast --
// <smoke specs…>` is the per-task gate (D148): every step but smoke runs whole, and smoke runs only
// the specs named (none named: smoke is skipped). Runs each step as
// `npm run <step>`, in phases: the steps of a phase run at the same time (`sim` beside `smoke`, whose
// browsers leave cores idle), and the gate stops after the first phase with a failing step.
// Then it prints each step's time against its share and the gate's wall time against the budget
// (GATE_BUDGET_SEC: 8 minutes, under the 10-minute command cap; D137). A step over its share is a
// warning, not a failure: wall time is noisy under load, and a red gate must mean broken code. The
// table is the guardrail: read it on every run, and fix the step that drifts (conventions.md § Gate
// time says how). The `build` step also measures the initial JS (tools/bundleSize.ts): a warning
// over 900 kB gzipped, a failure over the 1 MB budget.
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { reportInitialJs } from './bundleSize.ts';

interface Step {
  readonly step: string;
  /** Extra arguments after `npm run <step> --` (the fast gate's smoke specs). */
  readonly args?: readonly string[];
  /** Its share, in seconds of its own wall time (it shares the machine with its phase's others). */
  readonly budgetSec: number;
}

/**
 * The gate's phases, in order. In a phase the first step streams its output live; the others'
 * output is held and printed when each ends. `sim` runs beside `smoke` (T764): smoke's browsers
 * leave cores idle while they wait on real-time beats, and the harness fills them (about 20 s off
 * the gate). The other steps run alone: typecheck and lint beside `test` cost the test step more
 * than they saved (T764, measured). Each step needs only what an earlier phase made (`smoke`
 * serves `build`'s dist/).
 */
const PHASES: readonly (readonly Step[])[] = [
  [{ step: 'typecheck', budgetSec: 10 }],
  [{ step: 'lint', budgetSec: 20 }],
  [{ step: 'test', budgetSec: 85 }],
  [{ step: 'build', budgetSec: 5 }],
  [
    { step: 'smoke', budgetSec: 420 },
    { step: 'sim', budgetSec: 90 },
  ],
  [{ step: 'check:docs', budgetSec: 5 }],
];
/** The whole gate's budget, in seconds of wall time (conventions.md § Gate time). */
const GATE_BUDGET_SEC = 480;

/** `--fast [specs…]`: the per-task gate (D148). Smoke runs only the named specs, or not at all. */
const fastAt = process.argv.indexOf('--fast');
const fast = fastAt >= 0;
const fastSpecs = fast ? process.argv.slice(fastAt + 1) : [];
/** The fast gate's budget: everything but the full smoke suite (conventions.md § Gate time). */
const FAST_BUDGET_SEC = 300;
const phases: readonly (readonly Step[])[] = fast
  ? PHASES.map((phase) =>
      phase.flatMap((s): Step[] => {
        if (s.step !== 'smoke') return [s];
        return fastSpecs.length > 0 ? [{ ...s, args: fastSpecs, budgetSec: 120 }] : [];
      }),
    )
  : PHASES;
const budgetSec = fast ? FAST_BUDGET_SEC : GATE_BUDGET_SEC;

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

interface Outcome {
  readonly step: string;
  readonly budgetSec: number;
  readonly sec: number;
  readonly ok: boolean;
}

/** Runs `npm run <step>`, streaming its output (`live`) or holding it until it ends. */
function run({ step, budgetSec, args = [] }: Step, live: boolean): Promise<Outcome> {
  const t0 = performance.now();
  return new Promise((resolve) => {
    const argv = args.length > 0 ? ['run', step, '--', ...args] : ['run', step];
    const child = spawn(npm, argv, { stdio: live ? 'inherit' : 'pipe' });
    const held: Buffer[] = [];
    child.stdout?.on('data', (b: Buffer) => held.push(b));
    child.stderr?.on('data', (b: Buffer) => held.push(b));
    child.on('close', (code) => {
      if (!live) {
        console.log(`\n▶ npm run ${step} (ran beside the phase's first step; its output:)`);
        process.stdout.write(Buffer.concat(held));
      }
      // The build's size budget (D143): part of the step, so a bundle over it is a red build.
      const sized = step === 'build' && code === 0 ? reportInitialJs('dist') : 0;
      const sec = (performance.now() - t0) / 1000;
      resolve({ step, budgetSec, sec, ok: code === 0 && sized === 0 });
    });
  });
}

const t0 = performance.now();
const outcomes: Outcome[] = [];
for (const phase of phases) {
  console.log(`\n▶ npm run ${phase.map((s) => s.step).join(' + ')}`);
  // oxlint-disable-next-line no-await-in-loop -- phases run in order, the steps of each at once
  const done = await Promise.all(phase.map((s, i) => run(s, i === 0)));
  outcomes.push(...done);
  if (done.some((o) => !o.ok)) break;
}
const total = (performance.now() - t0) / 1000;

console.log('\ngate time (steps in one phase overlap):');
for (const o of outcomes) {
  const over = o.sec > o.budgetSec ? `  over its ${o.budgetSec} s` : '';
  console.log(
    `  ${o.step.padEnd(11)} ${o.sec.toFixed(1).padStart(6)} s / ${String(o.budgetSec).padStart(3)} s${over}`,
  );
}
const overall = `  total       ${total.toFixed(1).padStart(6)} s / ${budgetSec} s (wall)`;
console.log(total > budgetSec ? `${overall}  OVER BUDGET (conventions.md § Gate time)` : overall);
if (fast) {
  const ran = fastSpecs.length > 0 ? fastSpecs.join(', ') : 'none';
  console.log(
    `  fast gate: smoke ran only ${ran}; the full gate runs per wave and milestone (D148)`,
  );
}
const failed = outcomes.filter((o) => !o.ok).map((o) => `'${o.step}'`);
if (failed.length > 0) {
  console.error(`\ncheck: ${failed.join(', ')} failed`);
  process.exit(1);
}
console.log(fast ? '\ncheck:fast: PASS' : '\ncheck: PASS');
