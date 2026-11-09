// The hush rule (design/enemies.md § 5.4, its one home; D101; T400a seam, run by T402). A non-boss
// Hollow unit (`def.hushes`) that comes within HUSH_CONTACT_TILES, along its route and on its own
// layer, of a hushable unit (a `fleeing` Skitterkin enemy; later an escort refugee, bearer, or
// singer) stops for the HUSH_TELL_SEC tell (`Enemy.hushTicks`, `hushUid`; HushStarted), then
// removes it (no leak, no bounty, not processed; Hushed), heals to full, and turns Heavy
// (`Enemy.heavy`: base speed × HUSH_SPEED_MUL; TurnedHeavy). One hush each: a Heavy unit ignores
// every other hushable unit. A ground Hollow can't hush a flyer.
//
// A stub until T402: enemyAbilities calls it for hushing units only, and createSim refuses a map
// with one (`enemy.hush`), so it changes nothing.
import type { CompiledEnemyDef } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function hushStep(
  _state: SimState,
  _ctx: TickContext,
  _e: Enemy,
  _def: CompiledEnemyDef,
): void {
  // T402.
}
