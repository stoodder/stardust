// Lightwing (design/enemies.md § 5.2): A2M3's Aelari flyer, a shielded glider over the strip
// mine. The roster row is the spec: 60 HP, no armor, shield 60 (regen 10/s after 4 s), 1.3
// tiles/s, leak 1, bounty 8, air, crystalline. Spawn interval 0.7 s is a first pass (T403).
// Sprites are placeholders under their final ids (T440a).
import { defineEnemy } from '../define.ts';

export const lightwing = defineEnemy({
  id: 'lightwing',
  name: 'Lightwing',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'air',
  hp: 60,
  armor: 0,
  shield: { hp: 60, regenPerSec: 10, regenDelaySec: 4 },
  speedTilesPerSec: 1.3,
  leak: 1,
  bounty: 8,
  spawnIntervalSec: 0.7,
  traits: ['flying', 'shielded'],
  tells: ['flying', 'shielded', 'regen'],
  sprites: { body: 'enemy.lightwing', icon: 'icon.enemy.lightwing' },
});
