// M5's dev maps (T500a seams), on dev_act2's layout (devBattle.ts: two roads, west and south-west,
// merging on the east road into the core). Each is defined in devBattle.ts (which can't import this
// file back) and registered in DEV_CONTENT.maps by the task that lifts its gate, with its smoke flow:
// - `dev_escort` (T305c): an Escort from the start.
// - `dev_dark` (T505): Sundown in two waves, half dark as W1 starts and full dark as W2 does, with
//   two lamps (one on the west road's bend, one by the merge); Rivets inside and outside the light,
//   and one lit only by a beaming Prism.
import type { MapDef } from '../../content/types.ts';
import { darkMap, escortMap, type DevIds } from './devBattle.ts';

/** M5's dev maps, by id (T305c, T505). */
export const DEV_M5_MAPS: { readonly [id: string]: MapDef<DevIds> } = {
  dev_escort: escortMap,
  dev_dark: darkMap,
};
