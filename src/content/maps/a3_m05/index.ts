// A3M5 · Unsung, composed from its layout, waves, and builds.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { SCRIPT_GROUPS, waves } from './waves.ts';

export const a3M05 = defineMap({ ...map, scriptGroups: SCRIPT_GROUPS, waves, ...builds });
