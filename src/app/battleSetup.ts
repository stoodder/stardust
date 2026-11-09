// Which map a battle runs, and the SimConfig for it. The live registries win; the dev battle
// (render/__fixtures__/devBattle.ts, `?map=dev_range`) stays reachable for development and for the
// smoke flows that need its unlocked towers.
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { IdSpace, RawContent } from '../content/types.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import type { SimConfig } from '../sim/index.ts';

/** The map a battle opens when the URL names none: the title's "Start shift" plays A1M1. */
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

/**
 * The SimConfig for a map: the map's par loadout and Technician ability (M1 has no loadout screen
 * or saves yet, T201/T203). Throws on an unknown map id.
 */
export function battleConfig(mapId: string, seed: number): SimConfig<IdSpace> {
  for (const set of CONTENT_SETS) {
    if (!Object.hasOwn(set.raw.maps, mapId)) continue;
    const content = set.compile();
    const par = content.maps[mapId]!.builds.parBuild; // hasOwn above
    return {
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
  }
  throw new RangeError(`battle: unknown map '${mapId}'`);
}

/** A seed for a run the URL didn't seed: any 32-bit integer. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}
