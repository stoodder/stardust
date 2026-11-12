// The challenge maps (design/maps.md § 8; T862): post-game, so they register with the finale's lazy
// chunk (content/acts/fin.ts `maps`; content/registry.ts `registerActMaps`), never in the initial
// JS. Only `import type` of this file is allowed outside the finale's chunk.
import { defineRegistry } from '../define.ts';

export const CHALLENGE_MAPS = defineRegistry({});
