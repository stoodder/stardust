// Frostline Sprinkler, "AquaGuard irrigation head, creatively repurposed" (design/towers.md § 7).
// A pulse: every period it hits every ground enemy in radius and chills it. Tier 3 also Soaks
// (3 s, T321). Its specs (T407a):
// - Flash Freeze: a burst on its own 8 s timer (`attack.burst`, sim/systems/towers.ts) puts every
//   enemy the pulse reaches into Stasis for 1.0 s (a boss takes Chilled 50% instead;
//   sim/systems/status.ts), on top of tier 3's chill and Soak each second.
// - Cloudburst: radius 2.8 and it hits air too, so flyers are Chilled and Soaked like walkers.
import { defineTower } from '../define.ts';

export const sprinkler = defineTower({
  id: 'sprinkler',
  name: 'Sprinkler',
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
    {
      cost: 135,
      effects: [
        { status: 'chilled', pct: 0.35, durationSec: 1.5 },
        { status: 'soaked', durationSec: 3 },
      ],
    },
  ],
  specs: {
    a: {
      name: 'Flash Freeze',
      cost: 270,
      attack: { burst: { everySec: 8, effects: [{ status: 'stasis', durationSec: 1.0 }] } },
    },
    b: {
      name: 'Cloudburst',
      cost: 270,
      targets: { ground: true, air: true },
      attack: { rangeTiles: 2.8 },
    },
  },
});
