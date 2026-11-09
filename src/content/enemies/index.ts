// The enemy registry: one import per file in this folder (conventions.md § File layout).
import { defineRegistry } from '../define.ts';
import { bunchling } from './bunchling.ts';
import { chitterbloom } from './chitterbloom.ts';
import { chonk } from './chonk.ts';
import { digger } from './digger.ts';
import { elder } from './elder.ts';
import { gerald } from './gerald.ts';
import { hauler } from './hauler.ts';
import { nibbler } from './nibbler.ts';
import { puffwing } from './puffwing.ts';
import { zoomer } from './zoomer.ts';

export const ENEMIES = defineRegistry({
  nibbler,
  zoomer,
  chonk,
  hauler,
  puffwing,
  bunchling,
  digger,
  elder,
  chitterbloom,
  gerald,
});
