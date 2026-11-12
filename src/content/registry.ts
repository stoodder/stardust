// Every content registry, gathered for compileContent() (compile.ts). Registries are explicit
// imports, never import.meta.glob, so the same files load in Vite, Vitest, and plain Node.
//
// Lazy maps (architecture.md § 5, *Lazy chunks*): the post-game maps (the challenge maps, T862)
// aren't imported here. Their act's chunk registers them (`registerActMaps`, called by
// content/acts `registerActStory`), which adds them to `RAW_CONTENT.maps` in place and bumps
// `contentVersion()`, so a compile cache keyed on it (app/battleSetup.ts) compiles them in the next
// time it's asked. A map registered later compiles exactly as a static one would.
import { ABILITIES } from './abilities/index.ts';
import { CAMPAIGN } from './campaign.ts';
import { ENEMIES } from './enemies/index.ts';
import { LINKS } from './links/index.ts';
import { MAPS } from './maps/index.ts';
import { TOWERS } from './towers/index.ts';
import type { MapDef, RawContent } from './types.ts';

/** The live map registry: the static maps, then each lazy chunk's as it registers. */
const maps: Record<string, MapDef> = { ...MAPS };
let version = 0;

export const RAW_CONTENT: RawContent = {
  towers: TOWERS,
  enemies: ENEMIES,
  abilities: ABILITIES,
  // A lazy map's key is absent until its chunk registers it (MapId names it all the same), so a
  // reader looks a map id up with `Object.hasOwn`, as it would any id from outside.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- lazy keys fill in (above)
  maps: maps as RawContent['maps'],
  links: LINKS,
  campaign: CAMPAIGN,
};

/**
 * Adds a lazy chunk's maps to `RAW_CONTENT.maps` (again: the same defs change nothing). Bumps
 * `contentVersion()` when one is new or replaced. Throws a RangeError for an id a static map holds.
 */
export function registerActMaps(more: Readonly<Record<string, MapDef>>): void {
  let changed = false;
  for (const [id, def] of Object.entries(more)) {
    if (Object.hasOwn(MAPS, id)) throw new RangeError(`registerActMaps: '${id}' is a static map`);
    if (maps[id] === def) continue;
    maps[id] = def;
    changed = true;
  }
  if (changed) version++;
}

/** Counts the registrations that changed `RAW_CONTENT` (0 before any lazy map). */
export function contentVersion(): number {
  return version;
}
