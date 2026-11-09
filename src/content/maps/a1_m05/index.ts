// A1M5 · Record Quarter, composed from its layout, waves, and builds.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const a1M05 = defineMap({ ...map, waves, ...builds });
