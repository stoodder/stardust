// Maw (design/enemies.md § 5.4): the Hollow's gatherer, A3M1's teach ("It takes them into
// itself"). The roster row is the spec: 400 HP, armor 2, 0.7 tiles/s, leak 2 (+1 per absorb),
// bounty 20 (+3 per Hollow absorb only), ground, void. Gathering (`consumer`): every 4 s, after a
// 1 s tendril tell, it draws in the nearest eligible unit within 1 tile (a non-boss Hollow unit,
// or at most one Skitterkin enemy or refugee: that gather is its one hush, so it never turns
// Heavy), adding that unit's current HP to its own HP and max HP and growing 10%; max 5 absorbs.
// Never an Everglow or Aelari unit, never a boss, never a Skitterkin tower's swarmlings.
//
// A stub registered ahead of its task (T600a): T602 confirms the numbers and the spawn interval
// (not in the docs: 2.0 s is a stub) and runs the gather (`enemy.gather`). Sprites: placeholders
// under their final ids (T640a).
import { defineEnemy } from '../define.ts';

export const maw = defineEnemy({
  id: 'maw',
  name: 'Maw',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 400,
  armor: 2,
  speedTilesPerSec: 0.7,
  leak: 2,
  bounty: 20,
  spawnIntervalSec: 2.0,
  traits: ['armored', 'gathering'],
  tells: ['armored', 'consumer', 'hollow'],
  gather: {
    everySec: 4,
    tellSec: 1,
    radiusTiles: 1,
    maxAbsorbs: 5,
    growPct: 0.1,
    leakPerAbsorb: 1,
    bountyPerHollowAbsorb: 3,
  },
  sprites: { body: 'enemy.maw', icon: 'icon.enemy.maw' },
});
