// Liability-Class Enforcer (design/enemies.md § 5.3): Everglow Security's heavy walker, A3M4's
// teach. The roster row: 600 HP, armor 12, 0.5 tiles/s, leak 4, bounty 30, ground, mechanical,
// Armored (heavy armor).
//
// A stub registered ahead of its task (T700a): T703 confirms the numbers and the spawn interval
// (not in the docs: 2.5 s is a stub). It needs no new system. Sprites: placeholders under their
// final ids (T740a).
import { defineEnemy } from '../define.ts';

export const liability = defineEnemy({
  id: 'liability',
  name: 'Liability-Class Enforcer',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'ground',
  hp: 600,
  armor: 12,
  speedTilesPerSec: 0.5,
  leak: 4,
  bounty: 30,
  spawnIntervalSec: 2.5,
  traits: ['armored'],
  tells: ['armored'],
  sprites: { body: 'enemy.liability', icon: 'icon.enemy.liability' },
});
