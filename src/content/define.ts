// Identity helpers for authoring content. Each returns its argument unchanged; they exist so a
// content file gets the definition type's checking and inference (and keeps its literal id,
// which the registries turn into id unions). Shapes: types.ts.
import type {
  AbilityDef,
  BuildsDef,
  EnemyDef,
  IdSpace,
  LinkDef,
  LiveIds,
  MapDef,
  MapLayoutDef,
  TowerDef,
  WaveDef,
} from './types.ts';

/** Defines a tower (one per file in `towers/`). */
export function defineTower<const Id extends string>(def: TowerDef<Id>): TowerDef<Id> {
  return def;
}

/** Defines an enemy (one per file in `enemies/`). */
export function defineEnemy<const Id extends string>(def: EnemyDef<Id>): EnemyDef<Id> {
  return def;
}

/** Defines a commander ability (one per file in `abilities/`). */
export function defineAbility<const Id extends string>(def: AbilityDef<Id>): AbilityDef<Id> {
  return def;
}

/** Defines a synergy link (one per file in `links/`). */
export function defineLink<const Id extends string>(
  def: LinkDef<LiveIds, Id>,
): LinkDef<LiveIds, Id> {
  return def;
}

/** Defines a map's layout and rules (`maps/<id>/map.ts`). */
export function defineMapLayout<const Id extends string>(
  def: MapLayoutDef<LiveIds, Id>,
): MapLayoutDef<LiveIds, Id> {
  return def;
}

/** Defines a map's waves (`maps/<id>/waves.ts`). */
export function defineWaves(waves: readonly WaveDef[]): readonly WaveDef[] {
  return waves;
}

/** Defines a map's balance-harness builds (`maps/<id>/builds.ts`). */
export function defineBuilds(builds: BuildsDef): BuildsDef {
  return builds;
}

/** Composes a map (`maps/<id>/index.ts`): `defineMap({ ...map, waves, ...builds })`. */
export function defineMap<const Id extends string>(def: MapDef<LiveIds, Id>): MapDef<LiveIds, Id> {
  return def;
}

/**
 * Defines a registry (a folder's `index.ts`): an object of definitions keyed by id. A key that
 * doesn't match its definition's `id` is a type error (compileContent() checks it again).
 */
export function defineRegistry<const R extends Readonly<Record<string, { readonly id: string }>>>(
  entries: R & { readonly [P in keyof R]: { readonly id: P } },
): R {
  return entries;
}

/**
 * The map helpers, typed against another id space. Test fixtures use this with their own
 * registries (`mapDefinersFor<IdsOf<typeof FIXTURE_ENTITIES>>()`), so typos fail there too.
 */
export function mapDefinersFor<K extends IdSpace>(): {
  defineMapLayout: <const Id extends string>(def: MapLayoutDef<K, Id>) => MapLayoutDef<K, Id>;
  defineWaves: (waves: readonly WaveDef<K>[]) => readonly WaveDef<K>[];
  defineBuilds: (builds: BuildsDef<K>) => BuildsDef<K>;
  defineMap: <const Id extends string>(def: MapDef<K, Id>) => MapDef<K, Id>;
} {
  return {
    defineMapLayout: (def) => def,
    defineWaves: (waves) => waves,
    defineBuilds: (builds) => builds,
    defineMap: (def) => def,
  };
}
