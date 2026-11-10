// Veilwalker (design/enemies.md § 5.2): A2M4's Aelari teach for detection ("Cloaked!"). The roster
// row: 90 HP, no armor, shield 30 (regen 10/s after 3 s), 1.0 tiles/s, leak 2, bounty 10, ground,
// crystalline, Cloaked: untouchable unless Revealed (enemies.md § 2.5; the cloak runs since T406).
//
// A stub registered ahead of its task (T500a): T502 confirms the numbers and the spawn interval.
// Sprites: placeholders under their final ids (T540a).
import { defineEnemy } from '../define.ts';

export const veilwalker = defineEnemy({
  id: 'veilwalker',
  name: 'Veilwalker',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 90,
  armor: 0,
  shield: { hp: 30, regenPerSec: 10, regenDelaySec: 3 },
  speedTilesPerSec: 1.0,
  leak: 2,
  bounty: 10,
  spawnIntervalSec: 1.0,
  traits: ['shielded', 'cloaked'],
  tells: ['shielded', 'regen', 'stealth'],
  sprites: { body: 'enemy.veilwalker', icon: 'icon.enemy.veilwalker' },
});
