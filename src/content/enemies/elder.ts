// Elder (design/enemies.md § 5.1): slow, grumpy, and (on re-read) holding the group to its pace to
// protect the young. Huddle: allies within 1.5 tiles move at its pace and regenerate 4 HP/s. Its
// armor 2 makes it Armored (light) too. Old Thrum, who leads the Quiet Wave (A1M5), is an Elder.
// createSim refuses huddles until T304c (FEATURE_GATES `enemy.huddle`). The spawn interval isn't
// in the docs: 2.0 s is a first pass. Sprites are placeholders under their final ids (T311a).
import { defineEnemy } from '../define.ts';

export const elder = defineEnemy({
  id: 'elder',
  name: 'Elder',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 160,
  armor: 2,
  speedTilesPerSec: 0.6,
  leak: 2,
  bounty: 12,
  spawnIntervalSec: 2.0,
  traits: ['huddle', 'armored'],
  tells: ['huddle', 'armored'],
  huddle: { radiusTiles: 1.5, regenPerSec: 4 },
  sprites: { body: 'enemy.elder', icon: 'icon.enemy.elder' },
});
