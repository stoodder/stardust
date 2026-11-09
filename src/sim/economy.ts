// The credits economy's pure rules (design/core-loop.md § 2.3–2.4), shared by the sim and the
// HUD: what a build or upgrade costs, what a sell returns, what a kill pays, and what calling
// the next wave now would pay. The numbers are rule data in content/rules.ts. Economy modifiers
// (design/progression.md § 4.3, § 5, § 9) apply here: `towerCost` in costFor(), and the rest
// once, at createSim, through applyRunModifiers() into `state` (`credits`, `integrity`,
// `leakAbsorbLeft`, `economy`), so the HUD's helpers read the same numbers the sim pays.
import type { CompiledMapDef } from '../content/compiled.ts';
import {
  FLEEING_BOUNTY,
  MAX_SELL_REFUND_PCT,
  MISCLICK_GRACE_SEC,
  SELL_REFUND_PCT,
  YOUNGLING_BOUNTY,
  earlyCallBonus,
} from '../content/rules.ts';
import type { IdSpace, WaveTag } from '../content/types.ts';
import { secToTicks } from '../shared/time.ts';
import type { DeepReadonly } from '../shared/types.ts';
import type { EconomyStat, Modifier } from './config.ts';
import type { Tower } from './entities.ts';
import type { RunEconomy, SimState, WaveSchedule } from './state.ts';

/** The misclick grace in ticks: sim time, so paused time never counts. */
export const MISCLICK_GRACE_TICKS = secToTicks(MISCLICK_GRACE_SEC);

/**
 * Float slack for the refund's floor: 0.7 × 180 is 125.99999999999999 in doubles, which must
 * floor to 126.
 */
const REFUND_EPS = 1e-9;

export interface SellValue {
  readonly value: number;
  /** Inside the misclick grace: a full refund. */
  readonly full: boolean;
}

/**
 * What selling `tower` at `tick` returns (core-loop.md § 2.3). Inside the misclick grace (it
 * hasn't fired yet and fewer than 10 s of sim time have passed since it was built) it's
 * everything invested; otherwise `refundPct` of it (70%, or Resale Value's
 * `state.economy.sellRefundPct`), rounded down. Pass `state.tick`: a command applied now runs at
 * that tick.
 */
export function sellValue(
  tower: Pick<Tower, 'invested' | 'builtTick' | 'firstFiredTick'>,
  tick: number,
  refundPct = SELL_REFUND_PCT,
): SellValue {
  return sellValueInto(tower, tick, refundPct, { value: 0, full: false });
}

/** `sellValue` into `out` (the HUD reads it every frame without allocating). Returns `out`. */
export function sellValueInto(
  tower: Pick<Tower, 'invested' | 'builtTick' | 'firstFiredTick'>,
  tick: number,
  refundPct: number,
  out: { value: number; full: boolean },
): SellValue {
  const full = tower.firstFiredTick < 0 && tick - tower.builtTick < MISCLICK_GRACE_TICKS;
  out.full = full;
  out.value = full ? tower.invested : Math.floor(tower.invested * refundPct + REFUND_EPS);
  return out;
}

/**
 * What building (tier 1), upgrading, or specializing (`spec`) a tower costs after `towerCost`
 * modifiers for it (or `'*'`): `round(base × (1 + Σ pct))`, never below 0. `tiers: 'all'`
 * discounts every purchase (tune-up rank 2); `tiers: 'spec'` only tier 4 (Specialist).
 */
export function costFor(
  modifiers: readonly Modifier<IdSpace>[],
  tower: string,
  base: number,
  spec = false,
): number {
  let pct = 0;
  for (let i = 0; i < modifiers.length; i++) {
    const m = modifiers[i]!; // i < length
    if (m.kind !== 'towerCost' || (m.tower !== '*' && m.tower !== tower)) continue;
    if (m.tiers === 'all' || spec) pct += m.pct;
  }
  if (pct === 0) return base;
  const cost = Math.round(base * (1 + pct));
  return cost > 0 ? cost : 0;
}

/**
 * What killing a unit pays (core-loop.md § 2.3): its bounty, except youngling units (0) and
 * fleeing ones (1). Youngling wins when a unit has both tags.
 */
export function bountyFor(bounty: number, tags: readonly WaveTag[]): number {
  if (tags.includes('youngling')) return YOUNGLING_BOUNTY;
  if (tags.includes('fleeing')) return FLEEING_BOUNTY;
  return bounty;
}

/**
 * What calling the next wave right now would pay (core-loop.md § 2.4): the early-call bonus while
 * a countdown runs, else 0 (starting wave 1 is free, and there's nothing to call while a wave
 * spawns or after the last one). The HUD shows it on the call button.
 */
