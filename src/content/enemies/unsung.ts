// The Unsung (design/enemies.md § 6; design's *Unmaking*): the finale's boss, rising from the Deep
// Halls in Phase 2 (story/campaign/finale.md). HP 30000 (plus the Deep Bore's bonus: +5% per
// tenth filled, MapDef.timers; systems/waves.ts scales its def as it spawns), Hollow, void,
// bounty 0. Its four forms by HP share:
// 1. (100–75%) it gathers (the Gathering Maw's wide gather: 2 tiles every 5 s, a 1.5 s tell, at
//    most 5 absorbs, +10% size each; a singer it reaches is hushed, the choir's rule).
// 2. (75–50%) it splits into 3 parts (`unsung_part`, each a third of the band: 2500 of 30000) and
//    never merges: once the last part falls, it rises again where that part fell, in phase 3.
// 3. (50–25%) it phases (Phased 2 s of every 8, a 1.5 s tell) and digs twice toward the choir,
//    surfacing among the singers and hushing one each time, unless a burrow answer digs it out on
//    the way (D154 Fork 2).
// 4. (25% and below) the Song: its HP can't fall below 1%, and a Silencer walks in from the Halls
//    every 20 s. Damage dealt to it inside the song feeds rest points (song.ts), and when the
//    countdown completes it is laid to rest (`layToRest`; design/maps.md § 5.5).
// As built (T808): enemyAbilities/unsung.ts (the dig, the phasing, the adds, the ending),
// bossSplit.ts/bossMerge.ts (the split with no merge and the rise), bossPhases.ts (the floor).
// T808's numbers where the docs give none (D154's addenda): the parts' share, the phasing cycle,
// the dig's 4 s (2.5 s travel, then the 1.5 s surfacing tell), and the 0.1 tiles/s pace; FIN's
// balance (T821) tunes them. `leak` 3 never applies (a leaking boss drains everything). Sprites:
// T841's; the body is the first form's, and render picks each form's by its phase
// (sprites/enemies/unsung.ts `UNSUNG_FORM_SPRITE`; growth `_g1`–`_g5` by absorbs; `_rest`).
import { defineEnemy } from '../define.ts';

export const unsung = defineEnemy({
  id: 'unsung',
  name: 'The Unsung',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 18000,
  armor: 0,
  speedTilesPerSec: 0.1,
  leak: 3,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: [],
  tells: ['boss', 'hollow'],
  boss: {
    phases: [
      {
        fromPct: 1,
        gather: {
          everySec: 5,
          tellSec: 1.5,
          radiusTiles: 2.4,
          maxAbsorbs: 5,
          growPct: 0.1,
          leakPerAbsorb: 0,
          bountyPerHollowAbsorb: 0,
        },
      },
      // The split: three parts carry the band to 50% between them; no merge (it rises instead).
      { fromPct: 0.75, split: { part: 'unsung_part', count: 3, hpPct: 0.25 / 3 } },
      {
        fromPct: 0.5,
        burrow: { times: 2, durationSec: 4 },
        burrowTo: 'choir',
        phase: { everySec: 8, durationSec: 2, tellSec: 1.5 },
      },
      { fromPct: 0.25, floorPct: 0.01, adds: { enemy: 'silencer', everySec: 20 } },
    ],
    ending: 'layToRest',
    endAtPct: 0,
  },
  sprites: { body: 'enemy.unsung', icon: 'icon.enemy.unsung' },
});
