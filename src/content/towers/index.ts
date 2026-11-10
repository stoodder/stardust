// The tower registry: one import per file in this folder (conventions.md § File layout).
import { defineRegistry } from '../define.ts';
import { crane } from './crane.ts';
import { harpoon } from './harpoon.ts';
import { lookout } from './lookout.ts';
import { rivet } from './rivet.ts';
import { skyhook } from './skyhook.ts';
import { sprinkler } from './sprinkler.ts';
import { thumper } from './thumper.ts';
import { zapcoil } from './zapcoil.ts';

/**
 * Towers registered ahead of their task (T400a): stubs whose numbers their task confirms, refused
 * by the sim until then (sim/gates.ts, each `tower.<id>` row). The task that lifts a row removes
 * the tower here in the same change (src/sim/m4seams.test.ts checks the two agree). None is
 * listed since T408 (T406 lifted the Lookout, T408 the Harpoon and Crane); a later act's stub
 * joins here. While listed, a tower is left out of [quiet-wave-reach] and the loadout pools.
 */
export const TOWERS_AHEAD_OF_TASK: readonly string[] = [];

export const TOWERS = defineRegistry({
  rivet,
  thumper,
  sprinkler,
  skyhook,
  zapcoil,
  // M4: the Lookout (T406), the Harpoon and the Crane (T408).
  lookout,
  harpoon,
  crane,
});
