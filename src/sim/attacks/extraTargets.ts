// Extra targets (design/towers.md § 6.2, Harmony: the Mindspike hits 1 extra target; T607). A
// hitscan tower with `Tower.linkExtraTargets` > 0 (systems/links.ts: whole, scaled by Linked Up
// and rounded down) hits that many more units with each shot, each a full hit (damage, its tier's
// statuses, its links' statuses, an echo). The extras are picked before the shot lands (a kill
// frees its slot): the next best by the tower's priority among the others in range, on its layers,
// through its spare-runners filter and its target filter, never its own target again; with too few
// in range, fewer extras (unlike a volley, which goes round again). The towers system fires them
// after the target's hit, each only if it's still alive.
// Allocation-free: the picks live in the tick's scratch list (`extraTargets`, slot and uid pairs).
import {
  pickTarget,
  type RangeSpec,
  type TargetFilter,
  type TargetLayers,
} from '../combat/targeting.ts';
import type { Enemy, Tower } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { Scratch } from '../tick.ts';

/**
 * Picks `t`'s extra targets for a shot at `target` into `scratch.extraTargets` (slot, uid pairs)
 * and returns that list; empty for a tower with none.
 */
export function pickExtraTargets(
  state: SimState,
  scratch: Scratch,
  t: Readonly<Tower>,
  layers: TargetLayers,
  range: RangeSpec,
  filter: TargetFilter | null,
  target: Readonly<Enemy>,
): number[] {
  const out = scratch.extraTargets;
  out.length = 0;
  const n = t.linkExtraTargets;
  if (n <= 0) return out;
  const chosen = scratch.slots;
  chosen.length = 0;
  chosen.push(target.slot);
  const priority = t.priority ?? 'first';
  for (let k = 0; k < n; k++) {
    const e = pickTarget(state.enemies, t.x, t.y, layers, range, priority, t.spareRunners, chosen, filter);
    if (e === null) break;
    chosen.push(e.slot);
    out.push(e.slot, e.uid);
  }
  chosen.length = 0;
  return out;
}
