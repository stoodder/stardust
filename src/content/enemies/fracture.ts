// Fracture (design/enemies.md § 5.4): A2M6's Hollow splitter. The roster row: 200 HP, no armor,
// 0.9 tiles/s, leak 2, bounty 8, ground, void; it splits into 2 Shards (`fracture_shard`), each of
// which splits into 2 Motes: a two-level split (rules.ts SPLIT_MAX_DEPTH).
//
// A stub registered ahead of its task (T500a): T503 confirms the numbers and the two-level split.
// Sprites: placeholders under their final ids (T540a).
import { defineEnemy } from '../define.ts';

export const fracture = defineEnemy({
  id: 'fracture',
  name: 'Fracture',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 200,
  armor: 0,
  speedTilesPerSec: 0.9,
  leak: 2,
  bounty: 8,
  spawnIntervalSec: 1.2,
  traits: ['splitting'],
  tells: ['splitter', 'hollow'],
  split: { enemy: 'fracture_shard', count: 2 },
  sprites: { body: 'enemy.fracture', icon: 'icon.enemy.fracture' },
});
