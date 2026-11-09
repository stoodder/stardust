// Digger (design/enemies.md § 5.1): every 6 s it digs in for 2 s at 1.5× speed, after the
// burrowing tell's 0.8 s dirt spray (§ 3). Its armor 1 makes it Armored (light) too. createSim
// refuses burrowing until T304c (FEATURE_GATES `enemy.burrow`; sim/enemyAbilities/burrow.ts). The
// spawn interval isn't in the docs: 1.0 s is a first pass. Sprites are placeholders (T311a).
import { defineEnemy } from '../define.ts';

export const digger = defineEnemy({
  id: 'digger',
  name: 'Digger',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 70,
  armor: 1,
  speedTilesPerSec: 0.9,
  leak: 1,
  bounty: 7,
  spawnIntervalSec: 1.0,
  traits: ['burrowing', 'armored'],
  tells: ['burrower', 'armored'],
  burrow: { everySec: 6, durationSec: 2, speedMul: 1.5, tellSec: 0.8 },
  sprites: { body: 'enemy.digger', icon: 'icon.enemy.digger' },
});
