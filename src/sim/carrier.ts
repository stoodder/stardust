// Carriers (design/enemies.md § 5.1, the Brood Hauler): when one dies its sack bursts, and a few
// tiny shapes scurry back the way it came. They're non-hostile, untargetable, and cost no leak,
// so they never become sim entities and never touch the economy, stats, or medals: the sim only
// says where and how many (SackBurst), deterministically, and the renderer draws the scurry.
import type { Enemy } from './entities.ts';
import { emit, type SimState } from './state.ts';

/** Emits SackBurst for a carrier that just died; does nothing for any other enemy. */
export function burstSack(state: SimState, enemy: Enemy): void {
  const def = enemy.def;
  if (def === null || def.carrierYoung <= 0 || enemy.route === null) return;
  emit(state, {
    type: 'SackBurst',
    uid: enemy.uid,
    enemy: def.id,
    x: enemy.x,
    y: enemy.y,
    route: enemy.route.id,
    dist: enemy.dist,
    young: def.carrierYoung,
  });
}
