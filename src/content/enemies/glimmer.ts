// Glimmer (design/enemies.md § 5.2): the first Aelari unit (A2M2), a small lumenglass construct
// behind a regenerating shield. The roster row is the spec: 60 HP, no armor, shield 40 (regen
// 10/s after 3 s), 1.1 tiles/s, leak 1, bounty 6, ground, crystalline. Shields run in the damage
// pipeline since M1 (enemies.md § 2.3); T403 confirms them in play. Spawn interval 0.8 s is a
// first pass. Sprites are placeholders under their final ids (T440a).
import { defineEnemy } from '../define.ts';

export const glimmer = defineEnemy({
  id: 'glimmer',
  name: 'Glimmer',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 60,
  armor: 0,
  shield: { hp: 40, regenPerSec: 10, regenDelaySec: 3 },
  speedTilesPerSec: 1.1,
  leak: 1,
  bounty: 6,
  spawnIntervalSec: 0.8,
  traits: ['shielded'],
  tells: ['shielded', 'regen'],
  sprites: { body: 'enemy.glimmer', icon: 'icon.enemy.glimmer' },
});
