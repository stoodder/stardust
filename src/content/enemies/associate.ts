// Maintenance Associate (design/enemies.md § 5.3): Everglow Security's healer. The roster row:
// 160 HP, armor 3, 0.9 tiles/s, leak 1, bounty 14, ground, mechanical, Armored. Healer aura:
// every other Mechanical unit of its faction within 1.5 tiles regains 12 HP/s (never itself, never
// a boss; two auras don't stack).
//
// A stub registered ahead of its task (T700a): T703 confirms the numbers and the spawn interval
// (not in the docs: 1.5 s is a stub) and runs the aura (`enemy.healAura`). Sprites: placeholders
// under their final ids (T740a).
import { defineEnemy } from '../define.ts';

export const associate = defineEnemy({
  id: 'associate',
  name: 'Maintenance Associate',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'ground',
  hp: 160,
  armor: 3,
  speedTilesPerSec: 0.9,
  leak: 1,
  bounty: 14,
  spawnIntervalSec: 1.5,
  traits: ['armored', 'healer_aura'],
  tells: ['armored', 'healer'],
  healAura: { radiusTiles: 1.5, hpPerSec: 12, body: 'mechanical' },
  sprites: { body: 'enemy.associate', icon: 'icon.enemy.associate' },
});
