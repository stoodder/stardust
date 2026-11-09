// The per-map assertions (conventions.md § Balance sims, the numbered table). Each check names
// the build it's about (its subject, for `--build`), the runs it needs, and how it judges them.
// Checks the harness can't make yet are refused for maps that need them, never skipped quietly.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { ALT_BELOW_PAR } from './expectations.ts';
import { fullCatalogModifiers } from './profile.ts';
import { refusal } from './refusals.ts';
import {
  EARLY_CALL_SLACK_PCT,
  FORGIVING_FLOOR_PCT,
  noCounterLoseByWave,
  parBand,
} from './rules.ts';

/** One run: a build label ('par', 'none', 'alwaysCallEarly', 'alt:x', 'noCounter:x', 'guard:x'). */
export interface RunRequest {
  readonly build: string;
  readonly seed: number;
  /** A second, identical run (the determinism check). */
  readonly repeat?: true;
}

export interface RunRecord {
  readonly build: string;
  readonly seed: number;
  readonly repeat: boolean;
  /** Why the run couldn't happen (a refused config or build), else null. */
  readonly error: string | null;
  readonly result: HeadlessResult | null;
  /** Par margin %: integrity left ÷ max integrity (design/maps.md § 6.1); 0 without a result. */
  readonly marginPct: number;
  /** Wall time. */
  readonly ms: number;
}

export interface CheckOutcome {
  readonly ok: boolean;
  readonly summary: string;
  readonly failures: readonly string[];
}

export interface CheckSpec {
  /** The conventions table's number, or a name for checks outside it. */
  readonly id: string;
  readonly title: string;
  /** The build label it's about; '*' for map-level checks that always run. */
  readonly subject: string;
  readonly needs: readonly RunRequest[];
  evaluate(get: (r: RunRequest) => RunRecord): CheckOutcome;
}

export const runKey = (r: RunRequest): string => `${r.build}#${r.seed}${r.repeat ? '#again' : ''}`;

/** "won (100%)", "lost at W4", or the run's error. */
export function describeRun(rec: RunRecord): string {
  const r = rec.result;
  if (r === null) return `error: ${rec.error ?? 'no result'}`;
  if (r.outcome === 'won') return `won (${fmtPct(rec.marginPct)}%)`;
  if (r.outcome === 'lost') return `lost at W${r.lostAtWave ?? '?'}`;
  return `timed out at tick ${r.ticks}`;
}

