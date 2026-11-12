// The harness split into its pieces (T778): `runMap` is `planMap`, a runner, and `judgeMap`, which
// tools/sim.ts runs on different threads (tools/simPool.test.ts judges records that crossed a
// thread); and `part` splits a map's checks across balance
// test files with every check in exactly one part, judged as the whole map judges it.
import { describe, expect, it } from 'vitest';
import type { CompiledContent } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { FixtureIds } from '../sim/__fixtures__/sim.ts';
import { runKey, type CheckSpec, type RunRecord } from './checks.ts';
import { FLAG_VARIANT_CONTENT, QUIET_WAVE_CONTENT } from './__fixtures__/fireControl.ts';
import { PLAIN_CONTENT } from './__fixtures__/harness.ts';
import {
  judgeMap,
  mapRunner,
  partSpecs,
  planMap,
  runMap,
  type HarnessOptions,
  type MapReport,
} from './harness.ts';

/** The run-level checks every part makes over its own runs (steps, #12, #13). */
const RUN_LEVEL = new Set(['steps', '12', '13']);
const planned = (r: MapReport) => r.checks.filter((c) => !RUN_LEVEL.has(c.id));

/** `runMap`'s pieces: plan, run each request once, then judge from the records. */
function viaPieces(
  content: CompiledContent<FixtureIds>,
  opts: HarnessOptions,
): { report: MapReport; ran: number } {
  const plan = planMap(content, 'fx_map', opts);
  const run = mapRunner(content, 'fx_map', opts);
  const records = new Map(plan.requests.map((r) => [runKey(r), run(r)]));
  let ran = 0;
  const report = judgeMap(
    content,
    plan,
    (req) => {
      ran++;
      return records.get(runKey(req))!;
    },
    () => 0,
  );
  return { report, ran };
}

describe('the harness in pieces (T778)', () => {
  const cases: readonly [string, CompiledContent<FixtureIds>, HarnessOptions][] = [
    ['plain', PLAIN_CONTENT, { seeds: 2 }],
    ['quiet wave', QUIET_WAVE_CONTENT, { seeds: 3 }],
    ['flag variants', FLAG_VARIANT_CONTENT, { seeds: 3 }],
    ['--build par', FLAG_VARIANT_CONTENT, { seeds: 3, build: 'par' }],
  ];

  it.each(cases)('%s: plan, run, judge is runMap', (_, content, opts) => {
    const whole = runMap(content, 'fx_map', opts);
    const { report, ran } = viaPieces(content, opts);
    expect(report).toEqual(whole);
    expect(JSON.stringify(report)).toBe(JSON.stringify(whole));
    // Each planned run is asked for once, in the order runMap ran them, and none is unplanned.
    expect(ran).toBe(whole.runs.length);
    expect(planMap(content, 'fx_map', opts).requests.map(runKey)).toEqual(whole.runs.map(keyOf));
  });

  it('a request is planned once however many checks need it', () => {
    const plan = planMap(FLAG_VARIANT_CONTENT, 'fx_map', { seeds: 3 });
    const keys = plan.requests.map(runKey);
    expect(new Set(keys).size).toBe(keys.length);
    const needed = new Set(plan.specs.flatMap((s) => s.needs.map(runKey)));
    expect(new Set(keys)).toEqual(needed);
  });
});

describe('harness parts (T778: a heavy map split across balance test files)', () => {
  const content = FLAG_VARIANT_CONTENT;
  const opts = { seeds: 3 } as const;
  const whole = runMap(content, 'fx_map', opts);

  it.each([1, 2, 3, 5])('%i parts hold every check once, each judged as the whole map', (count) => {
    const parts = Array.from({ length: count }, (_, index) =>
      runMap(content, 'fx_map', { ...opts, part: { index, count } }),
    );
    const got = parts.flatMap(planned);
    expect(got.toSorted(byIdSubject)).toEqual(planned(whole).toSorted(byIdSubject));
    // Every run the whole map made, some part made; each part judges its own runs (#12, #13).
    const ranKeys = new Set(parts.flatMap((p) => p.runs.map((r) => keyOf(r))));
    expect(whole.runs.every((r) => ranKeys.has(keyOf(r)))).toBe(true);
    for (const p of parts) {
      expect(p.checks.filter((c) => RUN_LEVEL.has(c.id)).map((c) => c.id)).toEqual([
        'steps',
        '12',
        '13',
      ]);
    }
    if (count === 1) expect(parts[0]).toEqual(whole);
  });

  it('keeps a build’s checks together, and the map-level ones in part 0', () => {
    const specs = planMap(content, 'fx_map', opts).specs;
    const owner = (count: number) => {
      const of = new Map<string, number>();
      for (let index = 0; index < count; index++) {
        for (const s of partSpecs(specs, { index, count })) {
          expect(of.get(s.subject) ?? index).toBe(index);
          of.set(s.subject, index);
        }
      }
      return of;
    };
    const two = owner(2);
    if (two.has('*')) expect(two.get('*')).toBe(0);
    expect(new Set(two.values())).toEqual(new Set([0, 1])); // both parts get checks
    // Splitting never loses or duplicates a check.
    for (const count of [2, 3, 4]) {
      const all = Array.from({ length: count }, (_, index) =>
        partSpecs(specs, { index, count }),
      ).flat();
      expect(all.length).toBe(specs.length);
      expect(new Set(all)).toEqual(new Set(specs));
    }
  });

  it('refuses a part outside its count', () => {
    const specs: CheckSpec[] = [];
    expect(() => partSpecs(specs, { index: 2, count: 2 })).toThrow(RangeError);
    expect(() => partSpecs(specs, { index: -1, count: 2 })).toThrow(RangeError);
    expect(() => partSpecs(specs, { index: 0, count: 0 })).toThrow(RangeError);
    expect(() => partSpecs(specs, { index: 0.5, count: 2 })).toThrow(RangeError);
    expect(partSpecs(specs, { index: 0, count: 1 })).toEqual([]);
  });

  it('splits the finale’s plan into parts with fewer runs each (planning only)', () => {
    const live = compileContent(RAW_CONTENT);
    const all = planMap(live, 'fin_m01', { seeds: 1 });
    for (const count of [2, 3]) {
      const parts = Array.from({ length: count }, (_, index) =>
        planMap(live, 'fin_m01', { seeds: 1, part: { index, count } }),
      );
      expect(parts.flatMap((p) => p.specs).length).toBe(all.specs.length);
      for (const p of parts) expect(p.requests.length).toBeLessThan(all.requests.length);
      const union = new Set(parts.flatMap((p) => p.requests.map(runKey)));
      expect(union).toEqual(new Set(all.requests.map(runKey)));
    }
  });
});

const keyOf = (r: RunRecord): string =>
  runKey({ build: r.build, seed: r.seed, ...(r.repeat ? { repeat: true } : {}) });
const byIdSubject = (a: { id: string; subject: string }, b: { id: string; subject: string }) =>
  `${a.id}|${a.subject}` < `${b.id}|${b.subject}` ? -1 : 1;
