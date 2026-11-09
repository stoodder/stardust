// Gerald the mail drone (design/core-loop.md § 2.7; act1.md § A1M3): a neutral unit. Towers that
// aren't holding fire target him like an enemy, he takes no damage (shots plink off, NeutralHit),
// each hit costs the Return to Sender Challenge (`stats.neutralHits`), and he never leaks, pays
// nothing, and can't lose the map. He is Everglow's, so the Skitterkin-only stats never count him.
// Open fork for T304a (D064): core-loop says he flies "along the path", act1.md calls him "a neutral
// air unit". He is an air unit here (so Rivets and Skyhooks see him, Thumpers don't), which T304a
// may revisit along with whether a splash counts as a hit. HP 1 and speed 1.0 are placeholders
// (he is never hurt; his pace isn't in the docs). createSim refuses neutral units until T304a
// (FEATURE_GATES `enemy.neutral`). Sprites are placeholders under their final ids (T311a).
import { defineEnemy } from '../define.ts';

export const gerald = defineEnemy({
  id: 'gerald',
  name: 'Gerald',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'air',
  hp: 1,
  armor: 0,
  speedTilesPerSec: 1.0,
  leak: 0,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: ['flying'],
  tells: ['flying'],
  neutral: true,
  sprites: { body: 'enemy.gerald', icon: 'icon.enemy.gerald' },
});
