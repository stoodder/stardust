// Tower economy (the Salvage Crane, design/towers.md § 7; Reel It In, § 6.2; T408): the credits a
// tower's `economy` and a link's `killCredits` pay, deterministic and allocation-free. The rules as
// built:
// - **The Crane's radius** is its tier's `radiusTiles` under the stacking formula for range, so
//   high ground, a Lookout's range aura, and its tune-up's +5% range all widen it (`craneRadius`).
// - **Per wave:** as each wave resolves (systems/cleanup.ts, right after its clear bonus), every
//   live economy tower pays its `perWave`, × (1 + its `supportStat` income tune-up), rounded half
//   up, in slot order (`TowerIncome`, kind `wave`).
// - **Interest (Haggler's Stall):** then the bank earns interest once: the best live Stall's
//   `interestPct` of the credits banked after the wave's other payouts, rounded down and capped at
//   its `interestCap` (Stalls don't stack: one bank, one rate; `TowerIncome`, kind `interest`).
// - **Per kill:** a tower kill (a tower's own hit or shell; never an ability's or an ally's) pays
//   each live economy tower whose radius holds the killing tower its `perKill` (two Cranes by one
//   Thumper pay twice), and the killer its links' `linkKillCredits` (Reel It In: +3 per Harpoon
//   kill, × Linked Up, rounded down). **A spared runner (fleeing, youngling) pays no kill credits,**
//   so greed never prices a runner. Each pays at the dying unit (`TowerIncome`, kind `kill`), after
//   its bounty and EnemyDied.
// - **Salvage:** the drone's tile clears faster and pays more with a Crane whose radius holds it:
//   the best Crane's `salvageSpeedMul − 1` and `salvagePct` join the run's `clearSpeed` and
//   `salvage` percent sums (the stacking formula; systems/wreckage.ts).
// - A Crane is economy, not an aura: its income is income (`earn`, counted in `creditsEarned`).
import type { CompiledTowerEconomy } from '../content/compiled.ts';
import { stackedStat } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import type { Modifier } from './config.ts';
import { earn } from './economy.ts';
import type { Enemy, Tower } from './entities.ts';
import type { DamageSource } from './events.ts';
import { isSpared } from './fireControl.ts';
import { emit, type SimState } from './state.ts';

/** A live tower's economy now (its tier's or spec's), or null. */
function economyOf(t: Tower): CompiledTowerEconomy | null {
  return t.alive && t.tierDef !== null ? t.tierDef.economy : null;
}

/** An economy tower's radius in tiles: its tier's, under the range bonuses (see the header). */
export function craneRadius(t: Tower, econ: CompiledTowerEconomy): number {
  if (t.flatRange === 0 && t.pctRange === 0) return econ.radiusTiles;
  return stackedStat('range', econ.radiusTiles, t.flatRange, t.pctRange);
}

/** Σ pct of the `supportStat` income tune-up on `tower` (the Crane's rank 1). */
export function incomePct(modifiers: readonly Modifier<IdSpace>[], tower: string): number {
  let pct = 0;
  for (let i = 0; i < modifiers.length; i++) {
    const m = modifiers[i]!; // i < length
    if (m.kind === 'supportStat' && m.stat === 'income' && (m.tower === '*' || m.tower === tower)) {
      pct += m.pct;
    }
  }
  return pct;
}

/** One wave's payout from a tower's `perWave` under its income tune-up (rounded half up). */
export function perWaveIncome(perWave: number, pct: number): number {
  return pct === 0 ? perWave : Math.round(perWave * (1 + pct));
}

/** Haggler's Stall's interest on `bank` credits: `floor(bank × pct)`, at most `cap`, never < 0. */
export function interestOn(bank: number, pct: number, cap: number): number {
  const v = Math.floor(bank * pct + 1e-9);
  if (v <= 0) return 0;
  return v < cap ? v : cap;
}

/**
 * A wave resolved (systems/cleanup.ts, after its clear bonus): every economy tower's per-wave
 * income, then the bank's interest from the best Haggler's Stall.
 */
export function payWaveIncome(
  state: SimState,
  modifiers: readonly Modifier<IdSpace>[],
  wave: number,
): void {
  const pool = state.towers;
  let bestPct = 0;
  let bestCap = 0;
  let bestUid = 0;
  let bestX = 0;
  let bestY = 0;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    const econ = economyOf(t);
    if (econ === null || t.def === null) continue;
    if (econ.perWave > 0) {
      const credits = perWaveIncome(econ.perWave, incomePct(modifiers, t.def.id));
      income(state, t.uid, t.x, t.y, credits, 'wave', wave);
    }
    if (econ.interestPct > bestPct) {
      bestPct = econ.interestPct;
      bestCap = econ.interestCap;
      bestUid = t.uid;
      bestX = t.x;
      bestY = t.y;
    }
  }
  if (bestPct > 0) {
    income(
      state,
      bestUid,
      bestX,
      bestY,
      interestOn(state.credits, bestPct, bestCap),
      'interest',
      wave,
    );
  }
}

/**
 * A kill (combat/damage.ts, after its bounty): the killer's link kill credits and every Crane's
 * kill bonus whose radius holds the killer (see the header).
 */
export function payKillIncome(state: SimState, enemy: Enemy, source: DamageSource): void {
  if (source.kind !== 'tower' || isSpared(enemy.tags)) return;
  const pool = state.towers;
  let killer: Tower | null = null;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (t.alive && t.uid === source.uid) {
      killer = t;
      break;
    }
  }
  if (killer === null) return; // sold while its shell flew
  if (killer.linkKillCredits > 0) {
    income(state, killer.uid, enemy.x, enemy.y, killer.linkKillCredits, 'kill', enemy.wave);
  }
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    const econ = economyOf(t);
    if (econ === null || econ.perKill <= 0) continue;
    const r = craneRadius(t, econ);
    const dx = killer.x - t.x;
    const dy = killer.y - t.y;
    if (dx * dx + dy * dy <= r * r)
      income(state, t.uid, enemy.x, enemy.y, econ.perKill, 'kill', enemy.wave);
  }
}

/**
 * The best Crane salvage bonus over wreckage tile centre (x, y): the speed and salvage percents
 * it adds (each the best over the live Cranes whose radius holds the tile), written into `out`.
 */
export function craneSalvageAt(
  state: SimState,
  x: number,
  y: number,
  out: { speedPct: number; salvagePct: number },
): void {
  out.speedPct = 0;
  out.salvagePct = 0;
  const pool = state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    const econ = economyOf(t);
    if (econ === null || (econ.salvageSpeedMul === 1 && econ.salvagePct === 0)) continue;
    const r = craneRadius(t, econ);
    const dx = x - t.x;
    const dy = y - t.y;
    if (dx * dx + dy * dy > r * r) continue;
    if (econ.salvageSpeedMul - 1 > out.speedPct) out.speedPct = econ.salvageSpeedMul - 1;
    if (econ.salvagePct > out.salvagePct) out.salvagePct = econ.salvagePct;
  }
}

/** Credits `credits` of tower income (if any) and emits TowerIncome. */
function income(
  state: SimState,
  towerUid: number,
  x: number,
  y: number,
  credits: number,
  kind: 'wave' | 'kill' | 'interest',
  wave: number,
): void {
  if (credits <= 0) return;
  earn(state, credits);
  emit(state, { type: 'TowerIncome', towerUid, kind, credits, wave, x, y });
}
