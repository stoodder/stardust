// The par build's checks (conventions.md § Balance sims): #1 par wins, #2 its margin is in the
// act's band, #4 doing nothing loses, #9 Story is easier, #7 early calls stay fair, par's ability
// casts matter, #14–#15 par under each story-flag value and each companion pick, and #11
// determinism.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import {
  describeRun,
  flagVariantLabel,
  fmtPct,
  margins,
  median,
  perRun,
  seedRuns,
  VACUOUS_NOTE,
  won,
  wonCount,
  type CheckSpec,
  type RunRecord,
  type RunRequest,
} from './checks.ts';
import { EARLY_CALL_SLACK_PCT } from './rules.ts';

/** A map's par band (rules.ts `parBand`), or null for an act without one yet. */
export type Band = { readonly lo: number; readonly hi: number } | null;

/** #1 par wins, #2 its margin is in the band, and #4 doing nothing loses. */
export function parOutcomeChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  every: readonly number[],
  band: Band,
): CheckSpec[] {
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
  return checks;
}

/**
 * #9 par on Story beats its Standard median, #7 calling every wave early stays fair, and (when par
 * casts) par without its casts scores below par.
 */
export function parFairnessChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  every: readonly number[],
  few: readonly number[],
  band: Band,
): CheckSpec[] {
  const b = map.builds;
  const checks: CheckSpec[] = [];
  // #9: Story difficulty is easier than Standard: par on Story (seed 1) wins with a margin at
  // least par's Standard median over every seed.
  const standardMedian = (get: (r: RunRequest) => RunRecord): number =>
    median(every.map((seed) => get({ build: 'par', seed }).marginPct));
  checks.push(
    perRun(
      '9',
      'par on Story wins with margin ≥ its Standard median',
      'par@story',
      [1],
      (rec, get) => {
        if (rec.result?.outcome !== 'won') return describeRun(rec);
        const med = standardMedian(get);
        return rec.marginPct >= med
          ? null
          : `margin ${fmtPct(rec.marginPct)} is below the Standard median ${fmtPct(med)}`;
      },
      (recs, get) =>
        `${recs.map(describeRun).join(', ')} vs Standard median ${fmtPct(standardMedian(get))}`,
      seedRuns('par', every),
      'par',
    ),
  );

  const ace = 'alwaysCallEarly';
  const aceCap = (seed: number, get: (r: RunRequest) => RunRecord): number =>
    Math.min(band?.hi ?? Infinity, get({ build: 'par', seed }).marginPct + EARLY_CALL_SLACK_PCT);
  checks.push(
    perRun(
      '7',
      'alwaysCallEarly wins and stays fair',
      ace,
      few,
      (rec, get) => {
        if (rec.result?.outcome !== 'won') return describeRun(rec);
        const cap = aceCap(rec.seed, get);
        const par = get({ build: 'par', seed: rec.seed });
        return rec.marginPct <= cap
          ? null
          : `margin ${fmtPct(rec.marginPct)} is above min(band top, par ${fmtPct(par.marginPct)} + ${EARLY_CALL_SLACK_PCT}) = ${fmtPct(cap)}`;
      },
      // With par within the slack of 100 the cap is 100, so only the win can fail: flag it.
      (recs, get) =>
        `${wonCount(recs)}, margins ${margins(recs)}${few.every((seed) => aceCap(seed, get) >= 100) ? ` ${VACUOUS_NOTE}` : ''}`,
      seedRuns('par', few),
    ),
  );

  const castsAbilities = b.parBuild.steps.some((st) => st.kind === 'ability');
  if (castsAbilities) {
    const label = 'parNoAbilities';
    checks.push(
      perRun(
        'abilities',
        'par without its ability casts scores below par',
        label,
        few,
        (rec, get) => {
          const par = get({ build: 'par', seed: rec.seed });
          return rec.marginPct < par.marginPct
            ? null
            : `margin ${fmtPct(rec.marginPct)} is not below par's ${fmtPct(par.marginPct)}: the casts change nothing`;
        },
        (recs) => recs.map(describeRun).join(', '),
        seedRuns('par', few),
      ),
    );
  }
  return checks;
}

/** #14 par under each story-flag value the map's scripts read, and #15 with each companion pick. */
export function variantChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  few: readonly number[],
  band: Band,
): CheckSpec[] {
  const b = map.builds;
  const checks: CheckSpec[] = [];
  // #14: par passes #1–2 under each value of each story flag the map's scripts read (seeds 1–3).
  for (const [flag, values] of Object.entries(b.flagVariants)) {
    for (const value of values) {
      checks.push(
        perRun(
          '14',
          `par with ${flag} = ${String(value)} wins with its margin in band`,
          flagVariantLabel(flag, value),
          few,
          (rec) => {
            if (rec.result?.outcome !== 'won') return describeRun(rec);
            if (band === null) return `act ${map.act} has no par band yet`;
            return rec.marginPct >= band.lo && rec.marginPct <= band.hi
              ? null
              : `margin ${fmtPct(rec.marginPct)} is outside the band ${band.lo}–${band.hi}`;
          },
          (recs) => `${wonCount(recs)}, margins ${margins(recs)}`,
        ),
      );
    }
  }

  // #15: on a pick-list map (the finale), par passes #1–2 with each companion (seeds 1–3).
  if (map.companion !== null && 'pick' in map.companion) {
    for (const id of map.companion.pick) {
      checks.push(
        perRun(
          '15',
          `par with ${id} wins with its margin in band`,
          `companion:${id}`,
          few,
          (rec) => {
            if (rec.result?.outcome !== 'won') return describeRun(rec);
            if (band === null) return `act ${map.act} has no par band yet`;
            return rec.marginPct >= band.lo && rec.marginPct <= band.hi
              ? null
              : `margin ${fmtPct(rec.marginPct)} is outside the band ${band.lo}–${band.hi}`;
          },
          (recs) => `${wonCount(recs)}, margins ${margins(recs)}`,
        ),
      );
    }
  }
  return checks;
}

/** #11 determinism: par on seed 1, run twice, gives the same hash, outcome, and ticks. */
export function determinismCheck(): CheckSpec {
  const once: RunRequest = { build: 'par', seed: 1 };
  const again: RunRequest = { build: 'par', seed: 1, repeat: true };
  return {
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
  };
}
