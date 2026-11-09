// The credits economy's pure rules (design/core-loop.md § 2.3–2.4), shared by the sim and the
// HUD: what a build or upgrade costs, what a sell returns, what a kill pays, and what calling
// the next wave now would pay. The numbers are rule data in content/rules.ts. Economy modifiers
// (design/progression.md § 4.3, § 5, § 9) apply here: `towerCost` in costFor(), Rapid Deploy and
// Clearance Sale's charges in purchasePriceInto() (what a purchase costs right now; `pay` spends
// it), and the rest once, at createSim, through applyRunModifiers() into `state` (`credits`,
// `integrity`, `leakAbsorbLeft`, `economy`), so the HUD's helpers read the same numbers the sim
// pays.
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

/** What a purchase is: a build (tier 1), an upgrade (tier 2 or 3), or a specialization (tier 4). */
export type PurchaseKind = 'build' | 'upgrade' | 'spec';

/** The state a purchase's price reads (the HUD passes `sim.state`). */
export interface PurchaseState {
  readonly stats: { readonly towersBuilt: number };
  readonly discountCharges: number;
  readonly discountPct: number;
}

/** A purchase's price now (`purchasePrice`): what it costs, and whether it spends a sale charge. */
export interface PurchasePrice {
  cost: number;
  /** Clearance Sale's discount applied, so paying spends one of its charges. */
  discounted: boolean;
}

/**
 * What a purchase costs right now, after everything (core-loop.md § 2.5, § 3.2; progression.md
 * § 5), in this order:
 * 1. `costFor`: the `towerCost` modifiers (tune-ups, Specialist).
 * 2. Rapid Deploy (`firstBuildFree`): the run's first build (tier 1, `stats.towersBuilt` 0) costs
 *    nothing, and spends no sale charge.
 * 3. Clearance Sale: while `discountCharges` remain, a purchase that still costs credits costs
 *    `round(cost × (1 − discountPct))` and spends one charge. It's a sale on the price you'd pay,
 *    so it multiplies after the modifiers rather than adding to them. Builds, upgrades, and
 *    specializations all count as purchases.
 * Writes into `out` and returns it (the HUD reads it every frame without allocating).
 */
export function purchasePriceInto(
  state: PurchaseState,
  modifiers: readonly Modifier<IdSpace>[],
  tower: string,
  base: number,
  kind: PurchaseKind,
  out: PurchasePrice,
): PurchasePrice {
  const cost = costFor(modifiers, tower, base, kind === 'spec');
  out.discounted = false;
  if (kind === 'build' && state.stats.towersBuilt === 0 && firstBuildFree(modifiers)) {
    out.cost = 0;
  } else if (cost > 0 && state.discountCharges > 0) {
    out.cost = Math.round(cost * (1 - state.discountPct));
    out.discounted = true;
  } else {
    out.cost = cost;
  }
  return out;
}

/** `purchasePriceInto`'s cost alone (allocates; the sim and the HUD use the `Into` form). */
export function purchaseCost(
  state: PurchaseState,
  modifiers: readonly Modifier<IdSpace>[],
  tower: string,
  base: number,
  kind: PurchaseKind,
): number {
  return purchasePriceInto(state, modifiers, tower, base, kind, { cost: 0, discounted: false })
    .cost;
}

function firstBuildFree(modifiers: readonly Modifier<IdSpace>[]): boolean {
  for (let i = 0; i < modifiers.length; i++) {
    if (modifiers[i]!.kind === 'firstBuildFree') return true; // i < length
  }
  return false;
}

/**
 * Pays for a purchase at `purchasePriceInto`'s price: returns the credits paid (the caller adds
 * them to the tower's `invested`, so a sell refunds a share of what was actually paid), or −1
 * when the bank can't cover it (nothing changes). Paying counts `creditsSpent` and spends a
 * Clearance Sale charge when the discount applied. `scratch` holds the price (the run's
 * `Scratch.price`, so paying doesn't allocate and no state is shared between sims).
 */
export function pay(
  state: SimState,
  modifiers: readonly Modifier<IdSpace>[],
  tower: string,
  base: number,
  kind: PurchaseKind,
  scratch: PurchasePrice,
): number {
  const p = purchasePriceInto(state, modifiers, tower, base, kind, scratch);
  if (state.credits < p.cost) return -1;
  state.credits -= p.cost;
  state.stats.creditsSpent += p.cost;
  if (p.discounted) {
    state.discountCharges--;
    if (state.discountCharges === 0) state.discountPct = 0;
  }
  return p.cost;
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

/** A map's waves, as nextWaveIsQuiet and callWaveBonus read them (a CompiledMapDef fits). */
export interface WaveTagsView {
  readonly waves: readonly { readonly groups: readonly { readonly tags: readonly WaveTag[] }[] }[];
}

/**
 * Whether the next wave (wave `state.wave + 1`) is a Quiet Wave: any group tagged `quiet_wave`
 * (A1M5). callWave refuses it (`quietWave`, D097), so the HUD hides its Call button and bonus
 * while it's next. False when no wave is left. No allocation (the HUD reads it every frame).
 */
export function nextWaveIsQuiet(state: { readonly wave: number }, map: WaveTagsView): boolean {
  const next = map.waves[state.wave];
  if (next === undefined) return false;
  const groups = next.groups;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i]!.tags.includes('quiet_wave')) return true; // i < length
  }
  return false;
}

/**
 * What calling the next wave right now would pay (core-loop.md § 2.4): the early-call bonus while
 * a countdown runs, else 0 (starting wave 1 is free, there's nothing to call while a wave spawns
 * or after the last one, and a Quiet Wave is never called). The HUD shows it on the call button.
 */
export function callWaveBonus(
  state: {
    readonly wave: number;
    readonly schedule: DeepReadonly<WaveSchedule>;
    readonly economy: DeepReadonly<RunEconomy>;
  },
  map: WaveTagsView,
): number {
  const s = state.schedule;
  if (s.phase !== 'countdown' || state.wave >= map.waves.length) return 0;
  if (nextWaveIsQuiet(state, map)) return 0;
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
