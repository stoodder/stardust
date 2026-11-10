// Clearance Sale: Zibzab's companion ability (design/core-loop.md § 3.2): the next 3 builds,
// upgrades, or specializations this map cost 40% less, counted per purchase (never per second, so
// pausing can't exploit it), once per 4 waves (wave starts after the cast). From A1M4. The sim
// loads `state.discountCharges` on the cast and sim/economy.ts `pay` spends one per discounted
// purchase (T304d). Icon: sprites/icons/clearance_sale.ts.
import { defineAbility } from '../define.ts';

export const clearance_sale = defineAbility({
  id: 'clearance_sale',
  name: 'Clearance Sale',
  cooldownWaves: 4,
  effect: { kind: 'discount', pct: 0.4, charges: 3 },
  companion: 'zibzab',
  sprites: { icon: 'icon.ability.clearance_sale' },
});
