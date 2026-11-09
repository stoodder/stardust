// A tower tier's stat line for the HUD (the tower panel's "8 dmg · 2/s · range 3" and the
// upgrade's "+3 dmg"): what the sim actually runs, read from the compiled tier. Pure, so the HUD,
// tests, and tools all show the same numbers. Modifiers (towers.md §4) arrive with T204; until
// then a tier's stats are its compiled ones.
import type { CompiledTowerDef } from '../content/compiled.ts';
import { MAX_TIER_BEFORE_SPEC } from '../content/rules.ts';
import type { AttackKind, DamageType } from '../content/types.ts';
import { TICK_HZ } from '../shared/time.ts';
import type { DeepReadonly } from '../shared/types.ts';

/** One tier's combat numbers. All 0 (and `kind` null) for a tier with no attack. */
export interface TierStats {
  readonly kind: AttackKind | null;
  readonly damageType: DamageType | null;
  /** Damage per hit (per pulse for a pulse tower, per shell for a lobbed one). */
  readonly damage: number;
  /**
   * Attacks per second as simulated: 60 / the whole-tick cooldown, rounded to 2 decimals (a
   * 0.7/s authored rate runs every 86 ticks, 0.7 to 2 decimals).
   */
  readonly ratePerSec: number;
  /** Reach in tiles (a pulse's radius). */
  readonly rangeTiles: number;
  /** 0 when the tower has no minimum range. */
  readonly minRangeTiles: number;
  /** A lobbed shell's splash radius in tiles; 0 for every other kind. */
  readonly splashTiles: number;
  readonly armorPierce: number;
}

/** What upgrading to the next tier changes: each stat's difference (next − current). */
export interface TierStatDelta {
  /** The next tier (2 or 3). */
  readonly tier: number;
  /** Its upgrade cost. */
  readonly cost: number;
  readonly damage: number;
  readonly ratePerSec: number;
  readonly rangeTiles: number;
  readonly splashTiles: number;
  readonly armorPierce: number;
}

export interface TowerStatLine extends TierStats {
  readonly tier: number;
  /** The next in-map tier's changes; null at the last tier before specialization. */
  readonly next: TierStatDelta | null;
}

const NO_ATTACK: TierStats = {
  kind: null,
  damageType: null,
  damage: 0,
  ratePerSec: 0,
  rangeTiles: 0,
  minRangeTiles: 0,
  splashTiles: 0,
  armorPierce: 0,
};

const round2 = (x: number): number => Math.round(x * 100) / 100;

function tierStats(def: DeepReadonly<Pick<CompiledTowerDef, 'tiers'>>, tier: number): TierStats {
  const attack = def.tiers[tier - 1]!.attack; // callers keep 1 ≤ tier ≤ 3
  if (attack === null) return NO_ATTACK;
  return {
    kind: attack.kind,
    damageType: attack.type,
    damage: attack.damage,
    ratePerSec: round2(TICK_HZ / attack.cooldownTicks),
    rangeTiles: attack.rangeTiles,
    minRangeTiles: attack.minRangeTiles,
    splashTiles: attack.kind === 'lobbed' ? attack.splashTiles : 0,
    armorPierce: attack.armorPierce,
  };
}

/**
 * The stat line of `def` at in-map tier `tier` (1–3), with the next tier's delta. Throws a
 * RangeError for any other tier (specializations arrive with T202).
 */
export function towerStats(
  def: DeepReadonly<Pick<CompiledTowerDef, 'tiers'>>,
  tier: number,
): TowerStatLine {
  if (!Number.isInteger(tier) || tier < 1 || tier > MAX_TIER_BEFORE_SPEC) {
    throw new RangeError(`towerStats: tier must be 1–${MAX_TIER_BEFORE_SPEC} (got ${tier})`);
  }
  const now = tierStats(def, tier);
  if (tier === MAX_TIER_BEFORE_SPEC) return { ...now, tier, next: null };
  const after = tierStats(def, tier + 1);
  return {
    ...now,
    tier,
    next: {
      tier: tier + 1,
      cost: def.tiers[tier]!.cost, // tier < 3, so index tier is tier + 1's
      damage: round2(after.damage - now.damage),
      ratePerSec: round2(after.ratePerSec - now.ratePerSec),
      rangeTiles: round2(after.rangeTiles - now.rangeTiles),
      splashTiles: round2(after.splashTiles - now.splashTiles),
      armorPierce: after.armorPierce - now.armorPierce,
    },
  };
}
