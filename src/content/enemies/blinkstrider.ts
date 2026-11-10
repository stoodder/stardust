// Blinkstrider (design/enemies.md § 5.2): A2M4's blink teach. The roster row: 110 HP, no armor,
// shield 50 (regen 10/s after 3 s), 1.0 tiles/s, leak 2, bounty 10, ground, crystalline; Blink:
// 2.5 tiles forward every 6 s after a 0.8 s tell (the blink runs since T404).
//
// A stub registered ahead of its task (T500a): T502 confirms the numbers and the spawn interval.
// Sprites: placeholders under their final ids (T540a).
import { defineEnemy } from '../define.ts';

export const blinkstrider = defineEnemy({
  id: 'blinkstrider',
  name: 'Blinkstrider',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 110,
  armor: 0,
  shield: { hp: 50, regenPerSec: 10, regenDelaySec: 3 },
  speedTilesPerSec: 1.0,
  leak: 2,
  bounty: 10,
  spawnIntervalSec: 1.0,
  traits: ['shielded', 'blink'],
  tells: ['shielded', 'regen', 'blink'],
  blink: { everySec: 6, tellSec: 0.8, tiles: 2.5 },
  sprites: { body: 'enemy.blinkstrider', icon: 'icon.enemy.blinkstrider' },
});
