// Black Budget Operative (design/enemies.md § 5.3): Everglow Security's cloaked walker, A3M6's
// teach. The roster row is the spec: 200 HP, armor 6, 1.0 tiles/s, leak 2, bounty 18, ground,
// mechanical, Cloaked and Armored (detection and armor both: Lookout + Harpoon).
//
// T703: the row as built; its cloak runs on the M4 rule (T406). Spawn interval 1.5 s (no doc
// number: 1.5 tiles apart, so a detector's ring reveals one Operative at a time as a pair walks
// in). Prim's PA greets its first appearance (dialogue/barks/act3.ts). Sprites: placeholders under
// their final ids (T740a: the cloak frames).
import { defineEnemy } from '../define.ts';

export const blackbudget = defineEnemy({
  id: 'blackbudget',
  name: 'Black Budget Operative',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'ground',
  hp: 200,
  armor: 6,
  speedTilesPerSec: 1.0,
  leak: 2,
  bounty: 18,
  spawnIntervalSec: 1.5,
  traits: ['armored', 'cloaked'],
  tells: ['armored', 'stealth'],
  sprites: { body: 'enemy.blackbudget', icon: 'icon.enemy.blackbudget' },
});
