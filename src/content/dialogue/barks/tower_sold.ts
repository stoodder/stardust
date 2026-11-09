// Act I `tower_sold` pool (story/campaign/act1.md § Act I barks): Zibzab on a sale (he rides along
// on A1M4, the Clean Audit map, so it's a tease for the objective, never a verdict: an early sell is
// no write-off). Bricks's line on his tagged turret is A1M2's, and more specific, so it wins there.
import { defineBarks } from '../define.ts';

export const towerSold = defineBarks([
  {
    id: 'zibzab_tower_sold_a1_10',
    speaker: 'zibzab',
    text: 'Selling? Careful. Prim counts write-offs. Zibzab only counts money.',
    trigger: { on: 'tower_sold' },
    when: { act: 1 },
  },
]);
