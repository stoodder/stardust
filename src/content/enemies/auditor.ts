// Auditor (design/enemies.md § 5.3): Everglow Security's jammer, A3M5's teach. The roster row:
// 220 HP, armor 6, 0.8 tiles/s, leak 2, bounty 20, ground, mechanical, Armored. Jammer (`ring`;
// enemies.md § 4): every 10 s an orange ring expands from it for 2 s, then every non-immune tower
// within 2 tiles is jammed for 3 s (× its `jamMul`).
//
// A stub registered ahead of its task (T700a): T707 confirms the numbers and the spawn interval
// (not in the docs: 1.5 s is a stub) and runs the ring (`enemy.jam.ring`). Sprites: placeholders
// under their final ids (T740a).
import { defineEnemy } from '../define.ts';

export const auditor = defineEnemy({
  id: 'auditor',
  name: 'Auditor',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'ground',
  hp: 220,
  armor: 6,
  speedTilesPerSec: 0.8,
  leak: 2,
  bounty: 20,
  spawnIntervalSec: 1.5,
  traits: ['armored', 'jammer'],
  tells: ['armored', 'disabler'],
  jam: { kind: 'ring', periodSec: 10, tellSec: 2, radiusTiles: 2, durationSec: 3 },
  sprites: { body: 'enemy.auditor', icon: 'icon.enemy.auditor' },
});
