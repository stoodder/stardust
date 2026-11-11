// Black Budget Operative (design/enemies.md § 5.3): Everglow Security's cloaked walker, A3M6's
// teach. The roster row: 200 HP, armor 6, 1.0 tiles/s, leak 2, bounty 18, ground, mechanical,
// Cloaked and Armored.
//
// A stub registered ahead of its task (T700a): T703 confirms the numbers and the spawn interval
// (not in the docs: 1.5 s is a stub). Its cloak runs on the M4 rule (T406). Sprites: placeholders
// under their final ids (T740a: the cloak frames).
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
