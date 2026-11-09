// Rule data: the numbers and tables the design docs label **rules**, as typed data the sim and the
// content validator read (architecture.md § 3). The design docs keep the intent and the reasons;
// this file is the home of the values. Every table names the section it encodes. Values marked
// "chosen" are not in the docs (or the docs give a range); the comment says why.
//
// Pure data plus two tiny pure helpers. No imports beyond types, so any module may read it.
import type {
  Act,
  Body,
  CounterId,
  DamageType,
  StatusId,
  TellId,
  TowerStat,
  Trait,
  WaveTag,
} from './types.ts';

// ── Combat math (design/enemies.md § 2) ──────────────────────────────────────────────────────

/** Damage vs body (enemies.md § 2.2): applied to raw damage before shields and armor. */
export const BODY_MULT: Readonly<Record<DamageType, Readonly<Record<Body, number>>>> = {
  kinetic: { organic: 1, crystalline: 1, mechanical: 1, void: 1 },
  explosive: { organic: 1, crystalline: 1, mechanical: 1, void: 1 },
  energy: { organic: 1, crystalline: 1, mechanical: 1, void: 0.75 },
  psionic: { organic: 1, crystalline: 0.75, mechanical: 0.35, void: 1.5 },
};

/** Damage vs shields (enemies.md § 2.1). */
export const SHIELD_MULT: Readonly<Record<DamageType, number>> = {
  kinetic: 0.5,
  explosive: 0.5,
  energy: 2,
  psionic: 1,
};
/** Kinetic and Explosive shield multiplier against a Soaked target (enemies.md § 2.1, § 2.4). */
export const SOAKED_SHIELD_MULT = 0.8;
/** The damage types whose shield multiplier Soaked raises to SOAKED_SHIELD_MULT. */
export const SOAKED_SHIELD_TYPES: readonly DamageType[] = ['kinetic', 'explosive'];
/** Soaked: +25% Energy damage taken (enemies.md § 2.4). */
export const SOAKED_ENERGY_BONUS = 0.25;
/** Damage types that ignore armor (enemies.md § 2.1: Psionic). DoT ignores armor too (§ 2.3). */
export const ARMOR_IGNORING_TYPES: readonly DamageType[] = ['psionic'];
/** The armor floor (enemies.md § 2.3): at least this fraction of a hit gets through armor. */
export const ARMOR_FLOOR = 0.2;
/** DoT ticks every 0.25 s and bypasses armor, not shields (enemies.md § 2.3). */
export const DOT_TICK_SEC = 0.25;
/** A beam's default tick length (enemies.md § 2.3); armor applies per tick at `armor × tickSec`. */
export const DEFAULT_BEAM_TICK_SEC = 0.25;

// ── Status effects (design/enemies.md § 2.4) ─────────────────────────────────────────────────

/** Chilled: only the strongest source applies, capped. */
export const CHILL_CAP = 0.7;
/** Swarmling chills stack with each other up to this, then count as one source. */
export const SWARMLING_CHILL_CAP = 0.3;
/** Enemy haste aura: highest only, capped. */
export const HASTE_CAP = 0.5;
/** Unnerved: −20% speed (interrupt only on bosses). */
export const UNNERVED_SLOW = 0.2;
/** Lulled: ability cooldowns run ×1.5 longer (bosses ×1.25). */
export const LULLED_COOLDOWN_MULT = 1.5;
export const LULLED_COOLDOWN_MULT_BOSS = 1.25;
/** Bosses take Chilled at half strength. */
export const BOSS_CHILL_MULT = 0.5;
/** Pin and Stasis on a boss become Chilled 50% for the same duration (not halved again). */
export const BOSS_CONVERTED_CHILL = 0.5;
/** After a Pin ends, the target is immune to Pin for 1 s. */
export const PIN_IMMUNITY_SEC = 1;
/** After Stasis ends, immunity lasts this multiple of the Stasis just applied. */
export const STASIS_IMMUNITY_MULT = 2;
/** Each Corroded stack lasts 5 s and refreshes on a new hit. */
export const CORRODED_STACK_SEC = 5;
/** Marked: highest only. Every other status in M1 content is a fraction in (0, 1]. */
export const MAX_STATUS_PCT: Readonly<Partial<Record<StatusId, number>>> = {
  chilled: CHILL_CAP,
  marked: 1,
};

