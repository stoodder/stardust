// Fracture (design/enemies.md § 5.4): A2M6's Hollow splitter. The roster row: 200 HP, no armor,
// 0.9 tiles/s, leak 2, bounty 8, ground, void; killed, it splits into 2 Shards (`fracture_shard`),
// each of which splits into 2 Motes when killed: a two-level split (rules.ts SPLIT_MAX_DEPTH;
// enemyAbilities/split.ts). A whole Fracture pays 8 + 2 × 4 + 4 × 2 = 24 for 460 HP in all; one
// that leaks costs 2, as its two Shards would. It hushes under the hush rule (every non-boss
// Hollow unit does). Sprites: placeholders under their final ids (T540a).
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
