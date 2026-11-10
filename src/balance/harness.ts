// The balance harness (conventions.md § Balance sims): plans each map's runs from its checks,
// runs them headlessly, and judges them. Pure: the CLI (tools/sim.ts) passes in the clock and
// writes the files.
import type { CompiledBuild, CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace, LiveIds, WaveTag } from '../content/types.ts';
import { LIVE_CATALOG, type MetaCatalog } from '../meta/index.ts';
import { runHeadless } from '../sim/index.ts';
import {
  describeRun,
  flagsFor,
  fmtPct,
  marginOf,
  median,
  runKey,
  splitMeta,
  type RunMeta,
  type CheckOutcome,
  type CheckSpec,
  type RunRecord,
  type RunRequest,
} from './checks.ts';
import { noCounterAnswerChecks } from './counterChecks.ts';
import { mapChecks } from './mapChecks.ts';
import { medalChecks } from './medals.ts';
import { policyBuild, withHoldFireWhile, withoutAbilityCasts } from './policies.ts';
import { NOT_CHECKED, refusedFeatures } from './refusals.ts';
import {
  fullCatalogProfile,
  referenceRunProfile,
  rndPickProfile,
  rndPicks,
  runConfig,
  type RunProfile,
} from './profile.ts';
import { rndPickChecks } from './rndChecks.ts';
import {
  DEFAULT_SEED_COUNT,
  FEW_SEED_COUNT,
  MONOTONIC_TOLERANCE_PCT,
  RUN_BUDGET_MS,
  parBand,
} from './rules.ts';

export interface HarnessOptions {
  /** Seeds for the "every seed" checks (1..n); default DEFAULT_SEED_COUNT. */
  readonly seeds?: number;
  /** Run only the checks about this build (a label such as 'par', or an alt build's name). */
  readonly build?: string;
  /** Wall clock in ms for the map and campaign totals (the CLI passes performance.now). */
  readonly now?: () => number;
  /**
   * This thread's CPU time in ms (the CLI passes `cpuClockMs` from tools/simClock.ts): each run's
   * `ms`, which assertion 13 judges. CPU time, not wall time, so another process's load can't
   * trip it. Without it, runs fall back to `now`; without either, runtimes read 0.
   */
  readonly cpuNow?: () => number;
  readonly maxTicks?: number;
  /** The meta catalog profiles are built from (default: the live one; tests pass a fixture's). */
  readonly catalog?: MetaCatalog;
}

export interface CheckResult extends CheckOutcome {
  readonly id: string;
  readonly title: string;
  readonly subject: string;
}

export interface MapReport {
  readonly mapId: string;
  readonly act: CompiledMapDef['act'];
  readonly objective: CompiledMapDef['objective'];
  readonly band: { readonly lo: number; readonly hi: number } | null;
  ok: boolean;
  readonly checks: CheckResult[];
  readonly runs: readonly RunRecord[];
  readonly notChecked: string[];
  readonly ms: number;
}

export interface CampaignReport {
  readonly ok: boolean;
  readonly seeds: number;
  readonly build: string | null;
  readonly maps: readonly MapReport[];
  readonly ms: number;
}

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1);

/** The build a label names on `map`, or null for an unknown label. */
export function buildFor<K extends IdSpace>(
  label: string,
  map: CompiledMapDef<K>,
  content: CompiledContent<K>,
): CompiledBuild<K> | null {
  const b = map.builds;
  label = splitMeta(label).build;
  if (label === 'par') return b.parBuild;
  if (label === 'parNoAbilities') return withoutAbilityCasts(b.parBuild);
  if (label === 'none' || label === 'alwaysCallEarly' || label === 'spareFleeing') {
    return policyBuild(label, map, content.towers);
  }
  const [kind, name = ''] = label.split(':');
  if (kind === 'alt') return b.altBuilds[name] ?? null;
  // #16a and the run-end flag checks: par with Hold Fire while units with the tag are on the
  // field (the Quiet Wave; each fleeing group), on a map whose waves send that tag.
  if (kind === 'holdFireWhile') {
    const tag = mapTag(map, name);
    return tag === null ? null : withHoldFireWhile(b.parBuild, tag);
  }
  // #14: par under one story-flag value (flagsFor gives the flags).
  if (kind === 'flag') return flagsFor(label, map) === null ? null : b.parBuild;
  if (kind === 'companion') {
    // #15: par with one companion from the map's pick list.
    const pick = map.companion !== null && 'pick' in map.companion ? map.companion.pick : [];
    const id = pick.find((c) => c === name);
    return id === undefined ? null : { ...b.parBuild, companion: id };
  }
  if (kind === 'noCounter') {
    const entry = Object.entries(b.noCounterBuilds).find(([c]) => c === name);
    return entry?.[1] ?? null;
  }
  if (kind === 'guard') {
    const guard = b.guards[name];
    return guard === undefined ? null : policyBuild(guard.policy, map, content.towers);
  }
  return null;
}

