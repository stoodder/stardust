// Clearance Sale: Zibzab's companion ability (design/core-loop.md § 3.2): the next 3 builds or
// upgrades this map cost 40% less, counted per purchase (never per second, so pausing can't
// exploit it), once per 4 waves. From A1M4. createSim refuses it until T304d (FEATURE_GATES
// `ability.discount`; state.discountCharges, state.abilityCooldownWaves). The icon is a
// placeholder under its final id (T311a).
import { defineAbility } from '../define.ts';

export const clearance_sale = defineAbility({
  id: 'clearance_sale',
  name: 'Clearance Sale',
  cooldownWaves: 4,
  effect: { kind: 'discount', pct: 0.4, charges: 3 },
  companion: 'zibzab',
  sprites: { icon: 'icon.ability.clearance_sale' },
});
