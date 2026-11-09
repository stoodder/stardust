// Lookout Shack (design/towers.md § 7): Zibzab's watchtower, Vrell, no attack. It detects (reveals
// cloaked enemies within its radius; enemies.md § 2.5; sim/systems/detection.ts) and gives
// adjacent towers range: the adjacency bonus is the `lookout` aura kind (two Lookouts don't stack;
// towers.md § 4), and "adjacent" is the 8-neighbourhood, so the aura reaches 1.5 tiles (a corner
// neighbour sits √2 away). T1 (100): detect 2.5, +10% range. T2 (80): detect 3.0, +15%. T3 (150):
// detect 3.5, a 2 s reveal linger, +20%. Crow's Nest (300): detect 5.0, +25% range, revealed
// enemies take +10% damage (a Mark, so it doesn't stack with one). Overclock Rig (300): detect
// 3.5, +20% fire rate instead of range. Both specs keep T3's 2 s linger (a patch merges into T3's
// `detect`). Its links (Overwatch, Skywatch) add +0.5 detection radius; its tune-up is aura
// strength and radius (`supportStat`, upgrades/tuneUps.ts). Licensed after A1M5 for 150 Stardust
// (upgrades/access.ts). Sprites are placeholders under their final ids (T440b).
import { defineTower } from '../define.ts';

export const lookout = defineTower({
  id: 'lookout',
  name: 'Lookout Shack',
  faction: 'vrell',
  role: 'Detection / support',
  sprites: { base: 'tower.lookout', head: 'tower.lookout_head', icon: 'icon.tower.lookout' },
  tiers: [
    {
      cost: 100,
      targets: { ground: false, air: false },
      defaultPriority: null,
      detect: { radiusTiles: 2.5 },
      auras: [{ kind: 'lookout', radiusTiles: 1.5, stat: 'range', pct: 0.1 }],
    },
    // Aura arrays replace whole, so each tier restates its aura.
    {
      cost: 80,
      detect: { radiusTiles: 3.0 },
      auras: [{ kind: 'lookout', radiusTiles: 1.5, stat: 'range', pct: 0.15 }],
    },
    {
      cost: 150,
      detect: { radiusTiles: 3.5, lingerSec: 2 },
      auras: [{ kind: 'lookout', radiusTiles: 1.5, stat: 'range', pct: 0.2 }],
    },
  ],
  specs: {
    a: {
      name: "Crow's Nest",
      cost: 300,
      detect: { radiusTiles: 5.0, revealedDamagePct: 0.1 },
      auras: [{ kind: 'lookout', radiusTiles: 1.5, stat: 'range', pct: 0.25 }],
    },
    b: {
      name: 'Overclock Rig',
      cost: 300,
      auras: [{ kind: 'lookout', radiusTiles: 1.5, stat: 'rate', pct: 0.2 }],
    },
  },
});
