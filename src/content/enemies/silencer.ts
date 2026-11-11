// Silencer (design/enemies.md § 5.4): the Hollow's jammer, A3M4's teach. The roster row: 260 HP,
// armor 4, 0.8 tiles/s, leak 2, bounty 22, ground, void, Armored. Jammer (`tendril`; enemies.md
// § 4): every 12 s it picks a Hum Choir within 2.5 tiles if there is one (else the highest-tier
// tower; ties: lowest entity id), skipping jam-immune towers, sends a black tendril creeping toward
// it for 2 s, then jams it for 4 s (× its `jamMul`) if it's still in reach. Dialogue and the codex
// call it *hushing*; the UI says Jammed.
//
// Live since T702 (sim/enemyAbilities/jamTendril.ts; the rules: enemies.md § 4's *How jamming
// runs*): the roster row's numbers, and a 2.0 s spawn interval (the docs give none: a jammer pair
// two tells apart). It holds still through its tell. Sprites: placeholders under their final ids
// (T740a).
import { defineEnemy } from '../define.ts';

export const silencer = defineEnemy({
  id: 'silencer',
  name: 'Silencer',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 260,
  armor: 4,
  speedTilesPerSec: 0.8,
  leak: 2,
  bounty: 22,
  spawnIntervalSec: 2.0,
  traits: ['armored', 'jammer'],
  tells: ['armored', 'disabler', 'hollow'],
  jam: {
    kind: 'tendril',
    periodSec: 12,
    tellSec: 2,
    radiusTiles: 2.5,
    durationSec: 6,
    prefer: 'choir',
  },
  sprites: { body: 'enemy.silencer', icon: 'icon.enemy.silencer' },
});
