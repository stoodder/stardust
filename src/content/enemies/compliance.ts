// Compliance Drone (design/enemies.md § 5.3): Everglow Security's walker, A3M2's teach (Clean
// Exit's repossession: a leak is a repossession). The roster row is the spec: 120 HP, armor 4,
// 1.0 tiles/s, leak 1, bounty 6, ground, mechanical, Armored. Psionic does ×0.35 against it.
//
// A stub registered ahead of its task (T600a): T603 confirms the numbers and the spawn interval
// (not in the docs: 1.0 s is a stub). Sprites: placeholders under their final ids (T640a).
import { defineEnemy } from '../define.ts';

export const compliance = defineEnemy({
  id: 'compliance',
  name: 'Compliance Drone',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'ground',
  hp: 120,
  armor: 4,
  speedTilesPerSec: 1.0,
  leak: 1,
  bounty: 6,
  spawnIntervalSec: 1.0,
  traits: ['armored'],
  tells: ['armored'],
  sprites: { body: 'enemy.compliance', icon: 'icon.enemy.compliance' },
});
