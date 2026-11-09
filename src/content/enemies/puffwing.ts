// Puffwing (design/enemies.md § 5.1): a fluffy Skitterkin glider, Act I's first flyer (A1M3). It
// flies the air lanes, so only towers that hit air can reach it; createSim refuses flyers until
// T304a (FEATURE_GATES `enemy.flying`). The spawn interval isn't in the docs: 0.8 s (a Nibbler's)
// is a first pass. Sprites are placeholders under their final ids (T311a).
import { defineEnemy } from '../define.ts';

export const puffwing = defineEnemy({
  id: 'puffwing',
  name: 'Puffwing',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'air',
  hp: 40,
  armor: 0,
  speedTilesPerSec: 1.1,
  leak: 1,
  bounty: 5,
  spawnIntervalSec: 0.8,
  traits: ['flying'],
  tells: ['flying'],
  sprites: { body: 'enemy.puffwing', icon: 'icon.enemy.puffwing' },
});
