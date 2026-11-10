// Stasis Bloom (design/towers.md § 7): Aelari hard control, attuned in Xenotech after A3M1 for
// 3 Intel once the Prism is owned (upgrades/access.ts). A field, ground and air: enemies within
// it are Chilled, and every pulse puts each in Stasis (it interrupts and blocks abilities). T1
// (140): radius 2.0, Chilled 30%, a 1.5 s Stasis every 10 s. T2 (110): every 8 s. T3 (210): radius
// 2.5, 2.0 s. Gravity Well (420): each pulse also pulls enemies back 1.5 tiles along their route
// (each at most once every 20 s; bosses immune). Timeless Garden (420): Chilled 45%, every 6 s.
//
// A stub registered ahead of its task (T600a; the cut lever, D141): T608 confirms the numbers, runs
// the field (`tower.field`) and lifts it from towers/index.ts STUB_TOWER_TASKS. Sprites:
// placeholders under their final ids (T640b).
import { defineTower } from '../define.ts';

export const bloom = defineTower({
  id: 'bloom',
  name: 'Stasis Bloom',
  faction: 'aelari',
  role: 'Hard control',
  sprites: { base: 'tower.bloom', head: 'tower.bloom_head', icon: 'icon.tower.bloom' },
  tiers: [
    {
      cost: 140,
      targets: { ground: true, air: true },
      defaultPriority: null,
      field: { radiusTiles: 2, chillPct: 0.3, pulseEverySec: 10, stasisSec: 1.5 },
    },
    { cost: 110, field: { pulseEverySec: 8 } },
    { cost: 210, field: { radiusTiles: 2.5, stasisSec: 2 } },
  ],
  specs: {
    a: {
      name: 'Gravity Well',
      cost: 420,
      field: { pullBackTiles: 1.5, pullBackCooldownSec: 20 },
    },
    b: { name: 'Timeless Garden', cost: 420, field: { chillPct: 0.45, pulseEverySec: 6 } },
  },
});
