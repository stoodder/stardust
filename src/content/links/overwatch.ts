// Overwatch (design/towers.md § 6.2): Rivet + Lookout Shack. The Rivet gets +15% damage; the
// Lookout +0.5 detection radius (`Tower.bonusDetectTiles`, read by sim/systems/detection.ts).
// Act II early.
import { defineLink } from '../define.ts';

export const overwatch = defineLink({
  id: 'overwatch',
  name: 'Overwatch',
  partners: [
    { tower: 'rivet', bonuses: [{ stat: 'damage', pct: 0.15 }] },
    { tower: 'lookout', bonuses: [], detectRadiusTiles: 0.5 },
  ],
});
