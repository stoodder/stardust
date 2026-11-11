// Profiles → SimConfig (conventions.md § Balance sims, Profiles). A run's meta is a profile: a
// map's `referenceProfile` (what a Standard player owns there, design/progression.md § 10; on a
// flag-variant run, the matching `referenceProfileByFlag` cell's: `referenceProfileFor`), or the
// full-catalog profile (assertion 6), on Standard or Story difficulty (assertion 9). Its modifiers
// come from meta/modifiers.ts, the code the game uses on a save, so the harness tests the real
// progression math. Anything the mapping or the sim can't take is refused, never ignored (D013),
// with one stated exception: the full catalog leaves out grants the sim doesn't simulate yet, and
// says which (`leftOut`).
import type {
  CompiledBuild,
  CompiledContent,
  CompiledFlagProfile,
  CompiledMapDef,
} from '../content/compiled.ts';
import type { IdSpace, LiveIds, ProfileDef } from '../content/types.ts';
import {
  LIVE_CATALOG,
  createNewSave,
  maxRanks,
  metaModifiers,
  storyModifiers,
  type MetaCatalog,
  type MetaLoadout,
} from '../meta/index.ts';
import {
  FEATURE_GATES,
  companionSlot,
  modifierFeature,
  type DifficultyId,
  type Modifier,
  type ScriptFlags,
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

/**
 * The flag-variant cell a run under `flags` falls in (BuildsDef.referenceProfileByFlag; T700a):
 * the first whose every `when` flag equals the run's, or null (the map's own profile and par).
 */
export function flagProfileCell<K extends IdSpace = LiveIds>(
  map: CompiledMapDef<K>,
  flags: ScriptFlags,
): CompiledFlagProfile<K> | null {
  for (const cell of map.builds.referenceProfileByFlag) {
    const when: Readonly<Record<string, unknown>> = cell.when;
    const set: Readonly<Record<string, unknown>> = flags;
    if (Object.entries(when).every(([f, v]) => Object.hasOwn(set, f) && set[f] === v)) return cell;
  }
  return null;
}

/** What a Standard player owns on `map` under the run's story flags (its cell's, else the map's). */
export function referenceProfileFor<K extends IdSpace = LiveIds>(
  map: CompiledMapDef<K>,
  flags: ScriptFlags = {},
): ProfileDef<K> {
  return flagProfileCell(map, flags)?.profile ?? map.builds.referenceProfile;
}

/** The par build on `map` under the run's story flags (its cell's, if it gives one, else the map's). */
export function parBuildFor<K extends IdSpace = LiveIds>(
  map: CompiledMapDef<K>,
  flags: ScriptFlags = {},
): CompiledBuild<K> {
  return flagProfileCell(map, flags)?.parBuild ?? map.builds.parBuild;
}

/**
 * A map's reference profile as a run profile (Standard unless `difficulty` says otherwise), under
 * the run's story flags (`referenceProfileFor`; none: the map's own).
 */
export function referenceRunProfile<K extends IdSpace = LiveIds>(
  map: CompiledMapDef<K>,
  content: CompiledContent<K>,
  difficulty: DifficultyId = 'standard',
  catalog: MetaCatalog = LIVE_CATALOG,
  flags: ScriptFlags = {},
): RunProfile<K> {
  const profile = referenceProfileFor(map, flags);
  return {
    kind: 'reference',
    difficulty,
    modifiers: profileModifiers(profile, content, difficulty, catalog),
    specs: profile.specs,
    leftOut: [],
  };
}

/**
 * The R&D picks par can be run with on `map` (D060, T228): each R&D item whose grants all tune an
 * ability (Orbital Strike Mk II, a Companion Rapport) par casts here, from slot 1 or the
 * companion's slot 2; stocked by this map (`availableAfter` null or an earlier campaign map); and
 * not already owned by the reference profile. In catalog order, by id.
 */
export function rndPicks<K extends IdSpace = LiveIds>(
  map: CompiledMapDef<K>,
  content: CompiledContent<K>,
  catalog: MetaCatalog = LIVE_CATALOG,
): string[] {
  const par = map.builds.parBuild;
  const slots = new Set(par.steps.flatMap((s) => (s.kind === 'ability' ? [s.slot] : [])));
  const cast = new Set<string>();
  if (slots.has(1) && par.technicianAbility !== null) cast.add(par.technicianAbility);
  if (slots.has(2)) {
    let slot2: string | null = null;
    try {
      slot2 = companionSlot(content, map, par.companion).slot2;
    } catch {
      slot2 = null; // the run reports a bad pick
    }
    if (slot2 !== null) cast.add(slot2);
  }
  const campaign: readonly string[] = content.campaign;
  const here = campaign.indexOf(map.id);
  const owned: Readonly<Partial<Record<string, number>>> = map.builds.referenceProfile.shop;
  const out: string[] = [];
  for (const u of Object.values(catalog.upgrades)) {
    if (u.kind !== 'rnd' || (owned[u.id] ?? 0) > 0) continue;
    const after = u.availableAfter === null ? -1 : campaign.indexOf(u.availableAfter);
    if (u.availableAfter !== null && (after < 0 || after >= here)) continue;
    const grants = u.ranks[0]?.grants ?? [];
    const tunes = (g: (typeof grants)[number]): boolean =>
      g.kind === 'abilityStat' && (g.ability === '*' ? cast.size > 0 : cast.has(g.ability));
    if (grants.length > 0 && grants.every(tunes)) out.push(u.id);
  }
  return out;
}

/** The reference profile (under the run's flags) with R&D pick `pick` (rank 1) bought too, on Standard. */
export function rndPickProfile<K extends IdSpace = LiveIds>(
  map: CompiledMapDef<K>,
  content: CompiledContent<K>,
  pick: string,
  catalog: MetaCatalog = LIVE_CATALOG,
  flags: ScriptFlags = {},
): RunProfile<K> {
  const profile = referenceProfileFor(map, flags);
  const modifiers = modifiersFor(
    {
      upgrades: { ...profile.shop, [pick]: 1 },
      protocols: profile.protocols,
      difficulty: 'standard',
    },
    content,
    catalog,
  );
  return {
    kind: 'reference',
    difficulty: 'standard',
    modifiers,
    specs: profile.specs,
    leftOut: [],
  };
}

/**
 * The full-catalog profile (assertion 6): every shop and R&D upgrade in `catalog` at its top rank
 * and every protocol slot filled with FULL_CATALOG_PROTOCOLS, on Standard. Spec unlocks are
 * Engineering's (options, not power: progression.md § 10 lists none), so it keeps the map's
 * reference specs. A grant the sim still refuses (FEATURE_GATES) is left out and listed (none
 * since T304b lifted Salvage Rights' wreckage gate).
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

/**
 * The modifiers the run's story flags add on `mapId`, as the game adds them from a save's
 * (app/battleSetup.ts `simulatedStoryModifiers`, through meta/storyInPlay.ts `storyModifiers`):
 * C4 Purge's −2 Everglow armor from A3M5 on. None without flags, so every run before A3M5, and
 * every run with no `quill_choice`, is unchanged. A modifier naming an id `content` lacks is
 * refused (D013).
 */
export function storyRunModifiers<K extends IdSpace>(
  content: CompiledContent<K>,
  mapId: string,
  flags: ScriptFlags,
): Modifier<K>[] {
  if (Object.keys(flags).length === 0) return [];
  const save = createNewSave();
  const out: Modifier<K>[] = [];
  for (const m of storyModifiers(mapId, {
    ...save,
    story: { ...save.story, flags: { ...save.story.flags, ...flags } },
  })) {
    if (!namesOnly(m, content)) {
      throw new RangeError(`${m.source} names a tower or ability this content doesn't have`);
    }
    out.push(m);
  }
  return out;
}

/**
 * A config for one run of `build` on `map` under `profile`, with the story flags its scripts read
 * (none, except on a flag-variant run, #14), and the modifiers those flags add, as a save's would
 * (`storyRunModifiers`: C4 Purge's armor on A3M5 and later).
 */
export function runConfig<K extends IdSpace = LiveIds>(
  content: CompiledContent<K>,
  map: CompiledMapDef<K>,
  build: CompiledBuild<K>,
  profile: Pick<RunProfile<K>, 'difficulty' | 'modifiers' | 'specs'>,
  seed: number,
  scriptFlags: ScriptFlags = {},
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
    modifiers: [...profile.modifiers, ...storyRunModifiers(content, map.id, scriptFlags)],
    difficulty: profile.difficulty,
    abilities: { slot1: build.technicianAbility, slot2: slot.slot2, slot2State: slot.slot2State },
    scriptFlags,
    specsUnlocked: profile.specs.filter((t) => build.loadout.includes(t)),
  };
}

/** A Standard profile with no purchases (unit tests and A1M1's robustness test). */
export const NO_PURCHASES: {
  readonly difficulty: 'standard';
  readonly modifiers: readonly never[];
  readonly specs: readonly never[];
} = { difficulty: 'standard', modifiers: [], specs: [] };
