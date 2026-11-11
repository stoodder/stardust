// Gloop Spitter (design/towers.md § 7): a big, round, happy Skitterkin (an ex-Chonk) who spits
// sticky acid; a gift (the warren's, under `door_choice = warren`; upgrades/access.ts). Splash and
// armor shred, ground only. T1 (120): 12 Explosive, splash 1.0, 0.6 shots/s, range 3.0, each hit
// 1 Corroded stack (max 5; −1 armor per stack). T2 (95): 16, max 6. T3 (180): 2 stacks per hit, max
// 8. Big Glorp (360): each hit leaves a puddle for 3 s, Chilled 25% and 10/s Kinetic acid (a DoT;
// armor bypassed). Corrosive Kiss (360): 3 stacks, max 12, and shields regenerate 50% slower.
//
// As built (T705): the numbers are towers.md's. Chosen where it is silent: the spit is a lobbed
// glob (0.6 s flight, led like the Thumper's shell, no minimum range), and Big Glorp's puddle has
// the splash's radius (1.0) and lands where each glob does, hit or miss (sim/puddles.ts: one
// puddle per unit at a time, its acid under the tower's damage percent). Links: Acid Rain
// (Thumper: +0.5 range here) and Sticky Flak (Skyhook: +10% fire rate here). Sprites: the tower's
// are sprites/towers/gloop.ts (T740b); the glob is `projectile.gloop_glob`.
import { defineTower } from '../define.ts';

export const gloop = defineTower({
  id: 'gloop',
  name: 'Gloop Spitter',
  faction: 'skitterkin',
  role: 'Splash + armor shred',
  sprites: { base: 'tower.gloop', head: 'tower.gloop_head', icon: 'icon.tower.gloop' },
  tiers: [
    {
      cost: 120,
      targets: { ground: true, air: false },
      defaultPriority: 'strong',
      attack: {
        kind: 'lobbed',
        type: 'explosive',
        damage: 12,
        ratePerSec: 0.6,
        rangeTiles: 3.0,
        projectile: 'projectile.gloop_glob',
        flightSec: 0.6,
        splashTiles: 1.0,
        lead: true,
      },
      effects: [{ status: 'corroded', stacks: 1, maxStacks: 5 }],
    },
    {
      cost: 95,
      attack: { damage: 16 },
      effects: [{ status: 'corroded', stacks: 1, maxStacks: 6 }],
    },
    { cost: 180, effects: [{ status: 'corroded', stacks: 2, maxStacks: 8 }] },
  ],
  specs: {
    a: {
      name: 'Big Glorp',
      cost: 360,
      puddle: {
        durationSec: 3,
        radiusTiles: 1.0,
        chillPct: 0.25,
        damagePerSec: 10,
        type: 'kinetic',
      },
    },
    b: {
      name: 'Corrosive Kiss',
      cost: 360,
      effects: [{ status: 'corroded', stacks: 3, maxStacks: 12, shieldRegenSlowPct: 0.5 }],
    },
  },
});
