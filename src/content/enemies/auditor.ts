// Auditor (design/enemies.md § 5.3): Everglow Security's jammer, A3M5's teach. The roster row:
// 220 HP, armor 6, 0.8 tiles/s, leak 2, bounty 20, ground, mechanical, Armored. Jammer (`ring`;
// enemies.md § 4): as soon as a tower is in reach, then every 10 s, an orange ring expands from it
// for 2 s, then every non-immune tower within 2 tiles is jammed for 4 s (× its `jamMul`; T760: 3 s
// → 4 s), within the jam limit.
//
// Live since T707 (sim/enemyAbilities/jamRing.ts; the rules: enemies.md § 4's *How jamming
// runs*): the roster row's numbers, and a 1.5 s spawn interval (the docs give none; T700a's stub,
// for A3M5's balance to tune). It holds still through
// its ring and waits, ready, while no tower it could jam is in reach. Sprites: placeholders under
// their final ids (T740a).
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
  jam: { kind: 'ring', periodSec: 10, tellSec: 2, radiusTiles: 2, durationSec: 4 },
  sprites: { body: 'enemy.auditor', icon: 'icon.enemy.auditor' },
});
