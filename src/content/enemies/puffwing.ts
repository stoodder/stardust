// Puffwing (design/enemies.md § 5.1): a fluffy Skitterkin glider, Act I's first flyer (A1M3). It
// flies the air lanes, so only towers that hit air can reach it (Rivet, Skyhook; Zapcoil from
// A1M4). The roster row is the spec: 40 HP, no armor, 1.1 tiles/s, leak 1, bounty 5, air.
// Spawn interval 0.6 s (the docs leave it to data): a flock flies 0.66 tiles apart, so a Skyhook's
// 0.8-radius flak burst catches two or three at once while a single-target Rivet works through
// them one by one. Wave data may override it per group. Sprites are placeholders under their
// final ids (T311a).
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
  spawnIntervalSec: 0.6,
  traits: ['flying'],
  tells: ['flying'],
  sprites: { body: 'enemy.puffwing', icon: 'icon.enemy.puffwing' },
});
