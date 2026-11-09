// #16, free choices stay free (conventions.md § Balance sims; D006): holding fire through the
// Quiet Wave, and sparing fleeing units, cost the player nothing they shouldn't. And the `flags`
// check: the runs a map names set (or leave unset) its run-end flags by the flags' own rules.
import type { CompiledMapDef, CompiledWaveGroup } from '../content/compiled.ts';
import { LEAK_FREE_TAGS } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { isFlagId } from '../content/dialogue/flags.ts';
import { evaluateFlagRule, flagRule } from '../story/flags.ts';
import {
  describeRun,
  fmtPct,
  margins,
  perRun,
  seedRuns,
  wonCount,
  type CheckSpec,
  type RunRecord,
} from './checks.ts';
import type { Band } from './parChecks.ts';
import { SPARE_FLEEING_SLACK_PCT } from './rules.ts';

/** Quiet-wave units leaked over spawned, "5/5". */
const quietLeaked = (r: HeadlessResult): string =>
  `${r.stats.tagLeaked.quiet_wave}/${r.stats.tagSpawned.quiet_wave}`;

/**
 * The integrity the Quiet Wave costs when every unit of it leaks, by design: each `quiet_wave` unit
 * that isn't leak-free (Old Thrum's leak 2; younglings leak 0). Holding fire costs this much and no
 * more, so #16a judges the band without it (core-loop.md § 2.7, rule 3).
 */
export function quietWaveCost<K extends IdSpace>(groups: readonly CompiledWaveGroup<K>[]): number {
  let cost = 0;
  for (const g of groups) {
    if (!g.tags.includes('quiet_wave') || g.tags.some((t) => LEAK_FREE_TAGS.includes(t))) continue;
    cost += g.count * g.enemy.leak;
  }
  return cost;
}

/** The run-end rule C1's flag comes from (content/dialogue/flags.ts). */
const SPARED_RULE = flagRule('spared_quiet_wave');

/**
 * #16, free choices stay free (D006): (a) on a map with a `quiet_wave` group, par with
 * `holdFireWhile: 'quiet_wave'` wins inside the band once the Quiet Wave's own designed cost
 * (`quietWaveCost`: the integrity its leaks are meant to cost) is given back, and its run sets
 * `spared_quiet_wave` by the flag's own run-end rule (story/flags.ts), whatever map the rule
 * names; (b) on a map with `fleeing` groups, the spareFleeing policy's margin is ≥ par's −
 * SPARE_FLEEING_SLACK_PCT on the same seed.
 */
export function freeChoiceChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  few: readonly number[],
  band: Band,
): CheckSpec[] {
  const groups = map.waves.flatMap((w) => w.groups);
  const out: CheckSpec[] = [];
  if (groups.some((g) => g.tags.includes('quiet_wave'))) {
    const cost = quietWaveCost(groups);
    out.push(
      perRun(
        '16',
        '(a) par holding fire through the Quiet Wave wins in band (its own cost given back) and sets spared_quiet_wave',
        'holdFireWhile:quiet_wave',
        few,
        (rec) => {
          const r = rec.result;
          if (r?.outcome !== 'won') return describeRun(rec);
          if (band === null) return `act ${map.act} has no par band yet`;
          const judged = Math.min(100, rec.marginPct + (100 * cost) / r.maxIntegrity);
          if (judged < band.lo || judged > band.hi) {
            return `margin ${fmtPct(rec.marginPct)} (${fmtPct(judged)} with the Quiet Wave's own ${cost} integrity given back) is outside the band ${band.lo}–${band.hi}`;
          }
          if (SPARED_RULE === undefined) return 'no run-end rule sets spared_quiet_wave';
          return evaluateFlagRule(SPARED_RULE.value, r.stats)
            ? null
            : `only ${quietLeaked(r)} quiet-wave units leaked: spared_quiet_wave stays false`;
        },
        (recs) =>
          `${wonCount(recs)}, margins ${margins(recs)}, quiet wave leaked ${recs
            .map((r) => (r.result === null ? '-' : quietLeaked(r.result)))
            .join(' / ')}`,
      ),
    );
  }
  if (groups.some((g) => g.tags.includes('fleeing'))) {
    out.push(
      perRun(
        '16',
        `(b) spareFleeing's margin ≥ par's − ${SPARE_FLEEING_SLACK_PCT}`,
        'spareFleeing',
        few,
        (rec, get) => {
          const par = get({ build: 'par', seed: rec.seed });
          const floor = par.marginPct - SPARE_FLEEING_SLACK_PCT;
          return rec.marginPct >= floor
            ? null
            : `margin ${fmtPct(rec.marginPct)} is below par's ${fmtPct(par.marginPct)} − ${SPARE_FLEEING_SLACK_PCT}`;
        },
        (recs, get) =>
          `margins ${margins(recs)} vs par ${few.map((seed) => fmtPct(get({ build: 'par', seed }).marginPct)).join(' / ')}${hushNote(recs)}`,
        seedRuns('par', few),
      ),
    );
  }
  return out;
}

