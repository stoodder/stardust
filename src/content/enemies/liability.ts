// Liability-Class Enforcer (design/enemies.md § 5.3): Everglow Security's heavy walker, A3M4's
// teach. The roster row is the spec: 600 HP, armor 12, 0.5 tiles/s, leak 4, bounty 30, ground,
// mechanical, Armored (heavy armor: only high per-hit damage, pierce, Corroded, or a beam bites).
//
// T703: the row as built; it needs no new system. Spawn interval 2.5 s (no doc number: at 0.5
// tiles/s that is 1.25 tiles apart, so a pair reads as two walls rather than one blob and a
// Harpoon's Skewer still lines them up). Prim's PA greets its first appearance (dialogue/barks/
// act3.ts). Sprites: placeholders under their final ids (T740a).
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
