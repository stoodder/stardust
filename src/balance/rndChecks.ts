// The R&D pick checks (`rnd`; D060, T228; conventions.md § Balance sims): par is run with each R&D
// pick the map allows (profile.ts `rndPicks`: Orbital Strike Mk II, a Companion Rapport) and must
// still win; and each pick the map lists in `rndPickChanges` must change a par result there (an
// outcome, a margin, or a medal), so the Intel choice is felt on the maps that promise it.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import {
  describeRun,
  margins,
  perRun,
  seedRuns,
  won,
  type CheckSpec,
  type RunRecord,
} from './checks.ts';
import { medalMarks } from './medals.ts';
import { refusal } from './refusals.ts';

/** The run label of par with R&D pick `pick` bought: 'par@rnd:orbital_strike_mk2'. */
export const rndPickLabel = (pick: string): string => `par@rnd:${pick}`;

/** The run's result as the `rnd` check compares it: outcome, margin, and medals earned. */
const resultOf = (rec: RunRecord): string =>
  rec.result === null ? describeRun(rec) : `${describeRun(rec)} ${medalMarks(rec.result)}`;

/**
 * For each allowed pick: par with it bought wins (seeds `few`). For each pick in the map's
 * `rndPickChanges`: it changes a par result on at least one of those seeds; a listed pick the map
 * doesn't allow fails with the allowed list.
 */
export function rndPickChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  picks: readonly string[],
  few: readonly number[],
): CheckSpec[] {
  const checks: CheckSpec[] = [];
  for (const pick of picks) {
    const label = rndPickLabel(pick);
    checks.push(
      perRun(
        'rnd',
        `par with R&D pick ${pick} wins`,
        label,
        few,
        won,
        (recs, get) =>
          `margins ${margins(recs)} vs par ${margins(few.map((seed) => get({ build: 'par', seed })))}`,
        seedRuns('par', few),
        `rnd:${pick}`,
      ),
    );
  }
  for (const pick of map.builds.rndPickChanges) {
    const subject = `rnd:${pick}`;
    if (!picks.includes(pick)) {
      checks.push(
        refusal('rnd', `R&D pick ${pick} changes a par result`, subject, () => {
          throw new RangeError(
            `'${pick}' isn't an R&D pick this map allows (allowed: ${picks.join(', ') || 'none'})`,
          );
        }),
      );
      continue;
    }
    const label = rndPickLabel(pick);
    checks.push({
      id: 'rnd',
      title: `R&D pick ${pick} changes a par result`,
      subject,
      needs: [...seedRuns('par', few), ...seedRuns(label, few)],
      evaluate(get) {
        const pairs = few.map((seed) => {
          const par = get({ build: 'par', seed });
          const bought = get({ build: label, seed });
          return { seed, was: resultOf(par), now: resultOf(bought) };
        });
        const changed = pairs.filter((p) => p.was !== p.now).map((p) => p.seed);
        const summary = pairs.map((p) => `seed ${p.seed}: ${p.was} → ${p.now}`).join('; ');
        return changed.length > 0
          ? { ok: true, summary: `changed on seed ${changed.join(', ')}; ${summary}`, failures: [] }
          : { ok: false, summary, failures: [`no par result changes with ${pick}: ${summary}`] };
      },
    });
  }
  return checks;
}
