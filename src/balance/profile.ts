// Profiles → SimConfig (conventions.md § Balance sims, Profiles). A map's `referenceProfile` (what
// a Standard player owns there, design/progression.md § 10) becomes the run's modifiers. The
// composition goes through meta/modifiers.ts, the code the game uses, once meta exists (T204b);
// until then only a profile with no purchases can be composed, and anything else is refused
// rather than ignored (D013), so the harness never tests a different game than it claims to.
import type { CompiledBuild, CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace, LiveIds, ProfileDef } from '../content/types.ts';
import type { Modifier, SimConfig } from '../sim/index.ts';

/** The modifiers a profile grants. Throws a RangeError for purchases (not composable before T204b). */
export function profileModifiers<K extends IdSpace = LiveIds>(
  profile: ProfileDef<K>,
): Modifier<K>[] {
  const bought: string[] = [];
  if (profile.specs.length > 0) bought.push(`specs (${profile.specs.join(', ')})`);
  const shop = Object.keys(profile.shop);
  if (shop.length > 0) bought.push(`shop ranks (${shop.join(', ')})`);
  if (profile.protocols.length > 0) bought.push(`protocols (${profile.protocols.join(', ')})`);
  if (bought.length > 0) {
    throw new RangeError(
      `profile has purchases the harness can't compose until meta/modifiers.ts (T204b): ${bought.join('; ')}`,
    );
  }
  // Owning towers and an ability grants no modifier: they only allow a loadout.
  return [];
}

/**
 * The full-catalog profile (assertion 6: every shop and R&D upgrade at max rank, every protocol
 * slot filled). It needs the meta catalog, so it's refused until T204b.
 */
export function fullCatalogModifiers<K extends IdSpace = LiveIds>(): Modifier<K>[] {
  throw new RangeError("the full-catalog profile needs the meta catalog (T204b); it can't run yet");
}

/** A Standard-difficulty config for one run of `build` on `map`. */
export function runConfig<K extends IdSpace = LiveIds>(
  content: CompiledContent<K>,
  map: CompiledMapDef<K>,
  build: CompiledBuild<K>,
  modifiers: readonly Modifier<K>[],
  seed: number,
): SimConfig<K> {
  return {
    content,
    mapId: map.id,
    seed,
    loadout: build.loadout,
    // createSim refuses a companion until T207a, so a build that names one fails loudly.
    companion: build.companion,
    modifiers,
    difficulty: 'standard',
    abilities: { slot1: build.technicianAbility, slot2: null, slot2State: 'none' },
    scriptFlags: {},
    specsUnlocked: [],
  };
}
