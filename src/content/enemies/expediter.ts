// Expediter (design/enemies.md § 5.3): Everglow Security's support walker, A3M2's second teach
// ("kill it first"). The roster row is the spec: 150 HP, armor 3, 1.1 tiles/s, leak 1, bounty 12,
// ground, mechanical. Haste aura: every other Everglow unit within 2 tiles has +30% speed (highest
// only, under HASTE_CAP), continuously; its armor makes it Armored (light) too.
//
// A stub registered ahead of its task (T600a): T603 confirms the numbers and the spawn interval
// (not in the docs: 1.5 s is a stub) and runs the aura (`enemy.hasteAura`). Sprites: placeholders
// under their final ids (T640a).
import { defineEnemy } from '../define.ts';

export const expediter = defineEnemy({
  id: 'expediter',
  name: 'Expediter',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'ground',
  hp: 150,
  armor: 3,
  speedTilesPerSec: 1.1,
  leak: 1,
  bounty: 12,
  spawnIntervalSec: 1.5,
  traits: ['armored', 'haste_aura'],
  tells: ['armored', 'haste_aura'],
  hasteAura: { radiusTiles: 2, pct: 0.3 },
  sprites: { body: 'enemy.expediter', icon: 'icon.enemy.expediter' },
});
