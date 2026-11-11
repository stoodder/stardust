// Compliance Drone (design/enemies.md § 5.3): Everglow Security's walker, A3M2's teach (Clean
// Exit's repossession: a leak is a repossession). The roster row is the spec: 120 HP, armor 4,
// 1.0 tiles/s, leak 1, bounty 6, ground, mechanical, Armored. Psionic does ×0.35 against it.
//
// T603: the row as built. Spawn interval 1.0 s (no doc number: a drone column one tile apart,
// the Blinkstrider's and the Digger's spacing, so a Harpoon's Skewer still finds two in a line).
// Its PA is Prim's voice (story/campaign/act3.md § A3M2: a `wave_start` bark naming `everglow`;
// app/dialogue.ts). It dies in a clean shutdown with a falling price tag (render/views/
// deathLook.ts `shutdown`). Sprites: placeholders under their final ids (T640a).
import { defineEnemy } from '../define.ts';

export const compliance = defineEnemy({
  id: 'compliance',
  name: 'Compliance Drone',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'ground',
  hp: 120,
  armor: 4,
  speedTilesPerSec: 1.0,
  leak: 1,
  bounty: 6,
  spawnIntervalSec: 1.0,
  traits: ['armored'],
  tells: ['armored'],
  sprites: { body: 'enemy.compliance', icon: 'icon.enemy.compliance' },
});
