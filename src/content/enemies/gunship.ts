// Asset Recovery Gunship (design/enemies.md § 5.3): Everglow Security's flyer, A3M6's teach. The
// roster row: 300 HP, armor 8, 0.8 tiles/s, leak 3, bounty 22, air, mechanical, Flying and
// Armored.
//
// A stub registered ahead of its task (T700a): T703 confirms the numbers and the spawn interval
// (not in the docs: 2.0 s is a stub). It needs no new system. Sprites: placeholders under their
// final ids (T740a).
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
