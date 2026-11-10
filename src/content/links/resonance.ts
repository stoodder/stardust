// Resonance (design/towers.md § 6.2): Zapcoil + Prism Spire. Both get +20% damage against an enemy
// whose shield is up (`vsShielded`; `Tower.vsShieldPct`, T504). Act II mid (A2M6). Inert until the
// Prism lifts its stub (towers/index.ts STUB_TOWER_TASKS: T504).
import { defineLink } from '../define.ts';

export const resonance = defineLink({
  id: 'resonance',
  name: 'Resonance',
  partners: [
    { tower: 'zapcoil', bonuses: [{ stat: 'damage', pct: 0.2, vsShielded: true }] },
    { tower: 'prism', bonuses: [{ stat: 'damage', pct: 0.2, vsShielded: true }] },
  ],
});
