// The tower registry: one import per file in this folder (conventions.md § File layout).
import { defineRegistry } from '../define.ts';
import { crane } from './crane.ts';
import { harpoon } from './harpoon.ts';
import { lantern } from './lantern.ts';
import { lookout } from './lookout.ts';
import { mindspike } from './mindspike.ts';
import { prism } from './prism.ts';
import { rivet } from './rivet.ts';
import { skyhook } from './skyhook.ts';
import { sprinkler } from './sprinkler.ts';
import { thumper } from './thumper.ts';
import { zapcoil } from './zapcoil.ts';

/**
 * Towers registered ahead of their task (T400a's seam, generalised by T500a), with the task each
 * waits for: stubs whose numbers that task confirms. This is the one home of the refusal: the sim
 * refuses a listed tower whole (sim/gates.ts `stubTowerGate`), meta keeps its license, attunement,
 * and spec unlock off the shelves, and [quiet-wave-reach] and the loadout pools leave it out. The
 * task lifts it by deleting its entry here. M5 (D137): the Prism's (T504), the Mindspike's (T507),
 * and the Seer's Lantern's (T508) are lifted, so none waits today.
 */
export const STUB_TOWER_TASKS: Readonly<Record<string, `T${number}${string}`>> = Object.freeze({});
/** The towers in STUB_TOWER_TASKS (its keys), for the checks that only ask whether one waits. */
export const TOWERS_AHEAD_OF_TASK: readonly string[] = Object.freeze(Object.keys(STUB_TOWER_TASKS));

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
  // M5: the Prism (T504), the Mindspike (T507), the Seer's Lantern (T508).
  prism,
  mindspike,
  lantern,
});
