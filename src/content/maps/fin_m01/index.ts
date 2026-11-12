// FIN · Clearing the Way, composed from its layout, waves, and builds.
import { defineMap } from '../../define.ts';
import { builds } from './builds.ts';
import { map } from './map.ts';
import { SCRIPT_GROUPS, waves } from './waves.ts';

export const finM01 = defineMap({ ...map, scriptGroups: SCRIPT_GROUPS, waves, ...builds });
