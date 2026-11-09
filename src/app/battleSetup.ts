// Which map a battle runs, and the SimConfig for it. With a campaign save, the config comes from
// the save (owned towers, abilities, spec unlocks, difficulty); without one (`?map=<id>`, the dev
// battles), from the map's par build. The live registries win; the dev battle
// (render/__fixtures__/devBattle.ts, `?map=dev_range`) stays reachable for development and for the
// smoke flows that need its unlocked towers.
import { compileContent } from '../content/compile.ts';
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { MAX_LOADOUT } from '../content/rules.ts';
import type { IdSpace, RawContent } from '../content/types.ts';
import {
  abilityPool,
  resolveLoadout,
  saveModifiers,
  towerPool,
  type LoadoutPick,
  type SaveData,
} from '../meta/index.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import { scriptFlagsOf } from '../story/flags.ts';
import {
  companionSlot,
  FEATURE_GATES,
  modifierFeature,
  type CompanionSlot,
  type Feature,
  type Modifier,
  type SimConfig,
} from '../sim/index.ts';

/** The map a battle opens when nothing names one: the campaign's first map. */
export const DEFAULT_MAP_ID = 'a1_m01';

/** The development battle (render/__fixtures__/devBattle.ts): `?map=dev_range`. */
export const DEV_MAP_ID = 'dev_range';

/**
 * Content sets searched for a map id, in order: the live game first, then the dev battle. Each
 * compiles on first use, so an A1M1 run never compiles the dev content.
 */
const CONTENT_SETS: readonly {
  readonly raw: { readonly maps: object };
  readonly compile: () => CompiledContent<IdSpace>;
}[] = [lazy(RAW_CONTENT), lazy(DEV_CONTENT)];

function lazy<K extends IdSpace>(
  raw: RawContent<K>,
): { readonly raw: RawContent<K>; readonly compile: () => CompiledContent<IdSpace> } {
  let compiled: CompiledContent<IdSpace> | null = null;
  return { raw, compile: () => (compiled ??= compileContent(raw)) };
}

/** Every map id a battle can open (the smoke tests boot each one). Compiles nothing. */
export function battleMapIds(): readonly string[] {
  return CONTENT_SETS.flatMap((c) => Object.keys(c.raw.maps));
}

/** True when a battle can open `mapId`. Compiles nothing. */
export function hasBattleMap(mapId: string): boolean {
  return CONTENT_SETS.some((c) => Object.hasOwn(c.raw.maps, mapId));
}

/** True for a feature the sim simulates today (its FEATURE_GATES row is lifted). */
const simulated = (f: Feature): boolean => FEATURE_GATES[f] === null;

/**
 * The towers a save brings into a map when the loadout screen doesn't pick them (the skip rule, or
 * no preset yet; meta/loadout.ts), and where the screen starts without a preset: every owned,
 * unrevoked tower when there are at most four; otherwise the par build's owned towers first, then
 * the rest in ownership order, up to four.
 */
export function defaultLoadout(
  owned: readonly string[],
  revoked: readonly string[],
  par: readonly string[],
): string[] {
  const usable = owned.filter((t) => !revoked.includes(t));
  if (usable.length <= MAX_LOADOUT) return usable;
  const first = par.filter((t) => usable.includes(t));
  return [...first, ...usable.filter((t) => !first.includes(t))].slice(0, MAX_LOADOUT);
}

/** The Technician's ability (slot 1): the par build's if the save owns it, else the first owned. */
function slot1Ability(save: SaveData, par: string | null): string | null {
  const usable: readonly string[] = abilityPool(save);
  return par !== null && usable.includes(par) ? par : (usable[0] ?? null);
}

/**
 * The save's default loadout on a map: defaultLoadout's towers and slot1Ability's ability. Typed
 * as a save's pick: only a save's own ids reach it (a dev map's par ids are never owned).
 */
export function defaultPick(
  save: SaveData,
  par: { readonly loadout: readonly string[]; readonly technicianAbility: string | null },
): LoadoutPick {
  const { towers: owned, abilities } = save.unlocks;
  // The pool: owned, unrevoked, and played by the sim today (meta/pools.ts).
  const towers = defaultLoadout(towerPool(save), [], par.loadout);
  const ability = slot1Ability(save, par.technicianAbility);
  return {
    // defaultLoadout's order, as the save's typed ids.
    towers: towers.flatMap((t) => owned.filter((o) => o === t)),
    ability: abilities.find((a) => a === ability) ?? null,
  };
}

/**
 * The companion and slot 2 from the map (`companionSlot`: a pick list takes its first entry until
 * the finale's picker exists). Left out while the sim refuses companions or slot 2.
 */
function companionOf(
  content: CompiledContent<IdSpace>,
  map: CompiledMapDef<IdSpace>,
): CompanionSlot<IdSpace> {
  if (!simulated('companion') || !simulated('abilitySlot2')) {
    return { companion: null, slot2: null, slot2State: 'none' };
  }
  return companionSlot(content, map);
}

/**
 * Modifiers from the save's purchases and difficulty (meta/modifiers.ts), less any the sim still
 * refuses (Salvage Rights until wreckage, M3), so a save ahead of the sim plays.
 */
function simulatedSaveModifiers(save: SaveData): Modifier<IdSpace>[] {
  return saveModifiers(save).filter((m) => simulated(modifierFeature(m)));
}

/**
 * The SimConfig for a map, always with the map's companion in slot 2. With a save: its towers
 * (defaultLoadout), its Technician ability, its spec unlocks for the loadout's towers, and its
 * difficulty. Each of those the
 * sim still refuses (FEATURE_GATES) is left out, so a save that runs ahead of the sim (the
 * all_unlocked dev save) plays rather than throws; it goes live when its task lifts the gate.
 * Without a save: the map's par loadout and Technician ability. Throws on an unknown map id.
 */
export function battleConfig(
  mapId: string,
  seed: number,
  save: SaveData | null = null,
): SimConfig<IdSpace> {
  for (const set of CONTENT_SETS) {
    if (!Object.hasOwn(set.raw.maps, mapId)) continue;
    const content = set.compile();
    const map = content.maps[mapId]!; // hasOwn above
    const par = map.builds.parBuild;
    const { companion, slot2, slot2State } = companionOf(content, map);
    const base: SimConfig<IdSpace> = {
      content,
      mapId,
      seed,
      loadout: par.loadout,
      companion,
      modifiers: [],
      difficulty: 'standard',
      abilities: { slot1: par.technicianAbility, slot2, slot2State },
      scriptFlags: {},
      specsUnlocked: [],
    };
    if (save === null) return base;
    // The loadout screen's pick for this map (its preset), or the default (meta/loadout.ts).
    const pick = resolveLoadout(save, mapId, defaultPick(save, par));
    const loadout: readonly string[] = pick.towers;
    return {
      ...base,
      loadout: [...loadout],
      modifiers: simulatedSaveModifiers(save),
      difficulty:
        save.settings.difficulty === 'story' && simulated('storyDifficulty') ? 'story' : 'standard',
      // Slot 1 is the Technician's, from the save; slot 2 is the map's companion's.
      abilities: { slot1: pick.ability, slot2, slot2State },
      // The save's story flags that map scripts may read (story-runtime.md § Map scripts).
      scriptFlags: scriptFlagsOf(save.story.flags),
      specsUnlocked: simulated('specs')
        ? save.unlocks.specs.filter((t) => loadout.includes(t))
        : [],
    };
  }
  throw new RangeError(`battle: unknown map '${mapId}'`);
}

/** A seed for a run the URL didn't seed: any 32-bit integer. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
