// Endless mode's generator rules (design/maps.md § 8): the data src/sim/endless.ts reads to build a
// seed's waves on END_M01 after its authored warm-up (waves.ts). The generator's rules, in short:
// - **Threat budget** (maps.md § 6.2): wave w's budget is `firstWaveThreat × growth^(w − 1)`,
//   strictly rising forever; the generator fills each wave to its budget from the roster. Growth
//   is 1.07, under the campaign's 8–12% a wave: the blocks carry the variety, and at 1.08 a
//   seed's 60 waves cost ~1.7 s of the 2 s CPU budget (assertion 13; tools/endlessRun.test.ts).
// - **Counter blocks:** waves come in blocks of `blockWaves`. Each generated block names its
//   required counters (`countersPerBlock`, at most 3, rules.ts MAX_REQUIRED_COUNTERS), drawn from
//   the categories open by then (`categoryFrom`) so that every category has a unit that demands it
//   and nothing outside the block; at most one category the run hasn't seen yet joins per block,
//   and no block repeats the one before. The block's units carry only its categories (or none);
//   other units are spice, at most the soft share of a wave (rules.ts SOFT_THREAT_MAX_SHARE), and
//   the spice of a block's last two waves tells the next block's new category.
// - **Bosses:** wave `firstBossWave`, then every `bossEvery`-th wave, sends a boss from `bosses`
//   (the first listed first; after it, a seeded rotation through them all, never one twice in a
//   row) down the road, and its block requires what the boss and its brood demand. The wave after
//   a boss waits for the fight to end.
// This file is data only: content never imports the sim (architecture.md § 4), so the type lives
// here and the generator imports it.
import type { CounterId, EnemyId } from '../../types.ts';

/** The rules of an Endless map's generator (one map today: END_M01). */
export interface EndlessDef {
  /** The map whose waves it generates; its authored waves are the warm-up every seed opens with. */
  readonly map: 'end_m01';
  /** The generated run's length: escalation "forever" in practice (threat ×2,000 by the last). */
  readonly waves: number;
  /** Waves per counter block; the warm-up is block 0 and must be one block long. */
  readonly blockWaves: number;
  /** Wave 1's threat budget (maps.md § 6.2's units); the warm-up is authored to match. */
  readonly firstWaveThreat: number;
  /** Each wave's budget over the wave before's (maps.md § 6.2: 8–12% a wave). */
  readonly growth: number;
  /** Required counters per block, by block index (0: the warm-up); the last entry repeats. */
  readonly countersPerBlock: readonly number[];
  /** The block from which each category may be drawn (a boss's own categories come with it). */
  readonly categoryFrom: Readonly<Record<CounterId, number>>;
  /**
   * The units a block draws from: every enemy met in the campaign's waves except the neutral, the
   * bosses and their parts, units only a death or a boss makes, and the Skitterkin (D156;
   * sim/endless.test.ts holds the list to the campaign's).
   */
  readonly roster: readonly EnemyId[];
  /** The first boss wave (it closes a block). */
  readonly firstBossWave: number;
  /** A boss every this many waves after it. */
  readonly bossEvery: number;
  /** The bosses, the first one the run's first; each must walk this map (no story beat). */
  readonly bosses: readonly EnemyId[];
  /** A group whose count would pass this takes a heavier unit when one fits (spawn time, CPU). */
  readonly maxGroupCount: number;
  /** A group spawns within this many seconds (its interval shortened to fit, never lengthened). */
  readonly spawnWindowSec: number;
  /** The shortest interval a group is shortened to. */
  readonly minIntervalSec: number;
  /** Seconds between the starts of a wave's groups. */
  readonly groupStaggerSec: number;
}

export const ENDLESS: EndlessDef = {
  map: 'end_m01',
  waves: 100,
  blockWaves: 5,
  firstWaveThreat: 600,
  growth: 1.07,
  // The warm-up, then one counter, two, and three from the fourth block (W16–W20) on. A boss's
  // own categories can raise its block's count ("Shareholder Value" brings jam to its armor).
  countersPerBlock: [0, 1, 2, 3],
  // Act I's answers first (armor, air, splash), then shields; detection, burrowing, and jamming
  // once the third block (W11–W15) is past.
  categoryFrom: { armor: 1, air: 1, splash: 1, shield: 2, detection: 3, burrowed: 3, jam: 3 },
  // No Skitterkin (D156): the post-game is QUILL's sim deck, and after "Remember them." it never
  // asks the player to shoot the people they walked home. Ves'thara's lumenglass constructs stay:
  // they were remote-piloted glass, not people.
  roster: [
    // Aelari (lumenglass constructs)
    'glimmer',
    'weft_warden',
    'lightwing',
    'veilwalker',
    'blinkstrider',
    'cantor',
    // The Hollow
    'mote',
    'fracture',
    'riftmoth',
    'maw',
    'undertow',
    'silencer',
    // Everglow Security
    'compliance',
    'expediter',
    'associate',
    'liability',
    'gunship',
    'blackbudget',
    'auditor',
  ],
  firstBossWave: 20,
  bossEvery: 10,
  // The first boss at W20, once a build has had three blocks to grow (at W10 the reference build,
  // five towers in, lost to the run's first boss on every seed tried). The Gathering Maw first,
  // then it and "Shareholder Value" (Sterling's platform, its plates landing on the map's crash
  // site) in turn. Not Bramble (Chitterbloom) or Ves'thara (the Glass Witch, and the Sunderglass
  // Penitent she piloted): people the player walked home are never targets here (D156). Not the
  // Unsung either (it is laid to rest only by the Leaving Song).
  bosses: ['gathering_maw', 'shareholder_value'],
  maxGroupCount: 24,
  spawnWindowSec: 16,
  minIntervalSec: 0.25,
  groupStaggerSec: 2,
};
