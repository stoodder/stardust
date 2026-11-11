// Underfoot: Bramble's companion ability (slot 2; design/core-loop.md § 3.2), from A3M1. Targeted
// path tile: for 6 s, each ground enemy that crosses it is Pinned 1 s and takes 30 Kinetic, once
// per enemy; it reaches burrowed enemies (the `burrowed` answer, rules.ts COUNTER_ANSWERS). 50 s
// cooldown. A cooldown hit never answers armor or splash.
//
// The `pathTrap` effect runs since T604 (sim/abilities/underfoot.ts: the trap, its crossings, the
// once-per-enemy rule). Icon: a placeholder under its final id (T640b).
import { defineAbility } from '../define.ts';

export const underfoot = defineAbility({
  id: 'underfoot',
  name: 'Underfoot',
  companion: 'bramble',
  cooldownSec: 50,
  effect: { kind: 'pathTrap', type: 'kinetic', damage: 30, pinSec: 1, durationSec: 6 },
  sprites: { icon: 'icon.ability.underfoot' },
});
