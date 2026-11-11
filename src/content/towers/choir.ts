// Hum Choir (design/towers.md § 7): a ring of elder Skitterkin humming in harmony, a gift after
// A3M1 if the Quiet Wave was spared (Old Thrum's ring), else in A3M4's briefing (upgrades/
// access.ts). Support, no attack: towers inside its aura (the `choir` kind) get +damage, and
// Jammed durations on them are multiplied by `jamMul`. T1 (130): radius 1.5, +10%, jams halved.
// T2 (100): radius 2.0, +15%. T3 (195): +20%, jams cut by 75%. Lullaby (390): T3's aura, and
// enemies within 2.5 are Lulled (enemies.md § 2.4). Rally Chorus (390): +30% damage and +10% fire
// rate (two `choir` auras, one per stat: a tower takes both from the strongest Choir covering it),
// and towers inside are immune to Jammed (`jamMul` 0).
//
// Live since T607: the aura rule (two Choirs don't stack; no Choir aura covers any Choir; the jam
// rule) is sim/systems/auras.ts, Lulled systems/status.ts `lullPass`. The jam rules are inert data
// until M7's jammers (D141). Aura arrays replace whole, so each tier restates its aura. Links:
// Harmony (Mindspike) and Bounce Chorus (Sproing, M7). Sprites: `tower.choir` and its head, with
// Thrum's voice as extra anims on the same head (content/sprites/).
import { defineTower } from '../define.ts';

export const choir = defineTower({
  id: 'choir',
  name: 'Hum Choir',
  faction: 'skitterkin',
  role: 'Support (damage aura, jam protection)',
  sprites: { base: 'tower.choir', head: 'tower.choir_head', icon: 'icon.tower.choir' },
  tiers: [
    {
      cost: 130,
      targets: { ground: false, air: false },
      defaultPriority: null,
      auras: [{ kind: 'choir', radiusTiles: 1.5, stat: 'damage', pct: 0.1 }],
      jamMul: 0.5,
    },
    { cost: 100, auras: [{ kind: 'choir', radiusTiles: 2, stat: 'damage', pct: 0.15 }] },
    {
      cost: 195,
      auras: [{ kind: 'choir', radiusTiles: 2, stat: 'damage', pct: 0.2 }],
      jamMul: 0.25,
    },
  ],
  specs: {
    a: { name: 'Lullaby', cost: 390, lull: { radiusTiles: 2.5 } },
    b: {
      name: 'Rally Chorus',
      cost: 390,
      auras: [
        { kind: 'choir', radiusTiles: 2, stat: 'damage', pct: 0.3 },
        { kind: 'choir', radiusTiles: 2, stat: 'rate', pct: 0.1 },
      ],
      jamMul: 0,
    },
  },
});
