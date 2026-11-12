// CH_M01 · Skitterkin Only (T862), composed from its layout, waves, and builds.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const chM01 = defineMap({ ...map, waves, ...builds });
