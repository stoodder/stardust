// The credits economy's pure rules (design/core-loop.md § 2.3–2.4), shared by the sim and the
// HUD: what a sell returns, what a kill pays, and what calling the next wave now would pay. The
// numbers are rule data in content/rules.ts.
import {
  FLEEING_BOUNTY,
  MISCLICK_GRACE_SEC,
  SELL_REFUND_PCT,
  YOUNGLING_BOUNTY,
  earlyCallBonus,
} from '../content/rules.ts';
import type { WaveTag } from '../content/types.ts';
import { secToTicks } from '../shared/time.ts';
import type { DeepReadonly } from '../shared/types.ts';
import type { Tower } from './entities.ts';
import type { SimState, WaveSchedule } from './state.ts';

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
 * everything invested; otherwise 70% of it, rounded down. Pass `state.tick`: a command applied
 * now runs at that tick.
 */
export function sellValue(
  tower: Pick<Tower, 'invested' | 'builtTick' | 'firstFiredTick'>,
  tick: number,
): SellValue {
  const full = tower.firstFiredTick < 0 && tick - tower.builtTick < MISCLICK_GRACE_TICKS;
  if (full) return { value: tower.invested, full };
  // TODO(T204): the shop's sell-refund upgrade (80%) arrives as a modifier.
  return { value: Math.floor(tower.invested * SELL_REFUND_PCT + REFUND_EPS), full };
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
  state: { readonly wave: number; readonly schedule: DeepReadonly<WaveSchedule> },
  map: { readonly waves: readonly unknown[] },
): number {
  const s = state.schedule;
  if (s.phase !== 'countdown' || state.wave >= map.waves.length) return 0;
  return earlyCallBonus(state.wave + 1, s.countdownTicks, s.countdownTotalTicks);
}

/** Credits income from play (bounties, bonuses, grants): adds to the bank and the stat. */
export function earn(state: SimState, amount: number): void {
  if (amount <= 0) return;
  state.credits += amount;
  state.stats.creditsEarned += amount;
}
