// The challenge maps (design/maps.md § 8; T862): post-game, so they register with the finale's lazy
// chunk (content/acts/fin.ts `maps`; content/registry.ts `registerActMaps`), never in the initial
// JS. Only `import type` of this file is allowed outside the finale's chunk.
import { defineRegistry } from '../define.ts';
import { chM01 } from './ch_m01/index.ts';
import { chM02 } from './ch_m02/index.ts';
import { chM03 } from './ch_m03/index.ts';

export const CHALLENGE_MAPS = defineRegistry({
  ch_m01: chM01,
  ch_m02: chM02,
  ch_m03: chM03,
});
