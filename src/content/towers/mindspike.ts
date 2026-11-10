// Mindspike Obelisk (design/towers.md § 7): attuned in R&D after A2M5 (Xenotech, 3 Intel;
// upgrades/access.ts), Aelari, ground and air. 18 Psionic, 0.8 shots/s, range 3.0, single target;
// Psionic ignores armor (×0.35 against Everglow machines, ×0.75 against the Aelari, ×1.5 against the
// Hollow; enemies.md § 2.2). T2 damage 26; T3 34 at 1.0/s. Echo Spike: each hit echoes 50% to
// every enemy within 1.2 tiles of the target. Dread: damage 50, and each hit Unnerves for 1.5 s
// (−20% speed, abilities interrupted and blocked; enemies.md § 2.4).
//
// A stub registered ahead of its task (T500a): T507 confirms the numbers, runs the echo and
// Unnerved, and lifts it from towers/index.ts STUB_TOWER_TASKS. Sprites: placeholders under their
// final ids (T540b).
import { defineTower } from '../define.ts';

export const mindspike = defineTower({
  id: 'mindspike',
  name: 'Mindspike Obelisk',
  faction: 'aelari',
  role: 'Armor-ignoring DPS',
  sprites: { base: 'tower.mindspike', head: 'tower.mindspike_head', icon: 'icon.tower.mindspike' },
  tiers: [
    {
      cost: 150,
      targets: { ground: true, air: true },
      defaultPriority: 'first',
      attack: { kind: 'hitscan', type: 'psionic', damage: 18, ratePerSec: 0.8, rangeTiles: 3 },
    },
    { cost: 120, attack: { damage: 26 } },
    { cost: 225, attack: { damage: 34, ratePerSec: 1 } },
  ],
  specs: {
    a: { name: 'Echo Spike', cost: 450, attack: { echo: { pct: 0.5, radiusTiles: 1.2 } } },
    b: {
      name: 'Dread',
      cost: 450,
      attack: { damage: 50 },
      effects: [{ status: 'unnerved', durationSec: 1.5 }],
    },
  },
});
