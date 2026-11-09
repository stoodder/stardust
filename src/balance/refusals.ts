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

/**
 * Map features whose assertions (#10, #14–#18) or runs the harness can't make yet: refused, so a
 * map that needs them fails loudly instead of passing untested.
 */
export function refusedFeatures<K extends IdSpace>(map: CompiledMapDef<K>): CheckSpec[] {
  const out: CheckSpec[] = [];
  const refuse = (id: string, title: string, why: string): void => {
    out.push(
      refusal(id, title, '*', () => {
        throw new RangeError(why);
      }),
    );
  };
  if (map.objective !== 'defend' && map.objective !== 'protect') {
    refuse(
      '2',
      `${map.objective} margins`,
      `the harness measures only integrity margins until T305`,
    );
  }
  if (Object.keys(map.builds.flagVariants).length > 0) {
    refuse('14', 'flag variants', 'flag-variant runs need story flags in the sim (M3)');
  }
  if (map.companion !== null && 'pick' in map.companion) {
    refuse('15', 'companion pick list', 'companion runs need companions in the sim (T207)');
  }
  const groups = map.waves.flatMap((w) => w.groups);
  if (groups.some((g) => g.tags.includes('fleeing') || g.tags.includes('quiet_wave'))) {
    refuse(
      '16',
      'free choices stay free',
      'Hold Fire and spareFleeing runs need those commands (T206)',
    );
  }
  if (groups.some((g) => JAMMER_ENEMIES.includes(g.enemy.id))) {
    refuse('10', 'jam limit', 'the jam-limit check needs jammers in the sim (M3)');
  }
  return out;
}

/** Assertions not made in M1 for any map (architecture.md, M1 subset: Harness). */
export const NOT_CHECKED_IN_M1: readonly string[] = [
  '#9 Story difficulty (createSim refuses Story until it lands)',
];
