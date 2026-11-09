// A tower tier's stat line for the HUD (the tower panel's "8 dmg · 2/s · range 3" and the
// upgrade's "+3 dmg"): what the sim actually runs, read from the compiled tier under the tower's
// bonuses (static modifiers, links, auras, tiles: the Tower's `flat*`/`pct*` fields, through the
// same stacking functions the towers system uses, sim/bonuses.ts). Pure, so the HUD, tests, and
// tools all show the same numbers. Without bonuses it's the tier as authored.
import type { CompiledTowerDef } from '../content/compiled.ts';
import { MAX_TIER_BEFORE_SPEC, STATUS_BITS } from '../content/rules.ts';
import type { AttackKind, DamageType, IdSpace, StatusId } from '../content/types.ts';
import { TICK_HZ } from '../shared/time.ts';
import type { DeepReadonly } from '../shared/types.ts';
import {
  NO_BONUSES,
  bonusDamage,
  bonusDamageVs,
  bonusPeriodTicks,
  bonusRangeTiles,
  type TowerBonuses,
} from './bonuses.ts';
import type { Modifier } from './config.ts';
import { costFor } from './economy.ts';

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
  /**
   * A link's conditional damage bonus (Sitting Ducks: vs Chilled): the statuses it applies
   * against, and the damage per hit against them. `[]` and `damage` when there's none.
   */
  readonly vsStatuses: readonly StatusId[];
  readonly vsStatusDamage: number;
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
  vsStatuses: [],
  vsStatusDamage: 0,
};

const round2 = (x: number): number => Math.round(x * 100) / 100;

function tierStats(
  def: DeepReadonly<Pick<CompiledTowerDef, 'tiers'>>,
  tier: number,
  b: TowerBonuses,
): TierStats {
  const attack = def.tiers[tier - 1]!.attack; // callers keep 1 ≤ tier ≤ 3
  if (attack === null) return NO_ATTACK;
  const damage = round2(bonusDamage(attack, b));
  const vs = b.vsStatusMask === 0 ? [] : STATUS_BITS.filter((_, i) => (b.vsStatusMask & (1 << i)) !== 0);
  return {
    kind: attack.kind,
    damageType: attack.type,
    damage,
    ratePerSec: round2(TICK_HZ / bonusPeriodTicks(attack, b)),
    rangeTiles: round2(bonusRangeTiles(attack, b)),
    minRangeTiles: attack.minRangeTiles,
    splashTiles: attack.kind === 'lobbed' ? attack.splashTiles : 0,
    armorPierce: attack.armorPierce,
    vsStatuses: vs,
    vsStatusDamage: vs.length === 0 ? damage : round2(bonusDamageVs(attack, b)),
  };
}

/**
 * The stat line of `def` at in-map tier `tier` (1–3) under `bonuses` (pass the Tower itself for
 * a built tower; none: the tier as authored), with the next tier's delta under the same bonuses
 * and its cost after the run's `towerCost` modifiers (pass `sim.config.modifiers`). Throws a
 * RangeError for any other tier (specializations arrive with T202b).
 */
export function towerStats(
  def: DeepReadonly<Pick<CompiledTowerDef, 'id' | 'tiers'>>,
  tier: number,
  bonuses: TowerBonuses = NO_BONUSES,
  modifiers: DeepReadonly<Modifier<IdSpace>[]> = [],
): TowerStatLine {
  if (!Number.isInteger(tier) || tier < 1 || tier > MAX_TIER_BEFORE_SPEC) {
    throw new RangeError(`towerStats: tier must be 1–${MAX_TIER_BEFORE_SPEC} (got ${tier})`);
  }
  const now = tierStats(def, tier, bonuses);
  if (tier === MAX_TIER_BEFORE_SPEC) return { ...now, tier, next: null };
  const after = tierStats(def, tier + 1, bonuses);
  return {
    ...now,
    tier,
    next: {
      tier: tier + 1,
      cost: costFor(modifiers, def.id, def.tiers[tier]!.cost), // tier < 3: index tier is tier + 1's
      damage: round2(after.damage - now.damage),
      ratePerSec: round2(after.ratePerSec - now.ratePerSec),
      rangeTiles: round2(after.rangeTiles - now.rangeTiles),
      splashTiles: round2(after.splashTiles - now.splashTiles),
      armorPierce: after.armorPierce - now.armorPierce,
    },
  };
}
