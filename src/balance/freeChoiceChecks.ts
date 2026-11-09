// #16, free choices stay free (conventions.md § Balance sims; D006): holding fire through the
// Quiet Wave, and sparing fleeing units, cost the player nothing they shouldn't.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { evaluateFlagRule, flagRule } from '../story/flags.ts';
import {
  describeRun,
  fmtPct,
  margins,
  perRun,
  seedRuns,
  wonCount,
  type CheckSpec,
} from './checks.ts';
import type { Band } from './parChecks.ts';
import { SPARE_FLEEING_SLACK_PCT } from './rules.ts';

/** Quiet-wave units leaked over spawned, "5/5". */
const quietLeaked = (r: HeadlessResult): string =>
  `${r.stats.tagLeaked.quiet_wave}/${r.stats.tagSpawned.quiet_wave}`;

/** The run-end rule C1's flag comes from (content/dialogue/flags.ts). */
const SPARED_RULE = flagRule('spared_quiet_wave');

/**
 * #16, free choices stay free (D006): (a) on a map with a `quiet_wave` group, par with
 * `holdFireWhile: 'quiet_wave'` wins inside the band, and its run sets `spared_quiet_wave` by the
 * flag's own run-end rule (story/flags.ts), whatever map the rule names; (b) on a map with
 * `fleeing` groups, the spareFleeing policy's margin is ≥ par's − SPARE_FLEEING_SLACK_PCT on the
 * same seed.
 */
export function freeChoiceChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  few: readonly number[],
  band: Band,
): CheckSpec[] {
  const groups = map.waves.flatMap((w) => w.groups);
  const out: CheckSpec[] = [];
  if (groups.some((g) => g.tags.includes('quiet_wave'))) {
    out.push(
      perRun(
        '16',
        '(a) par holding fire through the Quiet Wave wins in band and sets spared_quiet_wave',
        'holdFireWhile:quiet_wave',
        few,
        (rec) => {
          const r = rec.result;
          if (r?.outcome !== 'won') return describeRun(rec);
          if (band === null) return `act ${map.act} has no par band yet`;
          if (rec.marginPct < band.lo || rec.marginPct > band.hi) {
            return `margin ${fmtPct(rec.marginPct)} is outside the band ${band.lo}–${band.hi}`;
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
          `margins ${margins(recs)} vs par ${few.map((seed) => fmtPct(get({ build: 'par', seed }).marginPct)).join(' / ')}`,
        seedRuns('par', few),
      ),
    );
  }
  return out;
}
