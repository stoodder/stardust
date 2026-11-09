// A1M1 · Orientation Day, composed from its layout, waves, and builds.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const a1M01 = defineMap({ ...map, waves, ...builds });
