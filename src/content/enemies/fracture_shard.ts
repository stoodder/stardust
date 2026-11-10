// Shard (design/enemies.md § 5.4, the Fracture's row): what a Fracture breaks into: 80 HP, 1.1
// tiles/s, Hollow, void; killed, it splits again into 2 Motes. `clustered` (D137): a pair of
// Shards is a splash problem, like a Mote cluster. The roster leaves the rest to its data (T503):
// no armor, leak 1 (a Fracture's 2 shared by its two Shards), bounty 4 (between the Fracture's
// 0.04 credits per HP and the Mote's 0.08). It only ever spawns from a Fracture, so its spawn
// interval is unused. Sprites: sprites/enemies/fracture_shard.ts (T540a).
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
