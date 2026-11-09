// The balance harness's rule numbers (design/maps.md § 6.1 and § 6.4; how each is checked:
// conventions.md § Balance sims). This file is their home in code; the design docs keep the intent.
import type { Act } from '../content/types.ts';

/**
 * The par band's floor per act, for Defend and Protect maps (integrity %, maps.md § 6.1). The
 * band is `[floor, floor + PAR_BAND_WIDTH]`. Escort, Choir, and finale bands arrive with their
 * objectives (T305).
 */
export const PAR_BAND_FLOOR_PCT: Readonly<Partial<Record<Act, number>>> = { 1: 80, 2: 65, 3: 50 };
export const PAR_BAND_WIDTH = 20;

/** Assertion 7: alwaysCallEarly's margin ≤ min(band top, par margin + this). */
export const EARLY_CALL_SLACK_PCT = 10;
/** Assertion 16b: spareFleeing's margin ≥ par margin − this, on the same seed (D006). */
export const SPARE_FLEEING_SLACK_PCT = 5;
/** Assertion 3: a map's median par margin ≤ the previous map's in its chain + this. */
export const MONOTONIC_TOLERANCE_PCT = 5;
/** Assertion 8: the forgiving floor for every alt build. */
export const FORGIVING_FLOOR_PCT = 20;
/**
 * The `gradual` check (D028): no wave of an alt build's run may cost more than this share of
 * max integrity, so no build meets a single-wave wall...
 */
export const MAX_WAVE_LOSS_PCT = 50;
/** ...and a build that loses starts leaking at least this many waves before the one it loses in. */
export const LEAK_LEAD_WAVES = 1;
/** Assertion 5: a no-counter build must lose by this share of the waves (before the final third). */
export const NO_COUNTER_LOSE_BY_SHARE = 2 / 3;

/** Seeds for the "every seed" assertions (1..n); `--seeds` overrides n. */
export const DEFAULT_SEED_COUNT = 5;
/** Seeds for the "seeds 1–3" assertions (capped by `--seeds`). */
export const FEW_SEED_COUNT = 3;

/** Assertion 13: each run's wall-time budget. */
export const RUN_BUDGET_MS = 2000;

/** The par band for a map, or null when its act has none yet. */
export function parBand(
  act: Act,
  override: { readonly minPct: number; readonly maxPct: number } | null,
): { readonly lo: number; readonly hi: number } | null {
  if (override !== null) return { lo: override.minPct, hi: override.maxPct };
  const floor = PAR_BAND_FLOOR_PCT[act];
  return floor === undefined ? null : { lo: floor, hi: floor + PAR_BAND_WIDTH };
}

/** The last wave a no-counter build may still be playing when it loses (assertion 5). */
export function noCounterLoseByWave(waveCount: number): number {
  return Math.floor(waveCount * NO_COUNTER_LOSE_BY_SHARE);
}
