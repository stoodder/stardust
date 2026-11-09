// Skywatch (design/towers.md § 6.2): Skyhook + Lookout Shack. The Skyhook gets +20% range; the
// Lookout +0.5 detection radius (`Tower.bonusDetectTiles`, read by sim/systems/detection.ts).
// Act II early.
import { defineLink } from '../define.ts';

export const skywatch = defineLink({
  id: 'skywatch',
  name: 'Skywatch',
  partners: [
    { tower: 'skyhook', bonuses: [{ stat: 'range', pct: 0.2 }] },
    { tower: 'lookout', bonuses: [], detectRadiusTiles: 0.5 },
  ],
});
