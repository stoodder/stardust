// The balance checks' common kit (conventions.md § Balance sims, the numbered table): run requests
// and records, run labels and their meta, and the helpers every check family judges with. Each
// check names the build it's about (its subject, for `--build`), the runs it needs, and how it
// judges them. The families are parChecks.ts, counterChecks.ts, altChecks.ts, and
// freeChoiceChecks.ts, assembled per map by mapChecks.ts (T225). Checks the harness can't make
// yet are refused for maps that need them, never skipped quietly (refusals.ts).
import type { CompiledMapDef } from '../content/compiled.ts';
import type { FlagValue, IdSpace } from '../content/types.ts';
import type { HeadlessResult, ScriptFlags } from '../sim/index.ts';
import { isScriptFlagId } from '../story/flags.ts';
import { LEAK_LEAD_WAVES, MAX_WAVE_LOSS_PCT } from './rules.ts';

/**
 * One run: a build label ('par', 'none', 'alwaysCallEarly', 'parNoAbilities', 'spareFleeing',
 * 'holdFireWhile:quiet_wave', 'companion:x', 'flag:x=v', 'alt:x', 'noCounter:x', 'guard:x'), run on the map's
 * reference profile on Standard unless a `@<meta>` suffix says otherwise ('par@story',
 * 'noCounter:armor@fullCatalog', 'par@rnd:orbital_strike_mk2'; `splitMeta`).
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
  /**
   * Par margin % (design/maps.md § 6.1; `marginOf`): integrity left ÷ max integrity, and on a
   * Protect map the lower of that and the asset's; 0 without a result.
   */
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

/**
 * A run's margin % (design/maps.md § 6.1): integrity left ÷ max integrity × 100, and on a Protect
 * map the lower of that and asset left ÷ max asset (D101: the weaker objective decides, as losing
 * either loses), so a loss is 0.
 */
export function marginOf(
  r: Pick<HeadlessResult, 'integrity' | 'maxIntegrity' | 'asset' | 'maxAsset'>,
): number {
  const core = (100 * r.integrity) / r.maxIntegrity;
  if (r.maxAsset <= 0) return core;
  const asset = (100 * r.asset) / r.maxAsset;
  return asset < core ? asset : core;
}

export const runKey = (r: RunRequest): string => `${r.build}#${r.seed}${r.repeat ? '#again' : ''}`;

/**
 * A run's meta (balance/profile.ts): the reference profile on Standard (`standard`) or on Story
 * (`story`, assertion 9), the full-catalog profile on Standard (`fullCatalog`, assertion 6), or
 * the reference profile with one R&D pick bought (`rnd:<upgrade id>`, the `rnd` check).
 */
export type RunMeta = 'standard' | 'story' | 'fullCatalog' | `rnd:${string}`;

/**
 * A run label's build and meta: 'par@story' → par on Story; 'par' → par on Standard;
 * 'par@rnd:orbital_strike_mk2' → par with Mk II bought.
 */
export function splitMeta(label: string): { readonly build: string; readonly meta: RunMeta } {
  const at = label.lastIndexOf('@');
  if (at < 0) return { build: label, meta: 'standard' };
  const meta = label.slice(at + 1);
  if (meta === 'story' || meta === 'fullCatalog') return { build: label.slice(0, at), meta };
  if (meta.startsWith('rnd:') && meta.length > 4) {
    return { build: label.slice(0, at), meta: `rnd:${meta.slice(4)}` };
  }
  throw new RangeError(`unknown run meta '${meta}' in '${label}'`);
}

/** The run label of par under one story-flag value (#14): 'flag:door_choice=convoy'. */
export const flagVariantLabel = (flag: string, value: FlagValue): string =>
  `flag:${flag}=${String(value)}`;

/**
 * The story flags a run sets (`SimConfig.scriptFlags`): for a 'flag:x=v' label, x set to the
 * `flagVariants` value that reads v; none for other labels. Null for a 'flag:' label naming a
 * value the map doesn't list.
 */
export function flagsFor<K extends IdSpace>(
  label: string,
  map: CompiledMapDef<K>,
): ScriptFlags | null {
  const build = splitMeta(label).build;
  if (!build.startsWith('flag:')) return {};
  for (const [flag, values] of Object.entries(map.builds.flagVariants)) {
    if (!isScriptFlagId(flag)) continue; // the type allows only script flags
    for (const value of values) {
      if (flagVariantLabel(flag, value) === build) return { [flag]: value };
    }
  }
  return null;
}

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

export const seedRuns = (build: string, seeds: readonly number[]): RunRequest[] =>
  seeds.map((seed) => ({ build, seed }));

/** A check over one build's runs, judging each with `judge` (a failure message, or null). */
export function perRun(
  id: string,
  title: string,
  build: string,
  seeds: readonly number[],
  judge: (rec: RunRecord, get: (r: RunRequest) => RunRecord) => string | null,
  summarize: (recs: readonly RunRecord[], get: (r: RunRequest) => RunRecord) => string,
  extraNeeds: readonly RunRequest[] = [],
  subject: string = build,
): CheckSpec {
  const needs = [...seedRuns(build, seeds), ...extraNeeds];
  return {
    id,
    title,
    subject,
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

export const wonCount = (recs: readonly RunRecord[]): string =>
  `${recs.filter((r) => r.result?.outcome === 'won').length}/${recs.length} won`;
export const margins = (recs: readonly RunRecord[]): string =>
  recs.map((r) => fmtPct(r.marginPct)).join(' / ');
export const won = (rec: RunRecord): string | null =>
  rec.result?.outcome === 'won' ? null : describeRun(rec);

/**
 * Integrity lost per wave, "0,0,3,8,9" (waves that never started read 0); on a Protect map each
 * wave adds its asset loss, "0,2+1a,3".
 */
export const lossPerWave = (r: HeadlessResult | null): string =>
  r === null
    ? '-'
    : r.waves
        .map((w) => (w.assetLost > 0 ? `${w.integrityLost}+${w.assetLost}a` : `${w.integrityLost}`))
        .join(',');

/**
 * Why a run hits a wall rather than losing gradually (the `gradual` check, D028), or null: a
 * wave that costs more than MAX_WAVE_LOSS_PCT of max integrity (or of a Protect map's asset
 * meter), or a loss in the very wave its leaks start (they must start LEAK_LEAD_WAVES earlier).
 */
export function notGradual(r: HeadlessResult): string | null {
  const cap = (r.maxIntegrity * MAX_WAVE_LOSS_PCT) / 100;
  const wall = r.waves.find((w) => w.integrityLost > cap);
  if (wall !== undefined) {
    return `W${wall.wave} costs ${wall.integrityLost} of ${r.maxIntegrity} integrity, over ${MAX_WAVE_LOSS_PCT}%`;
  }
  const assetCap = (r.maxAsset * MAX_WAVE_LOSS_PCT) / 100;
  const assetWall = r.maxAsset > 0 ? r.waves.find((w) => w.assetLost > assetCap) : undefined;
  if (assetWall !== undefined) {
    return `W${assetWall.wave} costs ${assetWall.assetLost} of ${r.maxAsset} asset, over ${MAX_WAVE_LOSS_PCT}%`;
  }
  if (r.outcome === 'lost') {
    const lost = r.lostAtWave ?? r.waves.length;
    const first = r.waves.find((w) => w.integrityLost > 0 || w.assetLost > 0)?.wave ?? lost;
    if (first > lost - LEAK_LEAD_WAVES) {
      return `it loses in W${lost}, but its leaks only start in W${first} (they must start by W${lost - LEAK_LEAD_WAVES})`;
    }
  }
  return null;
}
