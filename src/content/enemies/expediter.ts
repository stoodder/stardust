// Expediter (design/enemies.md § 5.3): Everglow Security's support walker, A3M2's second teach
// ("kill it first"). The roster row is the spec: 150 HP, armor 3, 1.1 tiles/s, leak 1, bounty 12,
// ground, mechanical. Haste aura: every other Everglow unit within 2 tiles has +30% speed (highest
// only, under HASTE_CAP), continuously; its armor makes it Armored (light) too.
//
// T603: the row as built; the aura runs in enemyAbilities/hasteAura.ts (not itself, not a boss,
// the strongest ring once; enemies.md § 3) and shows as HasteAuraView's `orange.3` ring. Spawn
// interval 1.5 s (no doc number: a support unit walks among its escorts, the Cantor's role; two
// Expediters 1.65 tiles apart sit in each other's rings). At 1.1 tiles/s it catches up with the
// drones it hastes. Sprites: placeholders under their final ids (T640a).
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
