// The Gathering Maw (design/enemies.md § 6): A3M6's boss, coming up the road behind the sheltering
// Skitterkin. HP 12000, armor 4, speed 0.3, Hollow, void, bounty 0. Phases (D146): (1) it gathers
// eligible units (enemies.md § 5.4) within 2 tiles every 5 s, after a tendril tell, and grows;
// (2, 50%) it splits into 3 parts (`gathering_maw_part`, each 20% of its max HP; boss rules, one
// boss bar sums them); 12 s after the split (or as the last but one part dies) the survivors merge
// into one with their summed HP, enraged (Haste 30%). All three dead before the merge: the boss is
// beaten. `leak` 3 never applies (a leaking boss drains everything).
//
// As built (T708; enemies.md § 6, *How the Gathering Maw runs*): the phase gather runs in
// enemyAbilities/gather.ts (`gatherOf`), the split in bossSplit.ts as phase 2's 1.5 s telegraph
// ends, the merge in bossMerge.ts (a fresh unit of this def in phase 3 where the lead part stood,
// the parts' HP summed). The gather's tell is 1.5 s, not D146's 1 s: every boss ability tells for
// at least BOSS_MIN_TELL_SEC. Its absorb cap and growth are the Maw's; no leak or bounty per
// absorb (a boss's leak drains everything; it pays none). No doc numbers for those: T708's, for
// A3M6 (T722) to tune (D146's addenda). The split-born Maw dies at 0 HP; `driveOff` is only a
// `bossEnd` action's. Sprites: placeholders under their final ids (T740a: growth `_g1`–`_g5`
// by absorbs, `panic` once merged).
import { defineEnemy } from '../define.ts';

export const gathering_maw = defineEnemy({
  id: 'gathering_maw',
  name: 'The Gathering Maw',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 12000,
  armor: 4,
  speedTilesPerSec: 0.3,
  leak: 3,
  bounty: 0,
  spawnIntervalSec: 1.0,
  traits: ['armored'],
  tells: ['armored', 'boss', 'hollow'],
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
      {
        fromPct: 0.5,
        split: {
          part: 'gathering_maw_part',
          count: 3,
          hpPct: 0.2,
          mergeAfterSec: 12,
          mergeHastePct: 0.3,
        },
      },
    ],
    ending: 'driveOff',
    endAtPct: 0,
  },
  sprites: { body: 'enemy.gathering_maw', icon: 'icon.enemy.gathering_maw' },
});
