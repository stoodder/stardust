// Rule data: the numbers and tables the design docs label **rules**, as typed data the sim and the
// content validator read (architecture.md § 3). The design docs keep the intent and the reasons;
// this file is the home of the values. Every table names the section it encodes. Values marked
// "chosen" are not in the docs (or the docs give a range); the comment says why.
//
// Pure data plus a few tiny pure formulas. No imports beyond types, so any module may read it.
import type {
  Act,
  Body,
  CounterId,
  DamageType,
  StatusId,
  TellId,
  ThreatIntelId,
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
/**
 * A line attack (the Harpoon's Skewer; sim/attacks/line.ts) hits every enemy whose centre is
 * within this distance of the line: a band under a tile wide, so a packed group on the road reads
 * as skewered and the units beside it don't (T408, chosen).
 */
export const LINE_HALF_WIDTH_TILES = 0.4;
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

// ── Synergy links (design/towers.md § 6) ─────────────────────────────────────────────────────

/**
 * Adjacency (rule): tiles that share an edge or a corner (the 8-neighborhood). A link is active
 * while both partners stand adjacent; each link type counts once per tower.
 */
export const LINK_ADJACENCY_TILES = 1;
/** A tower's active links are a 32-bit mask (`Tower.linkMask`), so the registry holds ≤ 31. */
export const MAX_LINKS = 31;
/**
 * Status ids in bit order, for a conditional link bonus's status mask (`vsStatus`): bit i is
 * STATUS_BITS[i]. Chosen: the order of `EffectDef` in types.ts.
 */
export const STATUS_BITS: readonly StatusId[] = [
  'chilled',
  'soaked',
  'corroded',
  'marked',
  'pinned',
  'stasis',
  'unnerved',
];
/** The bit mask of a status list (0 for none). */
export function statusMask(statuses: readonly StatusId[]): number {
  let mask = 0;
  for (const s of statuses) mask |= 1 << STATUS_BITS.indexOf(s);
  return mask;
}

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
 * intel-only: shown in the threat intel, never a required counter, never soft. `youngling` is a
 * WaveTag, not a trait (enemies.md § 5.1), so it has no category.
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
  // Mote clusters (enemies.md § 3.1's splash row; D101).
  clustered: 'splash',
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
  // A cluster reads as Hollow: the tell is the faction's look, not a new glyph (D101).
  clustered: 'hollow',
};

/** Each threat-intel entry's tell (its briefing glyph): the traits', plus `boss` (D101; T330). */
export const THREAT_INTEL_TELL: Readonly<Record<ThreatIntelId, TellId>> = {
  ...TRAIT_TELL,
  boss: 'boss',
};

/**
 * One tower answer to a counter category (enemies.md § 3.1). A build carries it when one of its
 * towers reaches `minTier` (default 1; a spec is tier 4, so it counts) and, with `spec`, takes
 * that tier-4 spec, on a map that meets every condition given. A loadout tower the build never
 * builds still counts at tier 1. Reaching it once is enough: a Rivet that passes T3 on its way to
 * Rivet Storm answers armor, though the spec drops the pierce.
 */
export interface TowerAnswer {
  readonly tower: string;
  readonly minTier?: number;
  readonly spec?: 'a' | 'b';
  /** The spec's display name (towers.md § 7), checked against the tower data once it has specs. */
  readonly specName?: string;
  /** Only on maps of these acts (Thumper vs light armor: Acts I–II). */
  readonly acts?: readonly Act[];
  /** Only when one of the map's enemies in this category has one of these bodies (Psionic). */
  readonly vsBodies?: readonly Body[];
  /**
   * Only when one of the map's enemies in this category flies (Skyhook vs air clusters, Seeker
   * Swarm vs armored flyers).
   */
  readonly vsAir?: true;
}

