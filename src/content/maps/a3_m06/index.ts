// A3M6 · Let Them In, composed from its layout, waves, and builds.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const a3M06 = defineMap({ ...map, waves, ...builds });
