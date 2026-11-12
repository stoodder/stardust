// The post-game maps (design/maps.md § 8): Endless's `end_m01` (T861) and the challenge maps (T862).
// They aren't campaign maps and aren't in the static map registry (maps/index.ts), so none of them
// is in the initial JS: they register with the finale's lazy chunk (content/acts/fin.ts,
// `ActStory.maps`; content/acts/index.ts `registerActStory`), and `postgameContent` is the live
// content with them added, which the app's battles, the dev URLs (`?map=end_m01`), and the tests
// compile like any other content set. Pure: the registry is module state the act loader sets.
import { RAW_CONTENT } from './registry.ts';
import type { AbilityId, EnemyId, MapDef, MapId, RawContent, TowerId } from './types.ts';

/** A post-game map's id (each one registers through the finale chunk). */
export type PostgameMapId = 'end_m01';

/** The id space of the live content with the post-game maps in it. */
export interface PostgameIds {
  readonly tower: TowerId;
  readonly enemy: EnemyId;
  readonly ability: AbilityId;
  readonly map: MapId | PostgameMapId;
}

/** The post-game maps, by id. */
export type PostgameMaps = Readonly<Partial<Record<PostgameMapId, MapDef<PostgameIds>>>>;

let registered: PostgameMaps = {};
let merged: RawContent<PostgameIds> | null = null;

/** Registers the post-game maps (again: replaces them, so it's idempotent). */
export function registerPostgameMaps(maps: PostgameMaps): void {
  registered = { ...maps };
  merged = null;
}

/** The post-game maps registered so far (none before the finale chunk loads). */
export function postgameMapIds(): PostgameMapId[] {
  return Object.keys(registered).filter((id): id is PostgameMapId => Object.hasOwn(registered, id));
}

/** `raw` with `maps` added (the campaign list unchanged: post-game maps are never campaign maps). */
export function withPostgameMaps(raw: RawContent, maps: PostgameMaps): RawContent<PostgameIds> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the live maps plus the given ids
  const all = { ...raw.maps, ...maps } as RawContent<PostgameIds>['maps'];
  return { ...raw, maps: all };
}

/**
 * The live content with the registered post-game maps, the same object until the registry changes
 * (a content set compiles it once), or null before any registers.
 */
export function postgameContent(): RawContent<PostgameIds> | null {
  if (postgameMapIds().length === 0) return null;
  return (merged ??= withPostgameMaps(RAW_CONTENT, registered));
}
