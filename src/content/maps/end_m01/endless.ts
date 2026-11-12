// Endless mode's generator rules (design/maps.md § 8): the data src/sim/endless.ts reads to build a
// seed's waves on END_M01 after its authored warm-up (waves.ts). The generator's rules, in short:
// - **Threat budget** (maps.md § 6.2): wave w's budget is `firstWaveThreat × growth^(w − 1)`,
//   strictly rising forever; the generator fills each wave to its budget from the roster.
// - **Counter blocks:** waves come in blocks of `blockWaves`. Each generated block names its
//   required counters (`countersPerBlock`, at most 3, rules.ts MAX_REQUIRED_COUNTERS), drawn from
//   the categories open by then (`categoryFrom`) so that every category has a unit that demands it
//   and nothing outside the block; at most one category the run hasn't seen yet joins per block,
//   and no block repeats the one before. The block's units carry only its categories (or none);
//   other units are spice, at most the soft share of a wave (rules.ts SOFT_THREAT_MAX_SHARE), and
//   the spice of a block's last two waves tells the next block's new category.
// - **Bosses:** wave `firstBossWave`, then every `bossEvery`-th wave, sends a boss from `bosses` (the first boss is always the
//   first listed; after it, a seeded rotation through them all), and its block requires what the
//   boss and its brood demand. The wave after a boss waits for the fight to end.
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
   * bosses and their parts, and units only a death or a boss makes (sim/endless.test.ts holds the
   * list to the campaign's).
   */
  readonly roster: readonly EnemyId[];
  /** The first boss wave (it closes a block). */
  readonly firstBossWave: number;
  /** A boss every this many waves after it. */
  readonly bossEvery: number;
  /** The bosses, the first one the run's first; each must walk any map (no markers, no story). */
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
  growth: 1.08,
  // The warm-up, then one counter, two, and three from the fourth block (W16–W20) on. A boss's
  // own categories can raise its block's count (Chitterbloom's first block is armor and splash).
  countersPerBlock: [0, 1, 2, 3],
  // Act I's answers first (armor, air, splash), then shields; detection, burrowing, and jamming
  // once the third block (W11–W15) is past.
  categoryFrom: { armor: 1, air: 1, splash: 1, shield: 2, detection: 3, burrowed: 3, jam: 3 },
  roster: [
    // Skitterkin
    'nibbler',
    'zoomer',
    'chonk',
    'hauler',
    'puffwing',
    'bunchling',
    'digger',
    'elder',
    // Aelari
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
  // Chitterbloom first (the colony's oldest pest, back at Dome Row), then the Glass Witch and the
  // Gathering Maw with it in a seeded rotation. Not "Shareholder Value" (its jettison needs the
  // crash-site markers A3M5 has), the Sunderglass Penitent (it pivots: its faction stops after
  // it), or the Unsung (it is laid to rest only by the Leaving Song).
  bosses: ['chitterbloom', 'glass_witch', 'gathering_maw'],
  maxGroupCount: 24,
  spawnWindowSec: 16,
  minIntervalSec: 0.25,
  groupStaggerSec: 2,
};