/** ", hushes 2 / 0 / 1" when any run had a hush (the cost of sparing on a mixed wave), else "". */
function hushNote(recs: readonly RunRecord[]): string {
  const n = recs.map((r) => r.result?.hushes ?? 0);
  return n.some((h) => h > 0) ? `, hushes ${n.join(' / ')}` : '';
}

/**
 * The `flags` check (T412): for each run-end flag the map's builds list (`runEndFlags`), every
 * run in `setBy` wins and its stats make the flag's own run-end rule (content/dialogue/flags.ts,
 * evaluated by story/flags.ts) true, and every run in `notSetBy` leaves it false. A2M3's
 * `held_fire_second_look`: par holding fire on each fleeing group sets it; par, and the Spare
 * runners filter alone (spareFleeing), don't.
 */
export function runEndFlagChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  few: readonly number[],
): CheckSpec[] {
  const out: CheckSpec[] = [];
  for (const [flag, runs] of Object.entries(map.builds.runEndFlags)) {
    if (runs === undefined || !isFlagId(flag)) continue; // the type allows only flag ids
    const rule = flagRule(flag);
    const holds = (r: HeadlessResult): boolean | null =>
      rule === undefined ? null : evaluateFlagRule(rule.value, r.stats);
    const noRule = `no run-end rule sets ${flag} (content/dialogue/flags.ts FLAG_RULES)`;
    for (const label of runs.setBy) {
      out.push(
        perRun(
          'flags',
          `${label} wins and sets ${flag}`,
          label,
          few,
          (rec) => {
            const r = rec.result;
            if (r?.outcome !== 'won') return describeRun(rec);
            const h = holds(r);
            return h === null ? noRule : h ? null : `${flag}'s rule is false: ${flagStats(r)}`;
          },
          (recs) => `${wonCount(recs)}; ${seedStats(recs)}`,
        ),
      );
    }
    for (const label of runs.notSetBy) {
      out.push(
        perRun(
          'flags',
          `${label} leaves ${flag} unset`,
          label,
          few,
          (rec) => {
            const h = holds(rec.result!); // perRun judges only runs with a result
            return h === null
              ? noRule
              : h
                ? `${flag}'s rule holds: ${flagStats(rec.result)}`
                : null;
          },
          (recs) => seedStats(recs),
        ),
      );
    }
  }
  return out;
}

/** flagStats for each seed's run, each distinct line once ("…; …" when seeds differ). */
const seedStats = (recs: readonly RunRecord[]): string =>
  [...new Set(recs.map((r) => flagStats(r.result)))].join('; ');

/** The stats run-end rules read most: "fleeing leaked 9/14, quiet 5/7, Hold Fire used 2×". */
function flagStats(r: HeadlessResult | null): string {
  if (r === null) return '-';
  const { tagSpawned, tagLeaked, holdFireUses } = r.stats;
  const parts: string[] = [];
  for (const tag of ['fleeing', 'quiet_wave', 'youngling'] as const) {
    if (tagSpawned[tag] > 0) parts.push(`${tag} leaked ${tagLeaked[tag]}/${tagSpawned[tag]}`);
  }
  parts.push(`Hold Fire used ${holdFireUses}×`);
  return parts.join(', ');
}
