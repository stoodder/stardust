// Matriarch Chitterbloom (design/enemies.md § 6; A1M5's boss). "Chitterbloom" is Everglow's
// codename; her real name, Bramble, is used from A3M1, so this display name is Act I's. HP 2500,
// armor 2, speed 0.4, bounty 0 (her wave's clear bonus is tripled). Phases: (1) 100–60%, she
// sneezes out 2 Nibblers every 5 s; (2) 60–25%, she burrows twice for 3 s each and surfaces with a
// Bunchling; (3) 25–0%, she panics: Haste 50% and a constant huddle-heal on nearby young. At 0% she
// is driven off (`driveOff`), never killed, and the rest of her wave (her brood) leaves with her
// (sim/enemyAbilities/boss.ts, bossPhases.ts). The rule timings (each sneeze and dig's 1.5 s
// tell, 1.5 s of invulnerability per phase change, 4 s between digs) are in content/rules.ts.
// Settled by T304c: phase 3's huddle reuses the Elder's numbers (1.5 tiles, 4 HP/s); `leak` 2 never
// applies (a leaking boss drains all integrity, BOSS_LEAK_DRAINS_ALL). Her phase-2 burrows are
// boss behaviour, not the Burrowing trait (her intel shows the `boss` icon; no burrow answer is
// needed, since she surfaces on her own).
// Sprites are placeholders under their final ids (T311b).
import { defineEnemy } from '../define.ts';

export const chitterbloom = defineEnemy({
  id: 'chitterbloom',
  name: 'Matriarch Chitterbloom',
  faction: 'skitterkin',
  body: 'organic',
  layer: 'ground',
  hp: 2500,
  armor: 2,
  speedTilesPerSec: 0.4,
  leak: 2,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: ['armored'],
  tells: ['boss', 'armored'],
  boss: {
    phases: [
      { fromPct: 1, spawn: { enemy: 'nibbler', count: 2, everySec: 5 } },
      {
        fromPct: 0.6,
        burrow: { times: 2, durationSec: 3, surfaceSpawn: { enemy: 'bunchling', count: 1 } },
      },
      { fromPct: 0.25, hastePct: 0.5, huddle: { radiusTiles: 1.5, regenPerSec: 4 } },
    ],
    ending: 'driveOff',
    endAtPct: 0,
  },
  sprites: { body: 'enemy.chitterbloom', icon: 'icon.enemy.chitterbloom' },
});
