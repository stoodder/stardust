// Every check for one map, in the report's order (T225: the families live in parChecks.ts,
// counterChecks.ts, altChecks.ts, and freeChoiceChecks.ts; their kit in checks.ts).
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { altBuildChecks } from './altChecks.ts';
import type { CheckSpec } from './checks.ts';
import { noCounterChecks } from './counterChecks.ts';
import { freeChoiceChecks } from './freeChoiceChecks.ts';
import {
  determinismCheck,
  parFairnessChecks,
  parOutcomeChecks,
  variantChecks,
} from './parChecks.ts';
import { parBand } from './rules.ts';

/**
 * Every check for `map` that needs runs. `every` and `few` are the seed lists; `leftOut` lists
 * the full-catalog grants the sim doesn't simulate yet (assertion 6 names them).
 */
export function mapChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  every: readonly number[],
  few: readonly number[],
  leftOut: readonly string[] = [],
): CheckSpec[] {
  const band = parBand(map.act, map.builds.marginBand);
  return [
    ...parOutcomeChecks(map, every, band),
    ...noCounterChecks(map, few, leftOut),
    ...parFairnessChecks(map, every, few, band),
    ...altBuildChecks(map, few),
    ...variantChecks(map, few, band),
    ...freeChoiceChecks(map, few, band),
    determinismCheck(),
  ];
}
