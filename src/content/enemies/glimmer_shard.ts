// Glimmer-shard (design/enemies.md § 6, the Sunderglass Penitent): one of the 3 cloaked shards the
// Penitent releases when its shield breaks. They must be revealed and killed, or its shield
// re-forms (D137: 4 s after it broke, unless all three are dead). Aelari, crystalline, cloaked.
//
// A stub registered ahead of its task (T500a): its numbers aren't in the docs, so T506 settles
// them (here a Glimmer's body, no shield, at the Penitent's pace so the shards walk with it) and
// whether a shard leaks. Sprites: placeholders under their final ids (T540a).
import { defineEnemy } from '../define.ts';

export const glimmer_shard = defineEnemy({
  id: 'glimmer_shard',
  name: 'Glimmer-shard',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 60,
  armor: 0,
  speedTilesPerSec: 0.35,
  leak: 1,
  bounty: 0,
  spawnIntervalSec: 0.5,
  traits: ['cloaked'],
  tells: ['stealth'],
  sprites: { body: 'enemy.glimmer_shard', icon: 'icon.enemy.glimmer_shard' },
});
