// Zoomer: the fast Skitterkin (design/enemies.md § 5.1). Fast is intel-only (enemies.md § 3.1):
// it shows in threat intel and never makes a Zoomer soft. Spawn interval 0.5 s is the documented
// default (enemies.md § 5, Spawn spacing).
import { defineEnemy } from '../define.ts';

export const zoomer = defineEnemy({
  id: 'zoomer',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 20,
  armor: 0,
  speedTilesPerSec: 2.0,
  leak: 1,
  bounty: 4,
  spawnIntervalSec: 0.5,
  traits: ['fast'],
  tells: ['fast'],
  sprites: { body: 'enemy.zoomer', icon: 'icon.enemy.zoomer' },
});
