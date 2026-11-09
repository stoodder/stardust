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
import type { SaveData } from '../meta/index.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import { FEATURE_GATES, type Feature, type Modifier, type SimConfig } from '../sim/index.ts';

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
 * The towers a save brings into a map, until the loadout screen (T201) picks them: every owned,
 * unrevoked tower when there are at most four; otherwise the par build's owned towers first, then
 * the rest in ownership order, up to four. T201 replaces this with the player's pick (and the last
 * preset); the skip rule there keeps this result when the player owns four or fewer.
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
  const usable: readonly string[] = save.unlocks.abilities.filter(
    (a) => !save.unlocks.revokedAbilities.includes(a),
  );
  return par !== null && usable.includes(par) ? par : (usable[0] ?? null);
}

/**
 * The companion and its slot-2 state from the map (a pick list takes its first entry until the
 * finale's picker exists). Slot 2's ability id is the sim's to resolve from the companion
 * (T207a); the HUD shows it (T207b). Dropped while the sim refuses companions.
 */
function companionOf(
  map: CompiledMapDef<IdSpace>,
): Pick<SimConfig<IdSpace>, 'companion'> & { slot2State: 'present' | 'absent' | 'none' } {
  const c = map.companion;
  if (c === null || !simulated('companion') || !simulated('abilitySlot2')) {
    return { companion: null, slot2State: 'none' };
  }
  if ('pick' in c) return { companion: c.pick[0] ?? null, slot2State: 'present' };
  return { companion: c.id, slot2State: c.state };
}

/**
 * Modifiers from the save's purchases and difficulty: the seam for meta/modifiers.ts (T204b).
 * Until then a save buys nothing, so there are none.
 */
function saveModifiers(_save: SaveData): Modifier<IdSpace>[] {
  return [];
}

/**
 * The SimConfig for a map. With a save: its towers (defaultLoadout), its abilities, its spec
 * unlocks for the loadout's towers, its difficulty, and the map's companion. Each of those the
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
    const base: SimConfig<IdSpace> = {
      content,
      mapId,
      seed,
      loadout: par.loadout,
      companion: null,
      modifiers: [],
      difficulty: 'standard',
      abilities: { slot1: par.technicianAbility, slot2: null, slot2State: 'none' },
      scriptFlags: {},
      specsUnlocked: [],
    };
    if (save === null) return base;
    const loadout = defaultLoadout(save.unlocks.towers, save.unlocks.revokedTowers, par.loadout);
    const { companion, slot2State } = companionOf(map);
    return {
      ...base,
      loadout,
      companion,
      modifiers: saveModifiers(save),
      difficulty:
        save.settings.difficulty === 'story' && simulated('storyDifficulty') ? 'story' : 'standard',
      abilities: { slot1: slot1Ability(save, par.technicianAbility), slot2: null, slot2State },
      // Story flags reach map scripts with T206b (meta-runtime.md § Pools, `scriptFlags`).
      scriptFlags: {},
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
