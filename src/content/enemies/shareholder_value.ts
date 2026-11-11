// "Shareholder Value" Executive Assault Platform (design/enemies.md § 6): A3M5's boss, piloted by
// Director Sterling by remote. HP 9000, armor 15, speed 0.3, Everglow, mechanical, bounty 0 (its
// wave's clear bonus is tripled). Phases (D146): (1) it advances and launches Compliance Drones
// from its hangar; (2, 66%) Hostile Takeover: a 3 s visible targeting laser on the
// `min(2, floor(0.25 × towers placed))` highest-tier non-immune towers, then a 4 s jam on each (the
// jam rules); (3, 33%) it jettisons its plating: armor 0, Haste 40%, and the four plates land on
// the map's `crash_*` markers (`openTile` to wreckage; never a par pad). Driven off at 0 (the
// platform breaks and limps away). `leak` 3 never applies (a leaking boss drains everything).
//
// A stub registered ahead of its task (T700a): T707 confirms the numbers (the hangar's 2 drones
// every 8 s are a stub; the docs give none) and runs the hangar, the Takeover, and the jettison
// (`enemy.boss.hangar`, `enemy.boss.takeover`, `enemy.boss.jettison`). Sprites: placeholders
// under their final ids (T740a).
import { defineEnemy } from '../define.ts';

export const shareholder_value = defineEnemy({
  id: 'shareholder_value',
  name: '"Shareholder Value"',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'ground',
  hp: 9000,
  armor: 15,
  speedTilesPerSec: 0.3,
  leak: 3,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: ['armored', 'jammer'],
  tells: ['armored', 'disabler', 'boss'],
  boss: {
    phases: [
      { fromPct: 1, hangar: { enemy: 'compliance', count: 2, everySec: 8 } },
      { fromPct: 0.66, takeover: { tellSec: 3, durationSec: 4 } },
      {
        fromPct: 0.33,
        jettison: { hastePct: 0.4, plates: ['crash_1', 'crash_2', 'crash_3', 'crash_4'] },
      },
    ],
    ending: 'driveOff',
    endAtPct: 0,
  },
  sprites: { body: 'enemy.shareholder_value', icon: 'icon.enemy.shareholder_value' },
});
