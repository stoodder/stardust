// Orbital Strike: the Technician's default ability, Sterling's welcome gift (the Everglow uplink).
// Numbers: design/core-loop.md §3.2 (radius 1.5 tiles, 200 Explosive after a 1 s visible reticle,
// 45 s cooldown). The strike hits ground enemies only (orchestrator ruling, T113): it isn't an air answer
// in rules.ts COUNTER_ANSWERS. The reticle sprite (fx.orbital_reticle) is sized to this radius.
import { defineAbility } from '../define.ts';

export const orbital_strike = defineAbility({
  id: 'orbital_strike',
  name: 'Orbital Strike',
  cooldownSec: 45,
  effect: { kind: 'strike', type: 'explosive', damage: 200, radiusTiles: 1.5, delaySec: 1 },
  sprites: { icon: 'icon.ability.orbital_strike' },
});
