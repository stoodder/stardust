// The alt builds' and guards' checks (conventions.md § Balance sims): #8 the forgiving floor (or an
// `altExpectations` entry's stricter floor, below-par, or under-built outcome), `gradual` (no
// single-wave wall, D028), and each guard's expectation.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import {
  describeRun,
  fmtPct,
  lossPerWave,
  margins,
  notGradual,
  perRun,
  seedRuns,
  wonCount,
  type CheckSpec,
} from './checks.ts';
import { refusal } from './refusals.ts';
import { FORGIVING_FLOOR_PCT, MAX_WAVE_LOSS_PCT } from './rules.ts';

/** #8 and `gradual` for every alt build, its `altExpectations`, and the map's guards. */
export function altBuildChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  few: readonly number[],
): CheckSpec[] {
  const b = map.builds;
  const checks: CheckSpec[] = [];
  for (const name of Object.keys(b.altBuilds)) {
    const label = `alt:${name}`;
    const outcome = Object.hasOwn(b.altExpectations, name)
      ? b.altExpectations[name]!.outcome
      : undefined;
    if (outcome === undefined) {
      checks.push(
        perRun(
          '8',
          `${label} wins with margin ≥ ${FORGIVING_FLOOR_PCT}`,
          label,
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
    } else if (outcome === 'lose') {
      checks.push(
        perRun(
          '8',
          `${label} (under-built) loses`,
          label,
          few,
          (rec) => (rec.result?.outcome === 'lost' ? null : describeRun(rec)),
          (recs) => recs.map(describeRun).join(', '),
        ),
      );
    }
    checks.push(
      perRun(
        'gradual',
        `${label} never loses over ${MAX_WAVE_LOSS_PCT}% of integrity in one wave, and leaks before any loss`,
        label,
        few,
        (rec) => notGradual(rec.result!),
        // Seeds that played out alike are listed once.
        (recs) => {
          const runs = recs.map((r) => `${describeRun(r)}, lost per wave ${lossPerWave(r.result)}`);
          return [...new Set(runs)].join('; ');
        },
      ),
    );
  }
  for (const [name, expect] of Object.entries(b.altExpectations)) {
    const label = `alt:${name}`;
    if (!Object.hasOwn(b.altBuilds, name)) {
      // The validator rejects this; the harness refuses rather than skips, in case it runs first.
      checks.push(
        refusal('8', `${label} expectations`, label, () => {
          throw new RangeError(`the map has no alt build '${name}' (altExpectations names it)`);
        }),
      );
      continue;
    }
    const min = expect.minMarginPct;
    if (min !== undefined) {
      checks.push(
        perRun(
          '8',
          `${label} wins with margin ≥ ${min}`,
          label,
          few,
          (rec) => {
            if (rec.result?.outcome !== 'won') return describeRun(rec);
            return rec.marginPct >= min ? null : `margin ${fmtPct(rec.marginPct)} is below ${min}`;
          },
          (recs) => `margins ${margins(recs)}`,
        ),
      );
    }
    if (expect.belowPar === true) {
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
  return checks;
}
