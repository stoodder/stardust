// Prism Spire (design/towers.md § 7): Ves'thara's gift after A2M5 (upgrades/access.ts), Aelari,
// ground and air. A continuous Energy beam, 12/s, ramping +50% per second on the same target up to
// ×4 (48/s); range 3.0; sticky (it keeps its target until it dies or leaves range, towers.md § 5);
// retargeting resets the ramp. A beam, not a DoT: armor applies per beam tick (enemies.md § 2.3).
// T2 16/s; T3 ramp cap ×5, range 3.5; Refractor: 3 beams on 3 targets, cap ×3; Sunlance: +100% per
// second, cap ×10. While its beam is active it is a light source at Sundown (radius 2.0; maps.md
// § 5.1; T505).
//
// A stub registered ahead of its task (T500a): T504 confirms the numbers, runs the beam, and lifts
// it from towers/index.ts STUB_TOWER_TASKS. `ratePerSec` restates the beam tick (4/s) until T504
// settles what a beam's rate means. Sprites: placeholders under their final ids (T540b).
import { DEFAULT_BEAM_TICK_SEC } from '../rules.ts';
import { defineTower } from '../define.ts';

export const prism = defineTower({
  id: 'prism',
  name: 'Prism Spire',
  faction: 'aelari',
  role: 'Ramping beam',
  sprites: { base: 'tower.prism', head: 'tower.prism_head', icon: 'icon.tower.prism' },
  lightRadiusTiles: 2,
  tiers: [
    {
      cost: 160,
      targets: { ground: true, air: true },
      defaultPriority: 'strong',
      attack: {
        kind: 'beam',
        type: 'energy',
        damage: 12,
        ratePerSec: 1 / DEFAULT_BEAM_TICK_SEC,
        rangeTiles: 3,
        tickSec: DEFAULT_BEAM_TICK_SEC,
        rampPctPerSec: 0.5,
        rampCap: 4,
      },
    },
    { cost: 130, attack: { damage: 16 } },
    { cost: 240, attack: { rampCap: 5, rangeTiles: 3.5 } },
  ],
  specs: {
    a: { name: 'Refractor', cost: 480, attack: { beams: 3, rampCap: 3 } },
    b: { name: 'Sunlance', cost: 480, attack: { rampPctPerSec: 1, rampCap: 10 } },
  },
});
