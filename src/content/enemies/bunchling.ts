// Bunchling (design/enemies.md § 5.1): a packed Skitterkin that splits into 3 Nibblers when killed
// (A1M4's splash lesson; sim/enemyAbilities/split.ts: they trail its death point, in its wave).
// The spawn interval isn't in the docs: 1.0 s is a first pass.
// Sprites are placeholders under their final ids (T311a).
import { defineEnemy } from '../define.ts';

export const bunchling = defineEnemy({
  id: 'bunchling',
  name: 'Bunchling',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 60,
  armor: 0,
  speedTilesPerSec: 0.9,
  leak: 1,
  bounty: 5,
  spawnIntervalSec: 1.0,
  traits: ['splitting'],
  tells: ['splitter'],
  split: { enemy: 'nibbler', count: 3 },
  sprites: { body: 'enemy.bunchling', icon: 'icon.enemy.bunchling' },
});
