// Chain attacks (Zapcoil; design/towers.md § 7): the tower aims like a single-target tower, hits
// its target, then jumps to the nearest unhit enemy within `jumpRangeTiles` of the last one, up to
// `jumps` times (so `jumps + 1` targets in all: Zapcoil T1 "chains to 3" is `jumps: 2`), each jump
// dealing `falloffPct` less. Every hit goes through applyDamage;
// one ProjectileFired and one ProjectileHit per shot (hits = targets struck). The Conductive link
// adds jumps (towers.md § 6).
//
// T300a seam: the towers system routes `chain` attacks here; a no-op until T304b, and createSim
// refuses a loadout that can fire one until then (FEATURE_GATES `attack.chain`).
import type { CompiledAttack, CompiledTier } from '../../content/compiled.ts';
import type { Tower } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export type ChainAttack = Extract<CompiledAttack, { kind: 'chain' }>;

/**
 * A chain tower's tick: aim, fire, and jump. Returns whether it fired at a Skitterkin (the "not
 * firing" clock, fireControl.ts). TODO(T304b).
 */
export function chainAttack(
  _state: SimState,
  _ctx: TickContext,
  _t: Tower,
  _tier: CompiledTier,
  _attack: ChainAttack,
): boolean {
  return false; // TODO(T304b)
}
