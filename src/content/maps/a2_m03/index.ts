// A2M3 · Second Look, composed from its layout, waves, and builds (a revisit of A1M2: its layout
// joins this one's when the content compiles, content/compileRevisit.ts).
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const a2M03 = defineMap({ ...map, waves, ...builds });