/**
 * The speed rule (enemies.md § 2.4): `speed = base × (1 − chill) × (1 + haste)`, with each term
 * capped. Pinned and Stasis set speed to 0 separately.
 */
export function speedMult(chill: number, haste: number): number {
  return (1 - Math.min(chill, CHILL_CAP)) * (1 + Math.min(haste, HASTE_CAP));
}

// ── Stacking (design/towers.md § 4) ──────────────────────────────────────────────────────────
// stat_final = (stat_tier + Σ flat) × (1 + min(Σ pct, cap)). Same-kind auras take the strongest
// value, not the sum, and a support tower is never covered by its own aura.

/** Caps on a tower's total percent bonus per stat (rule). */
export const STAT_PCT_CAPS: Readonly<Record<TowerStat, number>> = {
  damage: 1.5,
  rate: 1,
  range: 0.6,
};

/** The final stat under the stacking formula. */
export function stackedStat(stat: TowerStat, base: number, flat: number, pct: number): number {
  return (base + flat) * (1 + Math.min(pct, STAT_PCT_CAPS[stat]));
}

/**
 * Aura kinds (towers.md § 4): same-kind auras don't stack. The Hum Choir's damage aura, and the
 * Lookout Shack's adjacency bonus (range, or fire rate with Overclock Rig; one kind, so two
 * Lookouts give only the stronger bonus). Chosen: kinds are named after their tower.
 */
export const AURA_KINDS = ['choir', 'lookout'] as const;
export type AuraKind = (typeof AURA_KINDS)[number];

/** Tile bonuses (towers.md § 4, maps.md § 3). Support towers on a power node: +20% aura strength. */
export const HIGH_GROUND_RANGE_PCT = 0.25;
export const POWER_NODE_RATE_PCT = 0.2;
export const POWER_NODE_AURA_PCT = 0.2;

// ── Jamming (design/enemies.md § 4) ──────────────────────────────────────────────────────────

/** The only jammers (an exhaustive list: adding one needs a decisions.md entry). */
export const JAMMER_ENEMIES: readonly string[] = ['auditor', 'silencer', 'shareholder_value'];
export const JAM_MAX_SEC = 4;
export const JAM_MIN_TELL_SEC = 1.5;
export const JAM_IMMUNITY_SEC = 6;
/** In par play, at most this share of the player's towers is jammed at once (harness check). */
export const JAM_MAX_TOWER_SHARE = 0.25;

// ── Traits, tells, and counters (design/enemies.md § 3) ───────────────────────────────────────

/** Counter categories (enemies.md § 3.1). */
export const COUNTER_CATEGORIES: readonly CounterId[] = [
  'armor',
  'shield',
  'detection',
  'air',
  'burrowed',
  'splash',
  'jam',
];

/**
 * The trait → counter-category map (enemies.md § 3.1 is the human-readable table). `null` is
 * intel-only: shown in the threat intel, never a required counter, never soft.
 */
export const TRAIT_COUNTER: Readonly<Record<Trait, CounterId | null>> = {
  armored: 'armor',
  shielded: 'shield',
  shield_aura: 'shield',
  cloaked: 'detection',
  flying: 'air',
  burrowing: 'burrowed',
  splitting: 'splash',
  huddle: 'splash',
  jammer: 'jam',
  fast: null,
  blink: null,
  phasing: null,
  skittish: null,
  haste_aura: null,
  healer_aura: null,
  gathering: null,
};

/** Each trait's art tell (enemies.md § 3 "Art tell id"): every ability has a tell (rule). */
export const TRAIT_TELL: Readonly<Record<Trait, TellId>> = {
  armored: 'armored',
  shielded: 'shielded',
  cloaked: 'stealth',
  fast: 'fast',
  flying: 'flying',
  burrowing: 'burrower',
  splitting: 'splitter',
  healer_aura: 'healer',
  shield_aura: 'shield_aura',
  haste_aura: 'haste_aura',
  blink: 'blink',
  phasing: 'phasing',
  gathering: 'consumer',
  jammer: 'disabler',
  skittish: 'skittish',
  huddle: 'huddle',
};

