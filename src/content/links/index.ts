// The synergy-link registry: one import per file in this folder (conventions.md § File layout).
// Order matters: a link's position is its bit in `Tower.linkMask`, so append new links.
import { defineRegistry } from '../define.ts';
import { crossfire } from './crossfire.ts';
import { sitting_ducks } from './sitting_ducks.ts';

export const LINKS = defineRegistry({ crossfire, sitting_ducks });
