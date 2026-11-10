// The synergy-link registry: one import per file in this folder (conventions.md § File layout).
// Order matters: a link's position is its bit in `Tower.linkMask`, so append new links.
import { defineRegistry } from '../define.ts';
import { conductive } from './conductive.ts';
import { crossfire } from './crossfire.ts';
import { lightsong } from './lightsong.ts';
import { overwatch } from './overwatch.ts';
import { reel_it_in } from './reel_it_in.ts';
import { resonance } from './resonance.ts';
import { sitting_ducks } from './sitting_ducks.ts';
import { skywatch } from './skywatch.ts';

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
});