export const fmtPct = (n: number): string => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const s = xs.toSorted((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2; // mid ≥ 1 when even
}

const seedRuns = (build: string, seeds: readonly number[]): RunRequest[] =>
  seeds.map((seed) => ({ build, seed }));

/** A check over one build's runs, judging each with `judge` (a failure message, or null). */
function perRun(
  id: string,
  title: string,
  build: string,
  seeds: readonly number[],
  judge: (rec: RunRecord, get: (r: RunRequest) => RunRecord) => string | null,
  summarize: (recs: readonly RunRecord[]) => string,
  extraNeeds: readonly RunRequest[] = [],
): CheckSpec {
  const needs = [...seedRuns(build, seeds), ...extraNeeds];
  return {
    id,
    title,
    subject: build,
    needs,
    evaluate(get) {
      const recs = seeds.map((seed) => get({ build, seed }));
      const failures: string[] = [];
      for (const rec of recs) {
        const why = rec.result === null ? describeRun(rec) : judge(rec, get);
        if (why !== null) failures.push(`seed ${rec.seed}: ${why}`);
      }
      return { ok: failures.length === 0, summary: summarize(recs), failures };
    },
  };
}

const wonCount = (recs: readonly RunRecord[]): string =>
  `${recs.filter((r) => r.result?.outcome === 'won').length}/${recs.length} won`;
const margins = (recs: readonly RunRecord[]): string =>
  recs.map((r) => fmtPct(r.marginPct)).join(' / ');
const won = (rec: RunRecord): string | null =>
  rec.result?.outcome === 'won' ? null : describeRun(rec);

/** Every check for `map` that needs runs. `every` and `few` are the seed lists. */
export function mapChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  every: readonly number[],
  few: readonly number[],
): CheckSpec[] {
  const b = map.builds;
  const band = parBand(map.act, b.marginBand);
  const checks: CheckSpec[] = [];
  checks.push(perRun('1', 'par wins', 'par', every, won, wonCount));
  checks.push(
    perRun(
      '2',
      'par margin in band',
      'par',
      every,
      (rec) => {
        if (band === null) return `act ${map.act} has no par band yet`;
        if (rec.marginPct < band.lo) {
          return `margin ${fmtPct(rec.marginPct)} is below the band floor ${band.lo} (too hard for par)`;
        }
        if (rec.marginPct > band.hi) {
          return `margin ${fmtPct(rec.marginPct)} is above the band top ${band.hi} (trivial for par)`;
        }
        return null;
      },
      (recs) => {
        const ms = recs.map((r) => r.marginPct);
        const range = `${fmtPct(Math.min(...ms))} / ${fmtPct(median(ms))} / ${fmtPct(Math.max(...ms))}`;
        return `${range} (min / median / max), band ${band === null ? 'none' : `${band.lo}–${band.hi}`}`;
      },
    ),
  );
  checks.push(
    perRun(
      '4',
      'doing nothing loses',
      'none',
      [1],
      (rec) => (rec.result?.outcome === 'lost' ? null : describeRun(rec)),
      (recs) => recs.map(describeRun).join(', '),
    ),
  );

  const loseBy = noCounterLoseByWave(map.waves.length);
  for (const counter of Object.keys(b.noCounterBuilds)) {
    const label = `noCounter:${counter}`;
    checks.push(
      perRun(
        '5',
        `${label} loses before the final third (by W${loseBy})`,
        label,
        few,
        (rec) =>
          rec.result?.outcome === 'lost' && (rec.result.lostAtWave ?? Infinity) <= loseBy
            ? null
            : describeRun(rec),
        (recs) => recs.map(describeRun).join(', '),
      ),
    );
    checks.push(
      refusal('6', `${label} loses with the full-catalog profile`, label, () => {
        fullCatalogModifiers();
      }),
    );
  }

  const ace = 'alwaysCallEarly';
  checks.push(
    perRun(
      '7',
      'alwaysCallEarly wins and stays fair',
      ace,
      few,
      (rec, get) => {
        if (rec.result?.outcome !== 'won') return describeRun(rec);
        const par = get({ build: 'par', seed: rec.seed });
        const cap = Math.min(band?.hi ?? Infinity, par.marginPct + EARLY_CALL_SLACK_PCT);
        return rec.marginPct <= cap
          ? null
          : `margin ${fmtPct(rec.marginPct)} is above min(band top, par ${fmtPct(par.marginPct)} + ${EARLY_CALL_SLACK_PCT}) = ${fmtPct(cap)}`;
      },
      (recs) => `${wonCount(recs)}, margins ${margins(recs)}`,
      seedRuns('par', few),
    ),
  );

  for (const name of Object.keys(b.altBuilds)) {
    checks.push(
      perRun(
        '8',
        `alt:${name} wins with margin ≥ ${FORGIVING_FLOOR_PCT}`,
        `alt:${name}`,
        few,
        (rec) => {
          if (rec.result?.outcome !== 'won') return describeRun(rec);
          return rec.marginPct >= FORGIVING_FLOOR_PCT
            ? null
            : `margin ${fmtPct(rec.marginPct)} is below ${FORGIVING_FLOOR_PCT}`;
        },
        (recs) => `${wonCount(recs)}, margins ${margins(recs)}`,
      ),
    );
  }
  for (const name of ALT_BELOW_PAR[map.id] ?? []) {
    const label = `alt:${name}`;
    if (!(name in b.altBuilds)) {
      checks.push(
        refusal('8', `${label} below par`, label, () => {
          throw new RangeError(`the map has no alt build '${name}' (expectations.ts expects one)`);
        }),
      );
      continue;
    }
    checks.push(
      perRun(
        '8',
        `${label} wins below par's margin`,
        label,
        few,
        (rec, get) => {
          if (rec.result?.outcome !== 'won') return describeRun(rec);
          const par = get({ build: 'par', seed: rec.seed });
          return rec.marginPct < par.marginPct
            ? null
            : `margin ${fmtPct(rec.marginPct)} is not below par's ${fmtPct(par.marginPct)}`;
        },
        (recs) => `margins ${margins(recs)}`,
        seedRuns('par', few),
      ),
    );
  }

  for (const [name, guard] of Object.entries(b.guards)) {
    const expect = guard.expect;
    checks.push(
      perRun(
        'guard',
        `guard:${name} (${guard.policy}) ${expect === 'lose' ? 'loses' : `margin ≤ ${expect.maxMarginPct}`}`,
        `guard:${name}`,
        few,
        (rec) => {
          if (expect === 'lose') return rec.result?.outcome === 'lost' ? null : describeRun(rec);
          return rec.result?.outcome !== 'won' || rec.marginPct <= expect.maxMarginPct
            ? null
            : `margin ${fmtPct(rec.marginPct)} is above ${expect.maxMarginPct}`;
        },
        (recs) => recs.map(describeRun).join(', '),
      ),
    );
  }

  const once: RunRequest = { build: 'par', seed: 1 };
  const again: RunRequest = { build: 'par', seed: 1, repeat: true };
  checks.push({
    id: '11',
    title: 'determinism (par, seed 1, twice)',
    subject: 'par',
    needs: [once, again],
    evaluate(get) {
      const [a, c] = [get(once).result, get(again).result];
      if (a === null || c === null)
        return { ok: false, summary: 'not run', failures: [describeRun(get(once))] };
      const same = a.hash === c.hash && a.outcome === c.outcome && a.ticks === c.ticks;
      return {
        ok: same,
        summary: `hash ${a.hash}`,
        failures: same
          ? []
          : [
              `hash ${a.hash} vs ${c.hash}, ${a.outcome} vs ${c.outcome}, ${a.ticks} vs ${c.ticks} ticks`,
            ],
      };
    },
  });
  return checks;
}
