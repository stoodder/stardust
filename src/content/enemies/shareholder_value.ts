// "Shareholder Value" Executive Assault Platform (design/enemies.md § 6): A3M5's boss, piloted by
// Director Sterling by remote. HP 3800, armor 15, speed 0.3, Everglow, mechanical, bounty 0 (its
// wave's clear bonus is tripled). Phases (D146; T707):
// (1) it advances and launches 2 Compliance Drones from its hangar every 8 s (enemyAbilities/
//     hangar.ts: the sneeze's rules, a 1.5 s tell as the hangar door opens; the drones spawn from
//     the run's scaled def, so C4 Purge reaches them);
// (2, 66%) Hostile Takeover (enemyAbilities/takeover.ts): a 3 s visible targeting laser on the
//     `min(2, floor(0.25 × towers placed))` highest-tier non-immune towers, picked as it starts,
//     then a 4 s jam on each (the jam rules: a Choir T3 makes it 1 s, a Reboot during the laser
//     spends it); the first laser as the phase's invulnerability ends, then one every 20 s;
// (3, 33%) it jettisons its plating (enemyAbilities/jettison.ts): armor 0 (over C4 Purge's −2),
//     Haste 40%, and the four plates land on the map's `crash_*` markers (`openTile` to wreckage;
//     [jettison] keeps them on decor, never a pad).
// Driven off at 0 (the platform breaks and limps away). `leak` 3 never applies (a leaking boss
// drains everything). The docs give no hangar numbers or Takeover period: 2 drones / 8 s are
// T707's; the 20 s period and the 3800 HP are A3M5's tuning (T721; D146 addenda: at 9000 HP par's
// armor-piercing damage, about 36 dps over the 130 s road, can't drive it off). Sprites: placeholders under
// their final ids (T740a).
import { defineEnemy } from '../define.ts';

export const shareholder_value = defineEnemy({
  id: 'shareholder_value',
  name: '"Shareholder Value"',
  faction: 'everglow',
  body: 'mechanical',
  layer: 'ground',
  hp: 3800,
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
      { fromPct: 0.66, takeover: { tellSec: 3, durationSec: 4, everySec: 20 } },
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
