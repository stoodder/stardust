// The synergy-link registry: one import per file in this folder (conventions.md § File layout).
// Order matters: a link's position is its bit in `Tower.linkMask`, so append new links.
import { defineRegistry } from '../define.ts';
import { acid_rain } from './acid_rain.ts';
import { conductive } from './conductive.ts';
import { crossfire } from './crossfire.ts';
import { finders_keepers } from './finders_keepers.ts';
import { harmony } from './harmony.ts';
import { lightsong } from './lightsong.ts';
import { overwatch } from './overwatch.ts';
import { pinned_down } from './pinned_down.ts';
import { reel_it_in } from './reel_it_in.ts';
import { resonance } from './resonance.ts';
import { sitting_ducks } from './sitting_ducks.ts';
import { skywatch } from './skywatch.ts';
import { splash_zone } from './splash_zone.ts';
import { sticky_flak } from './sticky_flak.ts';
import { stillmind } from './stillmind.ts';

export const LINKS = defineRegistry({
  crossfire,
  sitting_ducks,
  conductive,
  // M4 (T400a stubs: their towers are refused until T406 and T408).
  overwatch,
  skywatch,
  reel_it_in,
  // M5 (T500a stubs: inert until the Prism and the Lantern lift theirs).
  resonance,
  lightsong,
  // M6: the Scuttle Den's (T604).
  splash_zone,
  finders_keepers,
  // M6: the Hum Choir's (T607). Bounce Chorus (Sproing + Choir) joins with the Sproing Pad (M7).
  harmony,
  // M6: the Stasis Bloom's (T608).
  pinned_down,
  stillmind,
  // M7: the Gloop Spitter's (T705).
  acid_rain,
  sticky_flak,
});
