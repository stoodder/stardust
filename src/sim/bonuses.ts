// A tower's stats under its bonuses: the stacking formula (design/towers.md § 4) applied to a
// tier's attack. `stat = (base + Σ flat) × (1 + min(Σ pct, cap))`, percentages added, never
// multiplied, capped per stat (content/rules.ts STAT_PCT_CAPS). The bonuses themselves are
// summed onto each tower by the links system (systems/links.ts); the towers system, the
// projectiles system, and the HUD's towerStats() all read stats through these functions, so they
// always agree. Pure and allocation-free.
import type { CompiledAttack } from '../content/compiled.ts';
import { stackedStat } from '../content/rules.ts';
import { TICK_HZ, ratePerSecToPeriodTicks } from '../shared/time.ts';
import type { Enemy, Tower } from './entities.ts';

/** A tower's summed bonuses (the Tower fields of the same names). */
export type TowerBonuses = Readonly<
  Pick<
    Tower,
    | 'flatDamage'
    | 'flatRate'
    | 'flatRange'
    | 'pctDamage'
    | 'pctRate'
    | 'pctRange'
    | 'vsStatusMask'
    | 'vsStatusPct'
    | 'darkRangePct'
    | 'bonusDetectTiles'
    | 'detectPct'
  >
>;

/** No bonuses: a tier's stats as authored. */
export const NO_BONUSES: TowerBonuses = Object.freeze({
  flatDamage: 0,
  flatRate: 0,
  flatRange: 0,
  pctDamage: 0,
  pctRate: 0,
  pctRange: 0,
  vsStatusMask: 0,
  vsStatusPct: 0,
  darkRangePct: 0,
  bonusDetectTiles: 0,
  detectPct: 0,
});

/** The attack fields the stat functions read (`detectCapTiles` absent: no cap). */
type AttackStats = Pick<CompiledAttack, 'damage' | 'cooldownTicks' | 'rangeTiles'> &
  Partial<Pick<CompiledAttack, 'detectCapTiles'>>;

/** Damage per hit. */
export function bonusDamage(attack: AttackStats, b: TowerBonuses): number {
  return stackedStat('damage', attack.damage, b.flatDamage, b.pctDamage);
}

/**
 * Damage per hit against an enemy with any status in `b.vsStatusMask`: the conditional percent
 * joins the damage percent before the cap. Equal to bonusDamage() when there's none.
 */
export function bonusDamageVs(attack: AttackStats, b: TowerBonuses): number {
  return stackedStat('damage', attack.damage, b.flatDamage, b.pctDamage + b.vsStatusPct);
}

/**
 * A detection radius in tiles: the tier's `radiusTiles` plus its links' `bonusDetectTiles`
 * (Overwatch, Skywatch), × (1 + its radius tune-up, `pct`). The one formula: systems/detection.ts
 * `detectRadiusTiles` (what is revealed) and the reach cap below (what a detector's beam reaches).
 */
export function stackedDetectTiles(radiusTiles: number, bonusTiles: number, pct: number): number {
  return (radiusTiles + bonusTiles) * (1 + pct);
}

/**
 * Reach in tiles (a pulse's radius). Minimum range never changes. Sundown's darkness (T505;
 * sim/darkness.ts) multiplies it after the stacking formula, outside the cap: × (1 − darkRangePct).
 * A tower that detects (`detectCapTiles` > 0: the Seer's Lantern) then reaches no further than it
 * sees: the result is clamped to its stacked detection radius (D137, D139), so a range bonus its
 * detection doesn't share (high ground, a `towerStat` range grant) can't stretch the beam past
 * the reveal. The towers system, the HUD (towerStats) and the range ring all read this.
 */
export function bonusRangeTiles(attack: AttackStats, b: TowerBonuses): number {
  const stacked = stackedStat('range', attack.rangeTiles, b.flatRange, b.pctRange);
  const r = b.darkRangePct === 0 ? stacked : stacked * (1 - b.darkRangePct);
  const cap = attack.detectCapTiles ?? 0;
  if (cap === 0) return r;
  const sees = stackedDetectTiles(cap, b.bonusDetectTiles, b.detectPct);
  return r > sees ? sees : r;
}

/**
 * Ticks between attacks. The rate as simulated (60 / the tier's whole-tick period) takes the
 * bonuses, then rounds back to whole ticks like compiled content (shared/time.ts), so +10% on a
 * 30-tick Rivet fires every 27 ticks. With no rate bonus it's the tier's period exactly.
 */
export function bonusPeriodTicks(attack: AttackStats, b: TowerBonuses): number {
  if (b.flatRate === 0 && b.pctRate === 0) return attack.cooldownTicks;
  const rate = stackedStat('rate', TICK_HZ / attack.cooldownTicks, b.flatRate, b.pctRate);
  // A rate bonus can't stop a tower: a non-positive rate keeps the tier's period.
  return rate > 0 ? ratePerSecToPeriodTicks(rate) : attack.cooldownTicks;
}

/**
 * Whether `e` has any status in `mask` (bit i = content/rules.ts STATUS_BITS[i]). Stasis runs
 * since T407a, Pinned since T408, and Unnerved since T507.
 */
export function hasStatusIn(e: Enemy, mask: number): boolean {
  if (mask === 0) return false;
  // Bits: chilled 1, soaked 2, corroded 4, marked 8, pinned 16, stasis 32, unnerved 64
  // (STATUS_BITS order).
  if ((mask & 1) !== 0 && e.chillPct > 0) return true;
  if ((mask & 2) !== 0 && e.soakedTicks > 0) return true;
  if ((mask & 4) !== 0 && e.corrodedStacks > 0) return true;
  if ((mask & 8) !== 0 && e.markTicks > 0) return true;
  if ((mask & 16) !== 0 && e.pinnedTicks > 0) return true;
  if ((mask & 32) !== 0 && e.stasisTicks > 0) return true;
  if ((mask & 64) !== 0 && e.unnervedTicks > 0) return true;
  return false;
}
