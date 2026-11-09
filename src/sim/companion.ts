// The companion slot (design/core-loop.md § 3.1): resolves a map's `companion` (one companion and
// its state, a pick list, or none) into SimConfig's `companion` and slot-2 fields. The game
// (app/, from the save) and the balance harness (balance/profile.ts) both build their configs
// through it, so slot 2 always holds the companion's own ability.
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type { CompanionId, IdSpace } from '../content/types.ts';
import type { SimConfig } from './config.ts';

/** SimConfig's companion fields. */
export interface CompanionSlot<K extends IdSpace> {
  readonly companion: CompanionId | null;
  readonly slot2: K['ability'] | null;
  readonly slot2State: SimConfig<K>['abilities']['slot2State'];
}

/** The ability whose `companion` is `id` (its slot-2 signature), or null if the content has none. */
export function companionAbility<K extends IdSpace>(
  content: CompiledContent<K>,
  id: CompanionId,
): K['ability'] | null {
  for (const def of Object.values<CompiledContent<K>['abilities'][K['ability']]>(
    content.abilities,
  )) {
    if (def.companion === id) return def.id;
  }
  return null;
}

/**
 * The companion slot for `map`. On a pick-list map, `picked` chooses (default: the list's first,
 * core-loop.md § 3.1's default); elsewhere it must be null or the map's own companion. An
 * `absent` companion keeps its ability in slot 2 (the HUD shows it dark) but can't use it.
 * Throws a RangeError for a pick the map doesn't offer.
 */
export function companionSlot<K extends IdSpace>(
  content: CompiledContent<K>,
  map: CompiledMapDef<K>,
  picked: CompanionId | null = null,
): CompanionSlot<K> {
  const c = map.companion;
  if (c === null) {
    if (picked !== null) throw new RangeError(`map '${map.id}' has no companion to pick`);
    return { companion: null, slot2: null, slot2State: 'none' };
  }
  if ('pick' in c) {
    const id = picked ?? c.pick[0] ?? null;
    if (id === null || !c.pick.includes(id)) {
      throw new RangeError(`map '${map.id}': '${String(picked)}' isn't in its companion pick list`);
    }
    return { companion: id, slot2: companionAbility(content, id), slot2State: 'present' };
  }
  if (picked !== null && picked !== c.id) {
    throw new RangeError(`map '${map.id}' has companion '${c.id}', not '${picked}'`);
  }
  return { companion: c.id, slot2: companionAbility(content, c.id), slot2State: c.state };
}
