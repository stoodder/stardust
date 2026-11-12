// END_M01 · The Long Shift (Endless), composed from its layout, warm-up waves, and builds. A
// post-game map: not in the static map registry (maps/index.ts), so it isn't in the initial JS; it
// registers with the finale's lazy chunk (content/acts/fin.ts) as `ENDLESS_MAPS`. Its generator
// rules (endless.ts) aren't part of the map: src/sim/endless.ts reads them to build a seed's run.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const endM01 = defineMap({ ...map, waves, ...builds });

/** Endless's maps, by id (the finale chunk registers them; T861). */
export const ENDLESS_MAPS = { end_m01: endM01 } as const;
