// Shard (design/enemies.md § 5.4, the Fracture's row): what a Fracture breaks into: 80 HP, 1.1
// tiles/s, Hollow, void; it splits again into 2 Motes. `clustered` (D137): a pair of Shards is a
// splash problem, like a Mote cluster.
//
// A stub registered ahead of its task (T500a): T503 settles what the docs leave out (here leak 1,
// bounty 4, no armor) and confirms the rest. Sprites: placeholders under their final ids (T540a).
import { defineEnemy } from '../define.ts';

export const fracture_shard = defineEnemy({
  id: 'fracture_shard',
  name: 'Shard',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 80,
  armor: 0,
  speedTilesPerSec: 1.1,
  leak: 1,
  bounty: 4,
  spawnIntervalSec: 0.5,
  traits: ['splitting', 'clustered'],
  tells: ['splitter', 'hollow'],
  split: { enemy: 'mote', count: 2 },
  sprites: { body: 'enemy.fracture_shard', icon: 'icon.enemy.fracture_shard' },
});
