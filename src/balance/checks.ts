// The per-map assertions (conventions.md § Balance sims, the numbered table). Each check names
// the build it's about (its subject, for `--build`), the runs it needs, and how it judges them.
// Checks the harness can't make yet are refused for maps that need them, never skipped quietly.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { fullCatalogModifiers } from './profile.ts';
import { refusal } from './refusals.ts';
import {
  EARLY_CALL_SLACK_PCT,
  FORGIVING_FLOOR_PCT,
  LEAK_LEAD_WAVES,
  MAX_WAVE_LOSS_PCT,
  noCounterLoseByWave,
  parBand,
} from './rules.ts';

/**
 * One run: a build label ('par', 'none', 'alwaysCallEarly', 'parNoAbilities', 'companion:x', 'alt:x',
 * 'noCounter:x', 'guard:x').
 */
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

/** Check #7's summary note when its cap is 100 on every seed, so the fairness bound can't fail. */
export const VACUOUS_NOTE = '(cap 100: the fairness bound is vacuous; only the win is checked)';

const seedRuns = (build: string, seeds: readonly number[]): RunRequest[] =>
  seeds.map((seed) => ({ build, seed }));

/** A check over one build's runs, judging each with `judge` (a failure message, or null). */
function perRun(
  id: string,
  title: string,
  build: string,
  seeds: readonly number[],
  judge: (rec: RunRecord, get: (r: RunRequest) => RunRecord) => string | null,
  summarize: (recs: readonly RunRecord[], get: (r: RunRequest) => RunRecord) => string,
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
      return { ok: failures.length === 0, summary: summarize(recs, get), failures };
    },
  };
}

const wonCount = (recs: readonly RunRecord[]): string =>
  `${recs.filter((r) => r.result?.outcome === 'won').length}/${recs.length} won`;
const margins = (recs: readonly RunRecord[]): string =>
  recs.map((r) => fmtPct(r.marginPct)).join(' / ');
const won = (rec: RunRecord): string | null =>
  rec.result?.outcome === 'won' ? null : describeRun(rec);

/** Integrity lost per wave, "0,0,3,8,9" (waves that never started read 0). */
export const lossPerWave = (r: HeadlessResult | null): string =>
  r === null ? '-' : r.waves.map((w) => w.integrityLost).join(',');

/**
 * Why a run hits a wall rather than losing gradually (the `gradual` check, D028), or null: a
 * wave that costs more than MAX_WAVE_LOSS_PCT of max integrity, or a loss in the very wave its
 * leaks start (they must start LEAK_LEAD_WAVES earlier).
 */
export function notGradual(r: HeadlessResult): string | null {
  const cap = (r.maxIntegrity * MAX_WAVE_LOSS_PCT) / 100;
  const wall = r.waves.find((w) => w.integrityLost > cap);
  if (wall !== undefined) {
    return `W${wall.wave} costs ${wall.integrityLost} of ${r.maxIntegrity} integrity, over ${MAX_WAVE_LOSS_PCT}%`;
  }
  if (r.outcome === 'lost') {
    const lost = r.lostAtWave ?? r.waves.length;
    const first = r.waves.find((w) => w.integrityLost > 0)?.wave ?? lost;
    if (first > lost - LEAK_LEAD_WAVES) {
      return `it loses in W${lost}, but its leaks only start in W${first} (they must start by W${lost - LEAK_LEAD_WAVES})`;
    }
  }
  return null;
}

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
