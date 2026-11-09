// Profiles → SimConfig (conventions.md § Balance sims, Profiles). A run's meta is a profile: a
// map's `referenceProfile` (what a Standard player owns there, design/progression.md § 10), or the
// full-catalog profile (assertion 6), on Standard or Story difficulty (assertion 9). Its modifiers
// come from meta/modifiers.ts, the code the game uses on a save, so the harness tests the real
// progression math. Anything the mapping or the sim can't take is refused, never ignored (D013),
// with one stated exception: the full catalog leaves out grants the sim doesn't simulate yet, and
// says which (`leftOut`).
import type { CompiledBuild, CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace, LiveIds, ProfileDef } from '../content/types.ts';
import {
  LIVE_CATALOG,
  maxRanks,
  metaModifiers,
  type MetaCatalog,
  type MetaLoadout,
} from '../meta/index.ts';
import {
  FEATURE_GATES,
  companionSlot,
  modifierFeature,
  type DifficultyId,
  type Modifier,
  type SimConfig,
} from '../sim/index.ts';

/**
 * The Field Protocols the full-catalog profile equips, one per slot (conventions.md assertion 6;
 * the rule is design/progression.md § 10).
 */
export const FULL_CATALOG_PROTOCOLS: readonly string[] = [
  'head_start',
  'emergency_bulkhead',
  'linked_up',
];

/** The profiles a run can use. */
export type ProfileKind = 'reference' | 'fullCatalog';

/** A run's meta: its modifiers, spec unlocks, and difficulty. */
export interface RunProfile<K extends IdSpace = LiveIds> {
  readonly kind: ProfileKind;
  readonly difficulty: DifficultyId;
  readonly modifiers: readonly Modifier<K>[];
  /** Towers whose tier-4 pair is unlocked; a run unlocks those in its loadout. */
  readonly specs: readonly K['tower'][];
  /** Grants the full catalog leaves out because the sim doesn't simulate them yet. */
  readonly leftOut: readonly string[];
}

/** Whether every tower and ability `m` names (or `'*'`) is in `content`. */
function namesOnly<K extends IdSpace>(
  m: Modifier<IdSpace>,
  content: CompiledContent<K>,
): m is Modifier<K> {
  if ((m.kind === 'towerStat' || m.kind === 'towerCost') && m.tower !== '*') {
    return Object.hasOwn(content.towers, m.tower);
  }
  if (m.kind === 'abilityStat' && m.ability !== '*') {
    return Object.hasOwn(content.abilities, m.ability);
  }
  return true;
}

/** `metaModifiers` narrowed to `content`'s ids. Throws a RangeError for an id it doesn't have. */
function modifiersFor<K extends IdSpace>(
  own: MetaLoadout,
  content: CompiledContent<K>,
  catalog: MetaCatalog,
): Modifier<K>[] {
  const out: Modifier<K>[] = [];
  for (const m of metaModifiers(own, catalog)) {
    if (!namesOnly(m, content)) {
      throw new RangeError(`${m.source} names a tower or ability this content doesn't have`);
    }
    out.push(m);
  }
  return out;
}

/**
 * The modifiers a profile grants on `difficulty`, through meta/modifiers.ts: its shop and R&D
 * ranks and equipped protocols, then the difficulty's. Owning towers and an ability grants none:
 * they only allow a loadout. Throws a RangeError for what the mapping refuses.
 */
export function profileModifiers<K extends IdSpace = LiveIds>(
  profile: ProfileDef<K>,
  content: CompiledContent<K>,
  difficulty: DifficultyId = 'standard',
  catalog: MetaCatalog = LIVE_CATALOG,
): Modifier<K>[] {
  return modifiersFor(
    { upgrades: profile.shop, protocols: profile.protocols, difficulty },
    content,
    catalog,
  );
}

/** A map's reference profile as a run profile (Standard unless `difficulty` says otherwise). */
export function referenceRunProfile<K extends IdSpace = LiveIds>(
  map: CompiledMapDef<K>,
  content: CompiledContent<K>,
  difficulty: DifficultyId = 'standard',
  catalog: MetaCatalog = LIVE_CATALOG,
): RunProfile<K> {
  const profile = map.builds.referenceProfile;
  return {
    kind: 'reference',
    difficulty,
    modifiers: profileModifiers(profile, content, difficulty, catalog),
    specs: profile.specs,
    leftOut: [],
  };
}

/**
 * The full-catalog profile (assertion 6): every shop and R&D upgrade in `catalog` at its top rank
 * and every protocol slot filled with FULL_CATALOG_PROTOCOLS, on Standard. Spec unlocks are
 * Engineering's (options, not power: progression.md § 10 lists none), so it keeps the map's
 * reference specs. A grant the sim still refuses (FEATURE_GATES) is left out and listed: today
 * that's Salvage Rights, which only acts on wreckage (M3), so no run the sim can make changes.
 */
export function fullCatalogProfile<K extends IdSpace = LiveIds>(
  map: CompiledMapDef<K>,
  content: CompiledContent<K>,
  catalog: MetaCatalog = LIVE_CATALOG,
): RunProfile<K> {
  const all = modifiersFor(
    { upgrades: maxRanks(catalog), protocols: FULL_CATALOG_PROTOCOLS, difficulty: 'standard' },
    content,
    catalog,
  );
  const modifiers: Modifier<K>[] = [];
  const leftOut: string[] = [];
  for (const m of all) {
    const owner = FEATURE_GATES[modifierFeature(m)];
    if (owner === null) modifiers.push(m);
    else if (!leftOut.includes(`${m.source} (${owner})`)) leftOut.push(`${m.source} (${owner})`);
  }
  return {
    kind: 'fullCatalog',
    difficulty: 'standard',
    modifiers,
    specs: map.builds.referenceProfile.specs,
    leftOut,
  };
}

/** A config for one run of `build` on `map` under `profile`. */
export function runConfig<K extends IdSpace = LiveIds>(
  content: CompiledContent<K>,
  map: CompiledMapDef<K>,
  build: CompiledBuild<K>,
  profile: Pick<RunProfile<K>, 'difficulty' | 'modifiers' | 'specs'>,
  seed: number,
): SimConfig<K> {
  // The map's companion fills slot 2; on a pick-list map the build's pick does (default: the
  // list's first). A pick the map doesn't offer throws, and the run reports it.
  const slot = companionSlot(content, map, build.companion);
  return {
    content,
    mapId: map.id,
    seed,
    loadout: build.loadout,
    companion: slot.companion,
    modifiers: profile.modifiers,
    difficulty: profile.difficulty,
    abilities: { slot1: build.technicianAbility, slot2: slot.slot2, slot2State: slot.slot2State },
    scriptFlags: {},
    specsUnlocked: profile.specs.filter((t) => build.loadout.includes(t)),
  };
}

/** A Standard profile with no purchases (unit tests and A1M1's robustness test). */
export const NO_PURCHASES: {
  readonly difficulty: 'standard';
  readonly modifiers: readonly never[];
  readonly specs: readonly never[];
} = { difficulty: 'standard', modifiers: [], specs: [] };
