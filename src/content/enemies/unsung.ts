// The Unsung (design/enemies.md § 6; design's *Unmaking*): the finale's boss, rising from the Deep
// Halls in Phase 2 (story/campaign/finale.md). HP 30000 (plus the Deep Bore's bonus: +5% per
// tenth filled, MapDef.timers), Hollow, void, bounty 0. Its four forms by HP share: (1) it
// gathers; (2) it splits; (3) it phases and burrows toward the choir, surfacing among the singers
// (D154 Fork 2); (4) the Song: it can't fall below 1% HP, Silencer adds walk in, damage dealt to
// it inside the song feeds rest points, and at the countdown's p = 1 it is laid to rest
// (`layToRest`; design/maps.md § 5.5).
//
// A T800a stub under its final id: its numbers are the docs' where they give one and placeholders
// otherwise (the gather copies the Gathering Maw's; the burrow's and the adds' periods are
// T808's). createSim refuses it whole until T808 (FEATURE_GATES `enemy.boss.layToRest`, and the
// phase kinds `enemy.boss.floor`, `enemy.boss.burrowTo`, `enemy.boss.adds`). Not here yet, T808's:
// phase 2's split (its parts, `unsung_part`, and "no merge") and phase 3's phasing (EnemyDef.phase
// is a unit's, not a phase's). Sprites: placeholders under their final ids (T841).
import { defineEnemy } from '../define.ts';

export const unsung = defineEnemy({
  id: 'unsung',
  name: 'The Unsung',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 30000,
  armor: 0,
  speedTilesPerSec: 0.2,
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
          radiusTiles: 2,
          maxAbsorbs: 5,
          growPct: 0.1,
          leakPerAbsorb: 0,
          bountyPerHollowAbsorb: 0,
        },
      },
      // Phase 2 splits (T808: its parts and the split's shape without a merge).
      { fromPct: 0.75 },
      { fromPct: 0.5, burrow: { times: 2, durationSec: 3 }, burrowTo: 'choir' },
      { fromPct: 0.25, floorPct: 0.01, adds: { enemy: 'silencer', everySec: 20 } },
    ],
    ending: 'layToRest',
    endAtPct: 0,
  },
  sprites: { body: 'enemy.unsung', icon: 'icon.enemy.unsung' },
});
