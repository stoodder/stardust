// Nibbler: the Act I baseline Skitterkin (design/enemies.md § 5.1). Round, fuzzy, harmless; it
// only runs. Spawn interval 0.8 s is the documented default (enemies.md § 5, Spawn spacing).
import { defineEnemy } from '../define.ts';

export const nibbler = defineEnemy({
  id: 'nibbler',
  name: 'Nibbler',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 30,
  armor: 0,
  speedTilesPerSec: 1.0,
  leak: 1,
  bounty: 3,
  spawnIntervalSec: 0.8,
  traits: [],
  tells: [],
  sprites: { body: 'enemy.nibbler', icon: 'icon.enemy.nibbler' },
});