/** `name` as a wave tag some group of `map` carries, or null. */
function mapTag<K extends IdSpace>(map: CompiledMapDef<K>, name: string): WaveTag | null {
  for (const w of map.waves) {
    for (const g of w.groups) {
      const tag = g.tags.find((t) => t === name);
      if (tag !== undefined) return tag;
    }
  }
  return null;
}

/** Whether `--build <name>` selects a check about `subject` ('rivet_only' matches 'alt:rivet_only'). */
const selects = (name: string, subject: string): boolean =>
  subject === name || subject.slice(subject.indexOf(':') + 1) === name;

/** Runs and judges every check for one map. */
export function runMap<K extends IdSpace = LiveIds>(
  content: CompiledContent<K>,
  mapId: K['map'],
  opts: HarnessOptions = {},
): MapReport {
  const now = opts.now ?? ((): number => 0);
  const cpuNow = opts.cpuNow ?? now;
  const t0 = now();
  const map = content.maps[mapId];
  const n = opts.seeds ?? DEFAULT_SEED_COUNT;
  const every = range(n);
  const few = range(Math.min(FEW_SEED_COUNT, n));
  const catalog = opts.catalog ?? LIVE_CATALOG;
  // The run profiles (conventions.md § Balance sims, Profiles), each built once; a profile the
  // mapping refuses fails every run that needs it, with the reason.
  const profiles = new Map<RunMeta, RunProfile<K> | string>();
  const profileFor = (meta: RunMeta): RunProfile<K> | string => {
    let p = profiles.get(meta);
    if (p === undefined) {
      try {
        p =
          meta === 'fullCatalog'
            ? fullCatalogProfile(map, content, catalog)
            : meta.startsWith('rnd:')
              ? rndPickProfile(map, content, meta.slice(4), catalog)
              : referenceRunProfile(map, content, meta === 'story' ? 'story' : 'standard', catalog);
      } catch (err) {
        p = `${meta} profile: ${err instanceof Error ? err.message : String(err)}`;
      }
      profiles.set(meta, p);
    }
    return p;
  };
  const catalogProfile = profileFor('fullCatalog');
  const leftOut = typeof catalogProfile === 'string' ? [] : catalogProfile.leftOut;
  let specs: CheckSpec[] = [
    ...refusedFeatures(map),
    ...mapChecks(map, every, few, leftOut),
    ...noCounterAnswerChecks(map, content),
    ...medalChecks(map, every),
    ...rndPickChecks(map, rndPicks(map, content, catalog), few),
  ];
  const only = opts.build;
  if (only !== undefined) {
    const known = [...new Set(specs.map((s) => s.subject).filter((s) => s !== '*'))];
    if (!known.some((s) => selects(only, s))) {
      throw new RangeError(`${mapId}: no build '${only}' (known: ${known.join(', ')})`);
    }
    specs = specs.filter((s) => s.subject === '*' || selects(only, s.subject));
  }

  const runs = new Map<string, RunRecord>();
  const execute = (req: RunRequest): RunRecord => {
    const build = buildFor(req.build, map, content);
    const profile = profileFor(splitMeta(req.build).meta);
    const base = { build: req.build, seed: req.seed, repeat: req.repeat === true };
    if (build === null) {
      return { ...base, error: `unknown build '${req.build}'`, result: null, marginPct: 0, ms: 0 };
    }
    if (typeof profile === 'string') {
      return { ...base, error: profile, result: null, marginPct: 0, ms: 0 };
    }
    const start = cpuNow();
    try {
      const cfg = runConfig(content, map, build, profile, req.seed, flagsFor(req.build, map) ?? {});
      const result = runHeadless(
        cfg,
        build,
        opts.maxTicks === undefined ? {} : { maxTicks: opts.maxTicks },
      );
      const marginPct = marginOf(result);
      return { ...base, error: null, result, marginPct, ms: cpuNow() - start };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { ...base, error, result: null, marginPct: 0, ms: cpuNow() - start };
    }
  };
  const get = (req: RunRequest): RunRecord => {
    const key = runKey(req);
    let rec = runs.get(key);
    if (rec === undefined) {
      rec = execute(req);
      runs.set(key, rec);
    }
    return rec;
  };
  for (const spec of specs) for (const req of spec.needs) get(req);

  const checks: CheckResult[] = [];
  for (const s of specs) {
    const { ok, summary, failures } = s.evaluate(get);
    checks.push({ id: s.id, title: s.title, subject: s.subject, ok, summary, failures });
  }
  const all = [...runs.values()];
  checks.push(...runLevelChecks(map, all));
  return {
    mapId,
    act: map.act,
    objective: map.objective,
    band: parBand(map.act, map.builds.marginBand),
    ok: checks.every((c) => c.ok),
    checks,
    runs: all,
    notChecked: [...NOT_CHECKED],
    ms: now() - t0,
  };
}