/**
 * What answers a counter category: tower entries, and the commander abilities (either slot)
 * that do. An ability counts only when the build casts it, so a no-counter build may keep a
 * map's fixed companion in slot 2 as long as it never uses it (A3M5's no-jam build).
 */
export interface CounterAnswers {
  readonly towers: readonly TowerAnswer[];
  readonly abilities: readonly string[];
}

/**
 * Which towers, specs, and abilities answer each category: enemies.md § 3.1's Answers column,
 * with the tiers and specs from towers.md § 2.1 and § 7. Ids are plain strings: most of these
 * towers don't exist yet.
 *
 * - **Links** (Acid Rain, Sticky Flak, Conductive) are covered by their partners: each pairs a
 *   tower with Gloop or Zapcoil, which answer on their own, so a build that leaves those out
 *   can't form the link.
 * - **Abilities** answer only through what § 3.1 lists them for: revealing (Scanner Sweep),
 *   hitting underground (Underfoot), and clearing or interrupting jams (System Reboot,
 *   Stillness). A cooldown hit never answers a category by its damage: Orbital Strike (one
 *   200-damage strike per 45 s), Suppressing Fire (D035), and Underfoot's 30 Kinetic answer
 *   neither armor nor splash. The harness's no-counter runs still cast them, so a counter the
 *   strike could replace fails assertion #5.
 */
