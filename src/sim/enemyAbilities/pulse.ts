// Shield pulses (design/enemies.md § 5.2, § 6; D101; T400a seam, run by T403). Every `everyTicks`
// (`Enemy.pulseTicks` counts down; the last `tellTicks` are the tell, ShieldPulse 'tell'), a unit
// with a pulse (its own `def.pulse`, or its boss phase's: the Glass Witch's phase 1) restores
// `shield` to itself and each live shielded unit of its faction within `radiusTiles`, never past
// its max (ShieldPulse 'fired'). Stasis and Unnerved interrupt the tell (§ 2.4); a converted
// Stasis on a boss doesn't (D101). Reused by M5's Aegis Cantor and the Penitent.
//
// A stub until T403: no live unit pulses yet, and createSim refuses one (`enemy.pulse`).
import type { CompiledPulse } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function pulseStep(
  _state: SimState,
  _ctx: TickContext,
  _e: Enemy,
  _pulse: CompiledPulse,
): void {
  // T403.
}
