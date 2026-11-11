// Pinned Down (design/towers.md § 6.2): Grapple Harpoon + Stasis Bloom. The Harpoon deals +30%
// damage to Chilled or Stasis enemies (a conditional bonus, checked per victim as the hit lands);
// the Bloom's field reaches 0.3 tiles further (`Tower.linkFieldRadiusTiles`, sim/systems/fields.ts;
// scaled by Linked Up). Vrell + Aelari, Act III early (T608).
import { defineLink } from '../define.ts';

export const pinned_down = defineLink({
  id: 'pinned_down',
  name: 'Pinned Down',
  partners: [
    { tower: 'harpoon', bonuses: [{ stat: 'damage', pct: 0.3, vsStatus: ['chilled', 'stasis'] }] },
    { tower: 'bloom', bonuses: [], fieldRadiusTiles: 0.3 },
  ],
});
