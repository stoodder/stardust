// A2M5 · The Long Walk, composed from its layout, waves, and builds.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const a2M05 = defineMap({ ...map, waves, ...builds });
