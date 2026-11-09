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
 * the tower here in the same change (src/sim/m4seams.test.ts checks the two agree). While listed,
 * a tower is left out of [quiet-wave-reach]'s best tier-3 range: the Harpoon's 4.0 reaches A1M5's
 * Quiet Wave from two pads (D097), which T408 must settle before it lifts `tower.harpoon`.
 */
export const TOWERS_AHEAD_OF_TASK: readonly string[] = ['lookout', 'harpoon', 'crane'];

export const TOWERS = defineRegistry({
  rivet,
  thumper,
  sprinkler,
  skyhook,
  zapcoil,
  // M4 (T400a stubs under their final ids; each gated until its task: sim/gates.ts STUB_TOWERS).
  lookout,
  harpoon,
  crane,
});
