// Frostline Sprinkler, "AquaGuard irrigation head, creatively repurposed" (design/towers.md § 7).
// A pulse: every period it hits every ground enemy in radius and chills it. Sim-tested content
// that isn't placed on A1M1 (D004).
//
// M1 cut (design/maps.md § 6.4): the Sprinkler applies Chilled only. Tier 3's Soaked (3 s) is
// left out until a map needs it (Soaked first matters at A2M2's shields).
// TODO(A2M2): add `{ status: 'soaked', durationSec: 3 }` to tier 3's effects.
// Tier-4 specs (Flash Freeze, Cloudburst) land with T202.
import { defineTower } from '../define.ts';

export const sprinkler = defineTower({
  id: 'sprinkler',
  faction: 'everglow',
  role: 'Slow / control',
  sprites: { base: 'tower.sprinkler', head: 'tower.sprinkler_head', icon: 'icon.tower.sprinkler' },
  tiers: [
    {
      cost: 90,
      targets: { ground: true, air: false },
      defaultPriority: null,
      attack: { kind: 'pulse', type: 'kinetic', damage: 2, ratePerSec: 1.0, rangeTiles: 2.0 },
      effects: [{ status: 'chilled', pct: 0.25, durationSec: 1.5 }],
    },
    // Effects arrays replace whole, so each tier restates the chill.
    {
      cost: 70,
      attack: { rangeTiles: 2.3 },
      effects: [{ status: 'chilled', pct: 0.3, durationSec: 1.5 }],
    },
    { cost: 135, effects: [{ status: 'chilled', pct: 0.35, durationSec: 1.5 }] },
  ],
});