export const COUNTER_ANSWERS: Readonly<Record<CounterId, CounterAnswers>> = {
  armor: {
    towers: [
      { tower: 'harpoon' },
      // T3 armor pierce 3; Railspike (spec b) ignores all armor, and is past T3 anyway.
      { tower: 'rivet', minTier: 3 },
      // Seeker Swarm's armor pierce reaches only flyers (the Skyhook hits air only; T407b).
      { tower: 'skyhook', spec: 'b', specName: 'Seeker Swarm', vsAir: true },
      // A beam: armor subtracts per second, not per tick (enemies.md § 2.3).
      { tower: 'prism' },
      // Corroded sources.
      { tower: 'gloop' },
      { tower: 'thumper', spec: 'b', specName: 'Bunker Buster' },
      // Light armor in Acts I–II (A1M2's guaranteed answer, campaign.md § 4.8).
      { tower: 'thumper', acts: [1, 2] },
      // Psionic ignores armor, but Everglow machines take it at ×0.35 (enemies.md § 2.2).
      { tower: 'mindspike', vsBodies: ['void', 'crystalline'] },
    ],
    abilities: [],
  },
  shield: {
    // Every Energy source and every Soaked source (Sprinkler from T3; Cloudburst is past T3).
    towers: [{ tower: 'zapcoil' }, { tower: 'prism' }, { tower: 'sprinkler', minTier: 3 }],
    abilities: [],
  },
  detection: {
    towers: [{ tower: 'lookout' }, { tower: 'lantern' }],
    abilities: ['scanner_sweep'],
  },
  air: {
    // Every tower that hits air (Sprinkler only as Cloudburst, Scuttle Den only as Brave
    // Hearts), plus the Pins that ground flyers (Harpoon [Tether] and Sproing hit air anyway).
    towers: [
      { tower: 'skyhook' },
      { tower: 'rivet' },
      { tower: 'zapcoil' },
      { tower: 'harpoon' },
      { tower: 'prism' },
      { tower: 'mindspike' },
      { tower: 'lantern' },
      { tower: 'sproing' },
      { tower: 'sprinkler', spec: 'b', specName: 'Cloudburst' },
      { tower: 'burrow', spec: 'b', specName: 'Brave Hearts' },
    ],
    abilities: [],
  },
  burrowed: {
    // Scuttle Den and Underfoot hit underground; Stasis Bloom, Truthlight, and Dread (Unnerved)
    // block the dig.
    towers: [
      { tower: 'burrow' },
      { tower: 'bloom' },
      { tower: 'lantern', spec: 'b', specName: 'Truthlight' },
      { tower: 'mindspike', spec: 'b', specName: 'Dread' },
    ],
    abilities: ['underfoot'],
  },
  splash: {
    // towers.md § 2.1's Splash row, plus Skyhook against air clusters. Skewer's line pierces
    // every unit along it (T408).
    towers: [
      { tower: 'thumper' },
      { tower: 'gloop' },
      { tower: 'zapcoil' },
      { tower: 'rivet', spec: 'a', specName: 'Rivet Storm' },
      { tower: 'mindspike', spec: 'a', specName: 'Echo Spike' },
      { tower: 'sproing', spec: 'b', specName: 'Big Bonk' },
      { tower: 'harpoon', spec: 'a', specName: 'Skewer' },
      { tower: 'skyhook', vsAir: true },
    ],
    abilities: [],
  },
  jam: {
    // Hum Choir and the tell interrupters: Stasis Bloom, Flash Freeze, Dread, and Stillness.
    towers: [
      { tower: 'choir' },
      { tower: 'bloom' },
      { tower: 'sprinkler', spec: 'a', specName: 'Flash Freeze' },
      { tower: 'mindspike', spec: 'b', specName: 'Dread' },
    ],
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
/**
 * A map's `noCounterLoseByWave` override may push the no-counter lose-by wave as late as this
 * many waves before the end, never the final wave (default ⌊⅔ × waves⌋, balance/rules.ts;
 * maps.md § 6.1).
 */
export const NO_COUNTER_LOSE_BY_MIN_WAVES_LEFT = 1;
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
 * A leaking boss drains all remaining integrity (core-loop.md § 2.9), whatever its `leak`, and
 * Emergency Bulkhead can't absorb it (movement).
 */
export const BOSS_LEAK_DRAINS_ALL = true;
/** A boss wave's clear bonus is tripled (design/enemies.md § 6; T304c). */
export const BOSS_CLEAR_BONUS_MULT = 3;
/** A boss phase change gives at most this much invulnerability (enemies.md § 6). */
export const BOSS_MAX_INVULNERABLE_SEC = 2;
/** Every boss ability's tell lasts at least this long (enemies.md § 6). */
export const BOSS_MIN_TELL_SEC = 1.5;
/**
 * `driveOff` / `retreat`: the boss leaves by the nearest map edge within this long (§ 6.1), at its
 * base speed or faster if that's what it takes; a driven-off boss's brood leaves the same way.
 */
export const BOSS_LEAVE_MAX_SEC = 4;
/**
 * A boss phase change's invulnerability and telegraph (enemies.md § 6: at most 2 s). Damage that
 * crosses a phase threshold stops at it, so no burst skips a phase.
 */
export const BOSS_PHASE_INVULNERABLE_SEC = 1.5;
/** The tell before each boss ability (a sneeze, a burrow): the minimum, BOSS_MIN_TELL_SEC. */
export const BOSS_ABILITY_TELL_SEC = BOSS_MIN_TELL_SEC;
/**
 * A boss phase's burrows (Chitterbloom's phase 2): the first starts this long into the phase
 * (after its invulnerability), and each later one this long after the last surfacing. The tell
 * is the last BOSS_ABILITY_TELL_SEC of it. Underground, a boss keeps its pace.
 */
export const BOSS_BURROW_GAP_SEC = 4;
/**
 * Units born on the route (a splitter's children, a boss's sneezed or surfacing young) trail
 * their parent by this much each: the first at the parent's distance, the next this far behind.
 */
export const BROOD_SPREAD_TILES = 0.25;
/** The salvage drone clears one wreckage tile in this much sim time (maps.md § 3; T304b). */
export const WRECKAGE_CLEAR_SEC = 6;
/** A new tower deploys for this long before it can fire or pulse (core-loop.md § 2.5). */
export const TOWER_DEPLOY_SEC = 0.5;
/** Selling refunds 70% of everything spent on the tower (core-loop.md § 2.3; shop can raise it). */
export const SELL_REFUND_PCT = 0.7;
/** Resale Value never raises the refund past everything invested. */
export const MAX_SELL_REFUND_PCT = 1;
/**
 * Misclick grace (core-loop.md § 2.3, rule): a tower sold before it first fires and within 10 s
 * of sim time of being built (whichever ends first; paused time doesn't count) refunds 100%.
 */
export const MISCLICK_GRACE_SEC = 10;
/** The wave clear bonus is `base + perWave × waveNumber` (core-loop.md § 2.3): wave 1 pays 24. */
export const WAVE_CLEAR_BONUS_BASE = 20;
export const WAVE_CLEAR_BONUS_PER_WAVE = 4;
/** Credits for resolving wave `wave` (1-based), paid even if some of it leaked. */
export function waveClearBonus(wave: number): number {
  return WAVE_CLEAR_BONUS_BASE + WAVE_CLEAR_BONUS_PER_WAVE * wave;
}
/**
 * What resolving wave `wave` pays: its clear bonus, BOSS_CLEAR_BONUS_MULT times over for a boss
 * wave (one with a boss in its groups; enemies.md § 6). The early-call bonus reads the plain
 * waveClearBonus, never the tripled one: the triple rewards the fight, not calling it early.
 */
export function waveClearBonusFor(wave: number, boss: boolean): number {
  const bonus = waveClearBonus(wave);
  return boss ? bonus * BOSS_CLEAR_BONUS_MULT : bonus;
}
/**
 * Early wave call (core-loop.md § 2.4): the bonus is this share of the called wave's clear bonus,
 * scaled by the fraction of the countdown skipped; every commander ability's remaining cooldown
 * drops by the cooldown share of the time skipped.
 */
export const EARLY_CALL_BONUS_SHARE = 0.5;
export const EARLY_CALL_COOLDOWN_SHARE = 0.25;
/**
 * `round(0.5 × clearBonus × secondsRemaining / countdown)`, in ticks (the ratio is the same).
 * Halves round up. 0 when nothing is skipped.
 */
export function earlyCallBonus(
  wave: number,
  ticksLeft: number,
  countdownTicks: number,
  /** Early Bird's `economy.earlyCallBonus` percentage, applied before the rounding. */
  pct = 0,
): number {
  if (ticksLeft <= 0 || countdownTicks <= 0) return 0;
  const left = ticksLeft < countdownTicks ? ticksLeft : countdownTicks;
  const exact = (EARLY_CALL_BONUS_SHARE * waveClearBonus(wave) * left) / countdownTicks;
  return Math.round(exact * (1 + pct));
}
/** Kill bounties for tagged units (enemies.md § 5.1 youngling modifier, § 5.4 fleeing). */
export const YOUNGLING_BOUNTY = 0;
/** The youngling wave modifier's speed multiplier (enemies.md § 5.1: speed ×0.5). */
export const YOUNGLING_SPEED_MUL = 0.5;
/**
 * The "not firing" threshold (core-loop.md § 6.3, the `not_firing` bark): Skitterkin in range of
 * a tower for this long with no tower firing at any of them.
 */
export const NOT_FIRING_SEC = 10;

/**
 * The bank nudge (core-loop.md § 6.3, the `bank_nudge` bark; app/dialogue.ts plays it): credits
 * banked as a build phase opens (W2 on) that fire it (D059).
 */
export const BANK_NUDGE_CREDITS = 250;
/**
 * Build phases in a row with no purchase (no build, upgrade, or specialization) after which the
 * bank nudge fires with the loadout's cheapest tower affordable, whatever the bank (T229, D096:
 * A1M2's never-spend player meets W7's countdown with ~140 credits, a Thumper's worth).
 */
export const BANK_NUDGE_IDLE_PHASES = 2;
export const FLEEING_BOUNTY = 1;
/** Wave tags whose units leak for 0 (core-loop.md § 2.9). */
export const LEAK_FREE_TAGS: readonly WaveTag[] = ['fleeing', 'youngling'];
/** The spare-runners filter never picks these as a primary target (D006). */
export const SPARE_TAGS: readonly WaveTag[] = ['fleeing', 'youngling'];
/** Allies never target these (D005). */
export const ALLY_NEVER_TARGET_TAGS: readonly WaveTag[] = ['quiet_wave', 'youngling', 'fleeing'];
/** Wave tags only Skitterkin units may carry (enemies.md § 5.4: fleeing Skitterkin). */
export const SKITTERKIN_ONLY_TAGS: readonly WaveTag[] = ['fleeing', 'youngling', 'quiet_wave'];

// ── Act II enemy rules (design/enemies.md § 3, § 5.4; D101). Run by sim/enemyAbilities/ ───────

/**
 * Skittish (enemies.md § 3; the `fleeing` modifier, D101): when a Skitterkin within this many
 * tiles dies or is hushed, the unit gains Haste SKITTISH_HASTE_PCT for SKITTISH_HASTE_SEC (under
 * HASTE_CAP). Same layer or not (T402).
 */
export const SKITTISH_RADIUS_TILES = 2;
export const SKITTISH_HASTE_PCT = 0.4;
export const SKITTISH_HASTE_SEC = 1.5;
/**
 * The hush rule (enemies.md § 5.4; D101): a non-boss Hollow unit within HUSH_CONTACT_TILES along
 * the route of a hushable unit on its own layer stops for the HUSH_TELL_SEC tell, then hushes it,
 * heals to full, and turns Heavy (base speed × HUSH_SPEED_MUL). One hush each (T402).
 */
export const HUSH_CONTACT_TILES = 0.4;
export const HUSH_TELL_SEC = 0.5;
export const HUSH_SPEED_MUL = 1.15;
/** Fleeing groups spawn this long before their Hollow group on the same route (enemies.md § 5.4). */
export const FLEEING_LEAD_MIN_SEC = 2;
export const FLEEING_LEAD_MAX_SEC = 4;

/** Retry checkpoints: every 5 waves, from Act II (architecture.md § Checkpoints). */
export const CHECKPOINT_EVERY_WAVES = 5;
export const CHECKPOINTS_FROM_ACT: Extract<Act, number> = 2;

// ── Act II, part two (D137; T500a seams, each run by the task named) ──────────────────────────

/**
 * Splitting chains (enemies.md § 5.4: Fracture → 2 Shards → 2 Motes each): a splitter's child may
 * split again, at most this many levels deep, and never back into an enemy above it (validate).
 */
export const SPLIT_MAX_DEPTH = 2;
/** `standDown` and the `pivot` (enemies.md § 6.1): each unit fades out over 1 s, then goes (T506). */
export const STAND_DOWN_FADE_SEC = 1;
/**
 * Escort (maps.md § 5.2; T305c): refugees walk in groups of 6, spaced 0.6 tiles apart, at
 * 0.7 tiles/s. A group's `count` may differ; spacing and pace don't.
 */
export const REFUGEE_GROUP_SIZE = 6;
export const REFUGEE_SPACING_TILES = 0.6;
export const REFUGEE_SPEED_TILES_PER_SEC = 0.7;
/**
 * Sundown (maps.md § 5.1; T505): at darkness d (0–1), a tower outside every light source has its
 * range × (1 − DARK_RANGE_PENALTY × d); −15% at full dark.
 */
export const DARK_RANGE_PENALTY = 0.15;
/**
 * A lamp's light radius in tiles when its map gives none (MapDef.lights; T505): the lamp's tile
 * and the eight round it (a tile centre is lit at a distance ≤ the radius), smaller than a beaming
 * Prism Spire's 2.0, so the Spire is the light worth building for.
 */
export const LAMP_RADIUS_TILES = 1.5;
