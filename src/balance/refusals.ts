// Checks the harness can't make yet (conventions.md § Balance sims, "Refused, not skipped"): a
// map that needs one fails loudly with the task it waits for, instead of passing untested.
import type { CompiledMapDef } from '../content/compiled.ts';
import { JAMMER_ENEMIES } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import type { CheckSpec } from './checks.ts';

/** A check that fails with `attempt`'s error (features the harness can't check yet). */
export function refusal(
  id: string,
  title: string,
  subject: string,
  attempt: () => void,
): CheckSpec {
  return {
    id,
    title,
    subject,
    needs: [],
    evaluate() {
      try {
        attempt();
      } catch (err) {
        return {
          ok: false,
          summary: 'refused',
          failures: [err instanceof Error ? err.message : String(err)],
        };
      }
      return { ok: true, summary: 'ok', failures: [] };
    },
  };
}

export type HarnessFeature =
  /** #2 Escort margins: Evacuated % (from the start or by a pivot; T305c). */
  | 'objectives'
  /** #2 the Holdout's Evacuated floor instead of a win (A3M3). */
  | 'holdout'
  /** #2 the Choir escort's Voices margins (the finale). */
  | 'choir'
  /** #2 a Protect map's margin: min(core %, asset %) (D101). */
  | 'protect'
  /** #14 one par run per story-flag value. */
  | 'flagVariants'
  /** #15 one par run per companion on a pick-list map. */
  | 'companionPick'
  /** #16 Hold Fire and spareFleeing runs on maps with fleeing or quiet-wave groups. */
  | 'holdFireRuns'
  /** #10 the jam limit. */
  | 'jamLimit';

/**
 * The harness's own refusals: map features whose assertions (#2, #10, #14–#16) or runs it can't
 * make yet, keyed by assertion, with the task that lifts each (`null` once it's checked). Like
 * the sim's FEATURE_GATES (sim/gates.ts), each task flips only its own row.
 */
export const HARNESS_GATES: Readonly<Record<HarnessFeature, string | null>> = Object.freeze({
  objectives: null,
  // M6 (D141): the Holdout's floor (T605, live); the finale's Voices (M8).
  holdout: null,
  choir: 'M8',
  protect: null,
  flagVariants: null,
  companionPick: null,
  holdFireRuns: null,
  // The jam-limit check (#10; balance/jamLimit.ts) landed with the jamming core (D146: T702).
  jamLimit: null,
});

/**
 * Map features whose assertions or runs the harness can't make yet (HARNESS_GATES): refused, so
 * a map that needs them fails loudly instead of passing untested.
 */
export function refusedFeatures<K extends IdSpace>(
  map: CompiledMapDef<K>,
  gates: Readonly<Record<HarnessFeature, string | null>> = HARNESS_GATES,
): CheckSpec[] {
  const out: CheckSpec[] = [];
  const refuse = (feature: HarnessFeature, id: string, title: string, why: string): void => {
    const owner = gates[feature];
    if (owner === null) return;
    out.push(
      refusal(id, title, '*', () => {
        throw new RangeError(`${why} (${owner})`);
      }),
    );
  };
  if (map.objective === 'escort') {
    refuse('objectives', '2', 'escort margins', 'an Escort margin is Evacuated %');
  }
  if (map.objective === 'holdout') {
    refuse('holdout', '2', 'holdout floor', 'a Holdout asserts an Evacuated floor, not a win');
  }
  if (map.objective === 'choir') {
    refuse('choir', '2', 'choir margins', 'a Choir margin is Voices %');
  }
  if (map.objective === 'protect') {
    refuse('protect', '2', 'protect margins', 'a Protect margin is min(core %, asset %)');
  }
  if (Object.keys(map.builds.flagVariants).length > 0) {
    refuse('flagVariants', '14', 'flag variants', 'flag-variant runs need story flags in the sim');
  }
  if (map.companion !== null && 'pick' in map.companion) {
    refuse(
      'companionPick',
      '15',
      'companion pick list',
      'companion runs need companions in the sim',
    );
  }
  const groups = map.waves.flatMap((w) => w.groups);
  if (groups.some((g) => g.tags.includes('fleeing') || g.tags.includes('quiet_wave'))) {
    refuse(
      'holdFireRuns',
      '16',
      'free choices stay free',
      'Hold Fire and spareFleeing runs need those commands',
    );
  }
  if (groups.some((g) => JAMMER_ENEMIES.includes(g.enemy.id))) {
    refuse('jamLimit', '10', 'jam limit', 'the jam-limit check needs jammers in the sim');
  }
  return out;
}

/** Assertions not made for any map yet, listed in each map's report (none since T204b). */
export const NOT_CHECKED: readonly string[] = [];
