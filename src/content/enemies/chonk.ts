// Chonk: the tanky, lightly armored Skitterkin (design/enemies.md § 5.1). Sim-tested content that
// isn't placed on A1M1 (D004); it exercises the armor path. Its spawn interval isn't in the docs
// ("set when their first wave is authored"): 1.5 s is chosen so that, at 0.6 tiles/s, Chonks
// walk about 0.9 tiles apart, close to the Nibbler's 0.8.
import { defineEnemy } from '../define.ts';

export const chonk = defineEnemy({
  id: 'chonk',
  name: 'Chonk',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 180,
  armor: 2,
  speedTilesPerSec: 0.6,
  leak: 2,
  bounty: 12,
  spawnIntervalSec: 1.5,
  traits: ['armored'],
  tells: ['armored'],
  sprites: { body: 'enemy.chonk', icon: 'icon.enemy.chonk' },
});
