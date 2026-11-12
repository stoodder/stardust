// CH_M02 · Lights Out (T862), composed from its layout, waves, and builds.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const chM02 = defineMap({ ...map, waves, ...builds });
