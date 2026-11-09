// A2M1 · Rig Nine, composed from its layout, waves, and builds.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const a2M01 = defineMap({ ...map, waves, ...builds });
