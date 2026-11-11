// Conditions over story flags alone (a map's `lockedAbilities`; D150): `flag` atoms and
// `all`/`any`/`not` over them. Such a condition is fixed before a battle starts, so the loadout
// screen, the build validator and createSim judge it the same way, over the run's script flags.
// Pure.
import type { ConditionDef, IdSpace } from './types.ts';

/** Whether `c` reads story flags only (validateBuilds' [locked-abilities] requires it). */
export function isFlagCondition(c: ConditionDef<IdSpace>): boolean {
  if ('flag' in c) return true;
  if ('all' in c) return c.all.every(isFlagCondition);
  if ('any' in c) return c.any.every(isFlagCondition);
  if ('not' in c) return isFlagCondition(c.not);
  return false;
}

/**
 * Whether a flag condition holds over `flags` (unset never matches a `flag` atom). Any other atom
 * reads false: nothing has run yet, and validation keeps them out of the conditions this judges.
 */
export function flagConditionHolds(
  c: ConditionDef<IdSpace>,
  flags: Readonly<Record<string, unknown>>,
): boolean {
  if ('flag' in c) return Object.hasOwn(flags, c.flag) && flags[c.flag] === c.eq;
  if ('all' in c) return c.all.every((x) => flagConditionHolds(x, flags));
  if ('any' in c) return c.any.some((x) => flagConditionHolds(x, flags));
  if ('not' in c) return !flagConditionHolds(c.not, flags);
  return false;
}
