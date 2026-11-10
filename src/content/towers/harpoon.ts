// Grapple Harpoon (design/towers.md § 7): Zibzab's anti-armor spear, Vrell, ground and air, high
// per-hit Kinetic. T1 (150): 40 damage, 0.4 shots/s, range 4.0, armor pierce 4; default Strong.
// T2 (120): 55 damage. T3 (225): armor pierce 8, 0.5 shots/s. Skewer (450): pierces every enemy in
// a 5-tile line for 70 each. Tether (450): 80 damage, and the target is Pinned 2.5 s (a pinned
// flyer is grounded; bosses take Chilled 50% instead).
// Licensed after A2M1 (upgrades/access.ts). A T400a stub: T408 runs it and confirms these numbers
// (the shot may become a projectile), and createSim refuses it until then (`tower.harpoon`; the
// specs also need `attack.line` and `status.pinned`). Sprites: content/sprites/towers/harpoon.ts (T440b).
import { defineTower } from '../define.ts';

export const harpoon = defineTower({
  id: 'harpoon',
  name: 'Grapple Harpoon',
  faction: 'vrell',
  role: 'Anti-armor',
  sprites: { base: 'tower.harpoon', head: 'tower.harpoon_head', icon: 'icon.tower.harpoon' },
  tiers: [
    {
      cost: 150,
      targets: { ground: true, air: true },
      defaultPriority: 'strong',
      attack: {
        kind: 'hitscan',
        type: 'kinetic',
        damage: 40,
        ratePerSec: 0.4,
        rangeTiles: 4.0,
        armorPierce: 4,
      },
    },
    { cost: 120, attack: { damage: 55 } },
    { cost: 225, attack: { armorPierce: 8, ratePerSec: 0.5 } },
  ],
  specs: {
    a: {
      name: 'Skewer',
      cost: 450,
      attack: {
        kind: 'line',
        type: 'kinetic',
        damage: 70,
        ratePerSec: 0.5,
        rangeTiles: 4.0,
        armorPierce: 8,
        lengthTiles: 5,
      },
    },
    b: {
      name: 'Tether',
      cost: 450,
      attack: { damage: 80 },
      effects: [{ status: 'pinned', durationSec: 2.5 }],
    },
  },
});
