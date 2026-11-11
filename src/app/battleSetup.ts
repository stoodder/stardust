// Which map a battle runs, and the SimConfig for it. With a campaign save, the config comes from
// the save (owned towers, abilities, spec unlocks, upgrades, equipped Field Protocols, difficulty); without one (`?map=<id>`, the dev
// battles), from the map's par build on its reference profile, so `__sd.autoplay('par')` replays
// the harness's par run (T332). The live registries win; the dev battle
// (render/__fixtures__/devBattle.ts, `?map=dev_range`) stays reachable for development and for the
// smoke flows that need its unlocked towers, once a dev URL has loaded it (devRegistry.ts; D150).
// A production build compiles without validate(): the gate validates every content set it ships.
import { compileContent } from '../content/compile.ts';
import { compileContentUnchecked } from '../content/compileCore.ts';
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { MAX_LOADOUT } from '../content/rules.ts';
import type { IdSpace, RawContent } from '../content/types.ts';
import {
  abilitiesOffOn,
  abilityPool,
  metaModifiers,
  resolveLoadout,
  saveModifiers,
  storyModifiers,
  towerPool,
  type LoadoutPick,
  type SaveData,
} from '../meta/index.ts';
import { devFixtures } from './devRegistry.ts';
import { scriptFlagsOf } from '../story/flags.ts';
import {
  companionSlot,
  FEATURE_GATES,
  gatedFlagDefaults,
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

interface ContentSet {
  readonly raw: { readonly maps: object };
  readonly compile: () => CompiledContent<IdSpace>;
}

function lazy<K extends IdSpace>(raw: RawContent<K>): ContentSet & { readonly raw: RawContent<K> } {
  let compiled: CompiledContent<IdSpace> | null = null;
  // Vite folds `import.meta.env.DEV` to false in a production build, so validate() isn't bundled;
  // plain Node (the smoke specs' imports) has no `import.meta.env` and validates.
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- undefined outside Vite
  const dev = import.meta.env === undefined || import.meta.env.DEV;
  const compile = dev ? compileContent : compileContentUnchecked;
  return { raw, compile: () => (compiled ??= compile(raw)) };
}

const LIVE_SET = lazy(RAW_CONTENT);
let devSet: (ContentSet & { readonly raw: RawContent<IdSpace> }) | null = null;

/**
 * Content sets searched for a map id, in order: the live game first, then the dev battle once its
 * fixtures are loaded (devRegistry.ts). Each compiles on first use, so an A1M1 run never compiles
 * the dev content.
 */
function contentSets(): readonly ContentSet[] {
  const dev = devFixtures();
  if (dev === null) return [LIVE_SET];
  if (devSet === null || devSet.raw !== dev.content) devSet = lazy(dev.content);
  return [LIVE_SET, devSet];
}

/** Every map id a battle can open (the smoke tests boot each one). Compiles nothing. */
export function battleMapIds(): readonly string[] {
  return contentSets().flatMap((c) => Object.keys(c.raw.maps));
}

/** True when a battle can open `mapId`. Compiles nothing. */
export function hasBattleMap(mapId: string): boolean {
  return contentSets().some((c) => Object.hasOwn(c.raw.maps, mapId));
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

/**
 * The Technician's ability (slot 1): the par build's if the save owns it, else the first owned,
 * leaving out `off` (the map's exclusions, meta `abilitiesOffOn`).
 */
function slot1Ability(save: SaveData, par: string | null, off: readonly string[]): string | null {
  const usable: readonly string[] = abilityPool(save, off);
  return par !== null && usable.includes(par) ? par : (usable[0] ?? null);
}

/**
 * The save's default loadout on a map: defaultLoadout's towers and slot1Ability's ability. Typed
 * as a save's pick: only a save's own ids reach it (a dev map's par ids are never owned).
 */
export function defaultPick(
  save: SaveData,
  par: { readonly loadout: readonly string[]; readonly technicianAbility: string | null },
  off: readonly string[] = [],
): LoadoutPick {
  const { towers: owned, abilities } = save.unlocks;
  // The pool: owned, unrevoked, and played by the sim today (meta/pools.ts).
  const towers = defaultLoadout(towerPool(save), [], par.loadout);
  const ability = slot1Ability(save, par.technicianAbility, off);
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
 * Modifiers from the save's purchases, its equipped Field Protocols (T308: save-wide, fitted to
 * what it owns and its slots; meta/loadout.ts `equippedProtocols`), and its difficulty, through
 * meta/loadout.ts `saveModifiers`, less any the sim still refuses, so a save ahead of the sim
 * plays.
 */
export function simulatedSaveModifiers(save: SaveData): Modifier<IdSpace>[] {
  return saveModifiers(save).filter((m) => simulated(modifierFeature(m)));
}

/**
 * Modifiers from the save's story on `mapId` (meta/storyInPlay.ts `storyModifiers`: C4 Purge's −2
 * Everglow armor from A3M5 on, and on a dev map), less any the sim still refuses.
 */
export function simulatedStoryModifiers(mapId: string, save: SaveData): Modifier<IdSpace>[] {
  return storyModifiers(mapId, save).filter((m) => simulated(modifierFeature(m)));
}

/**
 * The SimConfig for a map, always with the map's companion in slot 2. With a save: its towers
 * (defaultLoadout), its Technician ability, its spec unlocks for the loadout's towers, its
 * modifiers (upgrades, equipped protocols, difficulty), and its difficulty. Each of those the
 * sim still refuses (FEATURE_GATES) is left out, so a save that runs ahead of the sim (the
 * all_unlocked dev save) plays rather than throws; it goes live when its task lifts the gate.
 * Without a save, or on a dev battle (its towers aren't a save's; a save adds only its story's
 * script flags and modifiers): the map's par loadout and Technician ability on its reference profile, on
 * Standard, as the balance harness runs par (balance/profile.ts `referenceRunProfile`: the
 * profile's shop ranks and protocols, and its spec unlocks for the loadout's towers; T332).
 * Throws on an unknown map id.
 */
export function battleConfig(
  mapId: string,
  seed: number,
  save: SaveData | null = null,
): SimConfig<IdSpace> {
  for (const [setIndex, set] of contentSets().entries()) {
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
      // A flag that gates a refugee group (A3M3's door) takes its first variant until set (T605).
      scriptFlags: gatedFlagDefaults(map),
      specsUnlocked: [],
    };
    // A dev battle's towers aren't a save's: it plays par on its reference profile, and a save
    // adds only its story (its script flags; C4 Purge's armor, `?map=dev_heal&save=...`, T710).
    if (save === null || setIndex > 0) {
      const profile = map.builds.referenceProfile;
      const modifiers = metaModifiers({
        upgrades: profile.shop,
        protocols: profile.protocols,
        difficulty: 'standard',
      }).filter((m) => simulated(modifierFeature(m)));
      const specs: readonly string[] = profile.specs;
      return {
        ...base,
        modifiers:
          save === null ? modifiers : [...modifiers, ...simulatedStoryModifiers(mapId, save)],
        // A save's script flags reach a dev battle's script too (dev_holdout's door, T610).
        ...(save === null
          ? {}
          : { scriptFlags: gatedFlagDefaults(map, scriptFlagsOf(save.story.flags)) }),
        specsUnlocked: simulated('specs') ? specs.filter((t) => par.loadout.includes(t)) : [],
      };
    }
    // The loadout screen's pick for this map (its preset), or the default (meta/loadout.ts),
    // without the abilities the map locks under the save's flags (A3M5's System Reboot under C4
    // Rewrite; meta/storyInPlay.ts).
    const off = abilitiesOffOn(map, save);
    const pick = resolveLoadout(save, mapId, defaultPick(save, par, off), off);
    const loadout: readonly string[] = pick.towers;
    return {
      ...base,
      loadout: [...loadout],
      // The save's purchases and protocols, then its story's (C4 Purge's armor from A3M5 on).
      modifiers: [...simulatedSaveModifiers(save), ...simulatedStoryModifiers(mapId, save)],
      difficulty:
        save.settings.difficulty === 'story' && simulated('storyDifficulty') ? 'story' : 'standard',
      // Slot 1 is the Technician's, from the save; slot 2 is the map's companion's.
      abilities: { slot1: pick.ability, slot2, slot2State },
      // The save's story flags that map scripts may read (story-runtime.md § Map scripts).
      scriptFlags: gatedFlagDefaults(map, scriptFlagsOf(save.story.flags)),
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