/** What answers a counter category: tower ids and Technician/companion ability ids. */
export interface CounterAnswers {
  readonly towers: readonly string[];
  readonly abilities: readonly string[];
}

/**
 * Which towers and abilities answer each category (enemies.md § 3.1, Answers column). M1 model:
 * a plain id list that names every tower answering the category at *any* tier or spec, so a
 * no-counter build that leaves them all out can't hold an answer. That is stricter than the
 * design for conditional answers (Rivet answers armor only from T3, Skyhook only as Seeker
 * Swarm, Mindspike never against Everglow); T208 replaces this with `{ tower, minTier?, spec? }`
 * entries. Links (Acid Rain, Sticky Flak, Conductive) arrive with T202. Ids are plain strings:
 * most of these towers don't exist yet.
 */
export const COUNTER_ANSWERS: Readonly<Record<CounterId, CounterAnswers>> = {
  armor: {
    // Rivet T3+ and Railspike; Skyhook [Seeker Swarm]; Thumper (light armor, Acts I–II, and
    // [Bunker Buster]); Mindspike only against Hollow and Aelari armor.
    towers: ['harpoon', 'rivet', 'skyhook', 'prism', 'gloop', 'thumper', 'mindspike'],
    abilities: [],
  },
  shield: {
    // Energy (Zapcoil, Prism) and Soaked (Sprinkler T3+, Cloudburst).
    towers: ['zapcoil', 'prism', 'sprinkler'],
    abilities: [],
  },
  detection: { towers: ['lookout', 'lantern'], abilities: ['scanner_sweep'] },
  air: {
    // Everything that hits air (Sprinkler only as Cloudburst, Scuttle Den only as Brave Hearts),
    // plus the Pins that ground flyers (Harpoon spec B, Sproing).
    towers: [
      'skyhook',
      'rivet',
      'zapcoil',
      'harpoon',
      'prism',
      'mindspike',
      'lantern',
      'sproing',
      'sprinkler',
      'burrow',
    ],
    abilities: [],
  },
  burrowed: {
    // Scuttle Den, Stasis Bloom, Lantern [Truthlight], Mindspike [Dread].
    towers: ['burrow', 'bloom', 'lantern', 'mindspike'],
    abilities: ['underfoot'],
  },
  splash: {
    // towers.md § 2.1's Splash row (Rivet as [Rivet Storm], Mindspike as [Echo Spike]), plus
    // Skyhook against air clusters. Sproing [Big Bonk] waits for T208's docs fix.
    towers: ['thumper', 'gloop', 'zapcoil', 'rivet', 'mindspike', 'skyhook'],
    abilities: [],
  },
  jam: {
    // Hum Choir and the tell interrupters: Stasis Bloom, Flash Freeze (Sprinkler spec A), Dread
    // (Mindspike spec), and Ves'thara's Stillness.
    towers: ['choir', 'bloom', 'sprinkler', 'mindspike'],
    abilities: ['system_reboot', 'stillness'],
  },
};

// ── Threat budget (design/maps.md § 6.2, a planning tool the validator uses) ─────────────────
// threat = (hp + 1.5 × shield) × (1 + armor / 10) × sqrt(speed) × traitFactor

export const THREAT_SHIELD_WEIGHT = 1.5;
export const THREAT_ARMOR_DIVISOR = 10;
/**
 * Per-trait factors. Chosen: an enemy with several factor traits multiplies them (the doc gives
 * one factor per trait and is silent on combinations); the three auras share one "any aura" 1.5.
 * Splitting adds its children's threat, which arrives with splitter data (M3).
 */
