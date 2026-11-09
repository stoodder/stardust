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
