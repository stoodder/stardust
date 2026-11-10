// Glimmer-shard (design/enemies.md § 6, the Sunderglass Penitent): one of the 3 cloaked shards the
// Penitent releases when its shield breaks (T506; enemyAbilities/shieldBroken.ts). While any shard
// lives, the Penitent's shield re-forms 4 s after each break (D137), so they must be revealed and
// killed. Aelari, crystalline, cloaked, never shielded (a Glimmer's 60 HP body without its own
// shield). They walk at the Penitent's pace, so they stay round it and inside the detection that
// covers it; a shard that leaks costs 1, and one killed pays 3 (half a Glimmer). Born only from
// the boss (never in a wave group), they stand down with it at the pivot.
// Sprites: sprites/enemies/glimmer_shard.ts (T540a).
import { defineEnemy } from '../define.ts';

export const glimmer_shard = defineEnemy({
  id: 'glimmer_shard',
  name: 'Glimmer-shard',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 60,
  armor: 0,
  speedTilesPerSec: 0.2,
  leak: 1,
  bounty: 3,
  spawnIntervalSec: 0.5,
  traits: ['cloaked'],
  tells: ['stealth'],
  sprites: { body: 'enemy.glimmer_shard', icon: 'icon.enemy.glimmer_shard' },
});