export const THREAT_TRAIT_FACTOR: Readonly<Partial<Record<Trait, number>>> = {
  cloaked: 1.3,
  flying: 1.1,
  burrowing: 1.2,
  blink: 1.2,
  phasing: 1.2,
  jammer: 1.5,
  gathering: 1.5,
};
export const THREAT_AURA_TRAITS: readonly Trait[] = ['healer_aura', 'shield_aura', 'haste_aura'];
export const THREAT_AURA_FACTOR = 1.5;
/** Soft enemies make up at most this share of any wave's threat (maps.md § 6.2). */
export const SOFT_THREAT_MAX_SHARE = 0.15;

// ── Map design limits (design/maps.md) ───────────────────────────────────────────────────────

/** Campaign maps fit on one screen: `cols + rows ≤ 36` (maps.md § 1). */
export const MAX_CAMPAIGN_GRID_SPAN = 36;
/** At most 3 required counters per map (maps.md § 6.3). */
export const MAX_REQUIRED_COUNTERS = 3;
/** At most one new required-counter category per map, over all earlier maps (maps.md § 6.3). */
export const MAX_NEW_COUNTER_CATEGORIES = 1;
/** At most two new threats per map (maps.md § 6.3). */
export const MAX_NEW_THREATS = 2;
/** Salvage per wreckage tile, in credits (maps.md § 3). */
export const SALVAGE_MIN = 30;
export const SALVAGE_MAX = 80;
/** Every campaign map from A1M4 (the 4th) has at least 2 alt builds (maps.md § 6.1). */
export const ALT_BUILDS_FROM_CAMPAIGN_INDEX = 3;
export const MIN_ALT_BUILDS = 2;
/** Each alt build shares at most this many tower types with the par loadout (maps.md § 6.1). */
export const ALT_BUILD_MAX_SHARED_TOWERS = 2;
/** The loadout limit (CLAUDE.md hard rule). */
export const MAX_LOADOUT = 4;
/** In-map tiers 1–3; tier 4 is a specialization (towers.md § 3.1). */
export const MAX_TIER_BEFORE_SPEC = 3;

// ── Waves, economy, and run flow (design/core-loop.md) ───────────────────────────────────────

/** The build-phase countdown when a wave doesn't set one (core-loop.md § 2.1). */
export const DEFAULT_COUNTDOWN_SEC: Readonly<Record<Act, number>> = {
  1: 25,
  2: 20,
  3: 15,
  // Chosen: the doc's default (20 s) for everything that isn't Act I or III.
  finale: 20,
  challenge: 20,
  endless: 20,
};
/** Core integrity when a map doesn't set it (core-loop.md § 2.9). */
export const DEFAULT_CORE_INTEGRITY = 20;
/**
 * A leaking boss drains all remaining integrity (core-loop.md § 2.9), whatever its `leak`. The
 * validator refuses `boss` enemies until bosses land (M3), so the sim needn't implement it yet.
 */
export const BOSS_LEAK_DRAINS_ALL = true;
/** Selling refunds 70% of everything spent on the tower (core-loop.md § 2.3; shop can raise it). */
export const SELL_REFUND_PCT = 0.7;
/**
 * Misclick grace (core-loop.md § 2.3, rule): a tower sold before it first fires and within 10 s
 * of sim time of being built (whichever ends first; paused time doesn't count) refunds 100%.
 */
export const MISCLICK_GRACE_SEC = 10;
/** Wave tags whose units leak for 0 (core-loop.md § 2.9). */
export const LEAK_FREE_TAGS: readonly WaveTag[] = ['fleeing', 'youngling'];
/** The spare-runners filter never picks these as a primary target (D006). */
export const SPARE_TAGS: readonly WaveTag[] = ['fleeing', 'youngling'];
/** Allies never target these (D005). */
export const ALLY_NEVER_TARGET_TAGS: readonly WaveTag[] = ['quiet_wave', 'youngling', 'fleeing'];
/** Wave tags only Skitterkin units may carry (enemies.md § 5.4: fleeing Skitterkin). */
export const SKITTERKIN_ONLY_TAGS: readonly WaveTag[] = ['fleeing', 'youngling', 'quiet_wave'];

/** Retry checkpoints: every 5 waves, from Act II (architecture.md § Checkpoints). */
export const CHECKPOINT_EVERY_WAVES = 5;
export const CHECKPOINTS_FROM_ACT: Act = 2;
