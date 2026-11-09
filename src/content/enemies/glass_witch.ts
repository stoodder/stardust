// The Glass Witch (design/enemies.md § 6; A2M2's boss): Ves'thara's lumenglass avatar. "The Glass
// Witch" is a working name the story may keep. HP 1800, shield 1200 (regen 30/s after 4 s), speed
// 0.5, no armor, bounty 0 (her wave's clear bonus is tripled). She walks the rig branch of a
// Protect map and targets only the extraction rigs (design/maps.md § 5.2; T305a). Phases: (1)
// a Cantor-style shield pulse every 8 s (1.5 s tell) that restores 120 shield to her and Aelari
// within 2 tiles (D101); (2) from 70%, she also blinks 2.5 tiles every 7 s (1.5 s tell). At 40%
// she retreats (`retreat`; enemies.md § 6.1). A Stasis converted to Chilled on her doesn't
// interrupt a blink (D101). Her blinks are boss behaviour, not the Blink trait (her intel shows
// the `boss` icon). First-pass data: whether phase 2 keeps the pulse is T404's call (it does
// here); `leak` 3 never applies (a leaking boss drains everything it reaches).
// Sprites are placeholders under their final ids (T440b).
import { defineEnemy } from '../define.ts';

const PULSE = { everySec: 8, tellSec: 1.5, radiusTiles: 2, shield: 120 } as const;

export const glass_witch = defineEnemy({
  id: 'glass_witch',
  name: 'The Glass Witch',
  faction: 'aelari',
  body: 'crystalline',
  layer: 'ground',
  hp: 1800,
  armor: 0,
  shield: { hp: 1200, regenPerSec: 30, regenDelaySec: 4 },
  speedTilesPerSec: 0.5,
  leak: 3,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: ['shielded'],
  tells: ['boss', 'shielded', 'regen'],
  boss: {
    phases: [
      { fromPct: 1, pulse: PULSE },
      { fromPct: 0.7, pulse: PULSE, blink: { everySec: 7, tellSec: 1.5, tiles: 2.5 } },
    ],
    ending: 'retreat',
    endAtPct: 0.4,
  },
  sprites: { body: 'enemy.glass_witch', icon: 'icon.enemy.glass_witch' },
});