export function callWaveBonus(
  state: {
    readonly wave: number;
    readonly schedule: DeepReadonly<WaveSchedule>;
    readonly economy: DeepReadonly<RunEconomy>;
  },
  map: { readonly waves: readonly unknown[] },
): number {
  const s = state.schedule;
  if (s.phase !== 'countdown' || state.wave >= map.waves.length) return 0;
  return earlyCallBonus(
    state.wave + 1,
    s.countdownTicks,
    s.countdownTotalTicks,
    state.economy.earlyCallPct,
  );
}

/**
 * Credits a kill: `bountyFor` with the bounty modifiers' percentage. Credits are whole, so the
 * fraction the bonus earns carries over to the next kill (`economy.bountyCarry`): +5% on 3-credit
 * kills pays an extra credit every 7 kills or so, instead of rounding to nothing. Returns the
 * credits paid.
 */
export function payBounty(state: SimState, bounty: number, tags: readonly WaveTag[]): number {
  const base = bountyFor(bounty, tags);
  const econ = state.economy;
  let paid = base;
  if (econ.bountyPct !== 0 && base > 0) {
    const exact = base * (1 + econ.bountyPct) + econ.bountyCarry;
    paid = Math.floor(exact + REFUND_EPS);
    econ.bountyCarry = exact - paid > 0 ? exact - paid : 0;
  }
  earn(state, paid);
  return paid;
}

/** Credits income from play (bounties, bonuses, grants): adds to the bank and the stat. */
export function earn(state: SimState, amount: number): void {
  if (amount <= 0) return;
  state.credits += amount;
  state.stats.creditsEarned += amount;
}

/** One economy stat's modifiers: the lowest `set` (or null), Σ flat, and Σ pct. */
interface EconomyTerms {
  readonly set: number | null;
  readonly flat: number;
  readonly pct: number;
}

function economyTerms(modifiers: readonly Modifier<IdSpace>[], stat: EconomyStat): EconomyTerms {
  let set: number | null = null;
  let flat = 0;
  let pct = 0;
  for (const m of modifiers) {
    if (m.kind !== 'economy' || m.stat !== stat) continue;
    if (m.set !== undefined) set = set === null ? m.set : Math.min(set, m.set);
    flat += m.flat ?? 0;
    pct += m.pct ?? 0;
  }
  return { set, flat, pct };
}

/** `(set ?? base + Σ flat) × (1 + Σ pct)`, rounded to a whole number (the stacking formula). */
function economyValue(base: number, t: EconomyTerms): number {
  return Math.round(((t.set ?? base) + t.flat) * (1 + t.pct));
}

/**
 * Applies the run's economy modifiers to a fresh state (createSim): starting credits (Seed
 * Money, Head Start, Story +50%), core integrity (Reinforced Core, Story's `set: 30`; at least
 * 1), Emergency Bulkhead's leak absorption, and the per-kill, early-call, and sell percentages in
 * `state.economy`. Throws a RangeError for a shape the sim doesn't run (refuse, don't ignore):
 * `set` or `flat` on `bounty` or `earlyCallBonus`, which progression only ever raises by percent.
 * `salvage` and `clearSpeed` are refused by their gates (M3).
 */
export function applyRunModifiers(
  state: SimState,
  map: Pick<CompiledMapDef<IdSpace>, 'startCredits' | 'coreIntegrity'>,
  modifiers: readonly Modifier<IdSpace>[],
): void {
  const credits = economyValue(map.startCredits, economyTerms(modifiers, 'startCredits'));
  state.credits = credits > 0 ? credits : 0;
  const integrity = economyValue(map.coreIntegrity, economyTerms(modifiers, 'coreIntegrity'));
  state.integrity = integrity > 1 ? integrity : 1;
  state.maxIntegrity = state.integrity;
  const errors: string[] = [];
  for (const stat of ['bounty', 'earlyCallBonus'] as const) {
    const t = economyTerms(modifiers, stat);
    if (t.set !== null || t.flat !== 0) errors.push(`economy '${stat}' takes pct only`);
  }
  if (errors.length > 0) throw new RangeError(`invalid SimConfig:\n- ${errors.join('\n- ')}`);
  state.economy.bountyPct = economyTerms(modifiers, 'bounty').pct;
  state.economy.earlyCallPct = economyTerms(modifiers, 'earlyCallBonus').pct;
  let refund = SELL_REFUND_PCT;
  let absorb = 0;
  for (const m of modifiers) {
    if (m.kind === 'sellRefund') refund += m.flat;
    else if (m.kind === 'leakAbsorb') absorb += m.flat;
  }
  state.economy.sellRefundPct = refund < MAX_SELL_REFUND_PCT ? refund : MAX_SELL_REFUND_PCT;
  state.leakAbsorbLeft = absorb;
}
