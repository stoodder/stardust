// A3M4 · Empty Slot, composed from its layout, waves, and builds.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { waves } from './waves.ts';

export const a3M04 = defineMap({ ...map, waves, ...builds });
