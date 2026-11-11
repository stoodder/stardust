// Asset Recovery Gunship (design/enemies.md § 5.3): Everglow Security's flyer, A3M6's teach. The
// roster row is the spec: 300 HP, armor 8, 0.8 tiles/s, leak 3, bounty 22, air, mechanical, Flying
// and Armored (a Sproing pin grounds it; Harpoon and Seeker Swarm answer its plates).
//
// T703: the row as built; it needs no new system. Spawn interval 2.0 s (no doc number: 1.6 tiles
// apart on the lane, so one flak burst catches one gunship, never a pair, and each must be
// answered on its own). Prim's PA greets its first appearance (dialogue/barks/act3.ts). Sprites:
// placeholders under their final ids (T740a).
import { defineEnemy } from '../define.ts';

export const gunship = defineEnemy({
  id: 'gunship',
  name: 'Asset Recovery Gunship',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'air',
  hp: 300,
  armor: 8,
  speedTilesPerSec: 0.8,
  leak: 3,
  bounty: 22,
  spawnIntervalSec: 2.0,
  traits: ['armored', 'flying'],
  tells: ['armored', 'flying'],
  sprites: { body: 'enemy.gunship', icon: 'icon.enemy.gunship' },
});