/**
 * Whether a run must get every one of its build's steps in before the map ends: par and the
 * sensible alt builds on their own profiles. Par on Story is exempt (T333: an easier map can end
 * before par's last buys, as A1M4's W9 buys behind its strike), and so is an under-built alt
 * (`outcome: 'lose' | 'either'`: a player who stops short may lose before the end of the plan).
 */
export function mustIssueEveryStep<K extends IdSpace>(
  map: CompiledMapDef<K>,
  label: string,
): boolean {
  const { build, meta } = splitMeta(label);
  if (build === 'par') return meta !== 'story';
  if (!build.startsWith('alt:')) return false;
  const name = build.slice(4);
  const expect = Object.hasOwn(map.builds.altExpectations, name)
    ? map.builds.altExpectations[name]
    : undefined;
  return expect?.outcome === undefined;
}

/** Assertions 12 and 13 (on CPU time: `HarnessOptions.cpuNow`) and clean build steps, over every run a map made. */
function runLevelChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  runs: readonly RunRecord[],
): CheckResult[] {
  const steps: string[] = [];
  const invariants: string[] = [];
  const slow: string[] = [];
  for (const rec of runs) {
    const name = `${rec.build} seed ${rec.seed}${rec.repeat ? ' (again)' : ''}`;
    if (rec.ms > RUN_BUDGET_MS) slow.push(`${name}: ${Math.round(rec.ms)} ms`);
    const r = rec.result;
    if (r === null) continue;
    for (const v of r.violations) invariants.push(`${name}: ${v}`);
    // Authored builds that should win must get every step in; no build may misfire a step.
    const mustFinish = mustIssueEveryStep(map, rec.build);
    for (const s of r.steps) {
      if (s.error !== null)
        steps.push(`${name}: step ${s.index} (${s.kind}, W${s.wave}) ${s.error}`);
      else if (mustFinish && s.issuedTick < 0) {
        steps.push(
          `${name}: step ${s.index} (${s.kind}, W${s.wave}) never issued (${describeRun(rec)})`,
        );
      }
    }
  }
  const maxMs = Math.max(0, ...runs.map((r) => r.ms));
  return [
    check('steps', 'build steps run cleanly', steps, `${runs.length} runs`),
    check('12', 'no invariant violations', invariants, `${runs.length} runs`),
    check('13', `each run within ${RUN_BUDGET_MS} ms CPU`, slow, `slowest ${Math.round(maxMs)} ms`),
  ];
}

/** A map-level check from its failures. */
function check(id: string, title: string, failures: string[], summary: string): CheckResult {
  return { id, title, subject: '*', ok: failures.length === 0, summary, failures };
}

/** Whether any wave of `map` sends a boss. */
const hasBoss = <K extends IdSpace>(map: CompiledMapDef<K>): boolean =>
  map.waves.some((w) => w.groups.some((g) => g.enemy.boss !== null));

/**
 * Assertion 3, across maps in campaign order: integrity and escort maps are separate chains. A map
 * with `rebaseline: true` (the first map after a boss, as A2M1 after A1M5's Matriarch; design/
 * maps.md § 6.1) isn't held to the map before it: its median must sit inside its own band
 * (its act's, or its override), and the chain goes on from it. The flag is refused on a map whose
 * campaign predecessor sends no boss.
 */
export function monotonicCheck<K extends IdSpace>(
  content: CompiledContent<K>,
  reports: readonly MapReport[],
): void {
  const last = new Map<string, number>();
  for (const report of reports) {
    const map = content.maps[report.mapId as K['map']];
    const chain = marginChain(map);
    const pars = report.runs.filter((r) => r.build === 'par' && !r.repeat).map((r) => r.marginPct);
    if (chain === null || pars.length === 0) continue;
    const med = median(pars);
    const prev = last.get(chain);
    last.set(chain, med);
    let outcome: CheckOutcome;
    if (map.builds.rebaseline) {
      outcome = rebaselineOutcome(content, map, med, prev);
    } else if (prev === undefined) {
      outcome = { ok: true, summary: 'first map in its chain', failures: [] };
    } else {
      const ok = med <= prev + MONOTONIC_TOLERANCE_PCT;
      outcome = {
        ok,
        summary: `median ${fmtPct(med)} vs previous ${fmtPct(prev)}`,
        failures: ok
          ? []
          : [
              `median par margin ${fmtPct(med)} > previous ${fmtPct(prev)} + ${MONOTONIC_TOLERANCE_PCT}`,
            ],
      };
    }
    report.checks.splice(2, 0, {
      id: '3',
      title: 'monotonic difficulty',
      subject: 'par',
      ...outcome,
    });
  }
}

