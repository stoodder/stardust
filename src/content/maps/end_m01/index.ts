// END_M01 · The Open Perimeter (Endless), composed from its layout, warm-up waves, and builds. Its
// generator rules (endless.ts) aren't part of the map: src/sim/endless.ts reads them to build a
// seed's run.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const endM01 = defineMap({ ...map, waves, ...builds });
