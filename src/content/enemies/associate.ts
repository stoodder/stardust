// Maintenance Associate (design/enemies.md § 5.3): Everglow Security's healer, A3M5's teach ("focus
// it"). The roster row is the spec: 160 HP, armor 3, 0.9 tiles/s, leak 1, bounty 14, ground,
// mechanical, Armored. Healer aura: every other Mechanical unit of its faction within 1.5 tiles
// regains 12 HP/s, continuously (never itself, never a boss; two auras don't stack).
//
// T703: the row as built; the aura runs in enemyAbilities/healAura.ts and shows as HealAuraView's
// `green.3` pulse ring with a ✚ on each unit it mends. Spawn interval 1.5 s (no doc number: a
// support unit walks among its escorts, as the Expediter does; at 0.9 tiles/s two Associates 1.35
// tiles apart sit in each other's rings, so a pair must be focused down together). Prim's PA
// greets its first appearance (dialogue/barks/act3.ts). Sprites: placeholders under their final
// ids (T740a).
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