/** Whether these script actions pivot the map into an Escort (`setObjective: 'escort'`). */
function pivotsToEscort(actions: readonly object[]): boolean {
  return actions.some((a) => 'setObjective' in a && a.setObjective === 'escort');
}

/**
 * The chain a map's par margin belongs to (#3; maps.md § 6.1): `escort` for an Escort or Choir
 * map, and for a map a script pivots into an Escort (A2M5: Defend → Escort, judged on Evacuated
 * %; T305c); none for a Holdout; `integrity` for the rest (Defend, Protect).
 */
export function marginChain<K extends IdSpace>(
  map: Pick<CompiledMapDef<K>, 'objective' | 'events' | 'objectives'>,
): 'escort' | 'integrity' | null {
  if (map.objective === 'holdout') return null;
  if (map.objective === 'escort' || map.objective === 'choir') return 'escort';
  if (
    map.events.some((e) => pivotsToEscort(e.actions)) ||
    map.objectives.some((o) => pivotsToEscort(o.onComplete))
  )
    return 'escort';
  return 'integrity';
}

/** #3 for a `rebaseline` map: after a boss, its median is judged against its own band. */
function rebaselineOutcome<K extends IdSpace>(
  content: CompiledContent<K>,
  map: CompiledMapDef<K>,
  med: number,
  prev: number | undefined,
): CheckOutcome {
  const campaign: readonly string[] = content.campaign;
  const before = campaign[campaign.indexOf(map.id) - 1];
  const beforeMap = before === undefined ? undefined : content.maps[before as K['map']];
  if (beforeMap === undefined || !hasBoss(beforeMap)) {
    return {
      ok: false,
      summary: 'rebaseline',
      failures: [
        `rebaseline: true is for the first map after a boss, and ${before ?? 'no map'} before it sends none`,
      ],
    };
  }
  const band = parBand(map.act, map.builds.marginBand);
  const was = prev === undefined ? '' : `, previous ${fmtPct(prev)}`;
  const summary = `re-baseline after ${before}'s boss: median ${fmtPct(med)} in its own band ${band === null ? 'none' : `${band.lo}–${band.hi}`}${was}`;
  if (band === null) {
    return { ok: false, summary, failures: [`act ${map.act} has no par band to re-baseline in`] };
  }
  const ok = med >= band.lo && med <= band.hi;
  return {
    ok,
    summary,
    failures: ok ? [] : [`median par margin ${fmtPct(med)} is outside ${band.lo}–${band.hi}`],
  };
}

/** The campaign maps a run covers: every one, or `mapId` only (a RangeError for an unknown id). */
export function campaignMapIds<K extends IdSpace>(
  content: CompiledContent<K>,
  mapId?: string,
): K['map'][] {
  const ids = content.campaign.filter((id) => mapId === undefined || id === mapId);
  if (mapId !== undefined && ids.length === 0) {
    throw new RangeError(`unknown campaign map '${mapId}' (maps: ${content.campaign.join(', ')})`);
  }
  return ids;
}

/**
 * Judges the whole campaign from its maps' reports, in campaign order (each from `runMap`, here or
 * in a worker: tools/sim.ts runs maps in parallel): the cross-map monotonic check (#3), skipped
 * with --map, and each map's verdict.
 */
export function judgeCampaign<K extends IdSpace>(
  content: CompiledContent<K>,
  reports: readonly MapReport[],
  opts: HarnessOptions & { readonly mapId?: string },
  ms: number,
): CampaignReport {
  // With --map, the earlier maps in the chain aren't run, so there's nothing to compare against.
  if (opts.mapId === undefined) monotonicCheck(content, reports);
  for (const r of reports) {
    if (opts.mapId !== undefined) {
      r.notChecked.push('#3 monotonic difficulty (needs a full run, without --map)');
    }
    r.ok = r.checks.every((c) => c.ok);
  }
  return {
    ok: reports.every((m) => m.ok),
    seeds: opts.seeds ?? DEFAULT_SEED_COUNT,
    build: opts.build ?? null,
    maps: reports,
    ms,
  };
}

/** Runs every campaign map (or `mapId` only) and judges the whole campaign, on this thread. */
export function runCampaign<K extends IdSpace = LiveIds>(
  content: CompiledContent<K>,
  opts: HarnessOptions & { readonly mapId?: string } = {},
): CampaignReport {
  const now = opts.now ?? ((): number => 0);
  const t0 = now();
  const reports = campaignMapIds(content, opts.mapId).map((id) => runMap(content, id, opts));
  return judgeCampaign(content, reports, opts, now() - t0);
}
