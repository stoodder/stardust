// Sim time. The sim runs fixed 60 Hz ticks; content is authored in seconds and converted once,
// at content compile time (docs/tech/architecture.md § Determinism).

/** Sim ticks per second of sim time. */
export const TICK_HZ = 60;

/**
 * Rounds a tick count to an integer. Rule: nearest tick, halves round up. The value is first
 * snapped to 6 decimal places so binary float error can't flip a half (1.025 s × 60 is
 * 61.49999999999999 in floating point, but it is 61.5 ticks and rounds to 62).
 */
function roundTicks(exact: number): number {
  const ticks = Math.round(Math.round(exact * 1e6) / 1e6);
  // A positive duration never collapses to zero ticks: something meant to take time takes at
  // least one tick, so spawn intervals and cooldowns can't silently become "every tick".
  return exact > 0 && ticks === 0 ? 1 : ticks;
}

/** Converts a duration in seconds to whole ticks (nearest, halves up; positive → at least 1). */
export function secToTicks(sec: number): number {
  if (!Number.isFinite(sec) || sec < 0) {
    throw new RangeError(`a duration must be a finite number of seconds ≥ 0 (got ${sec})`);
  }
  return roundTicks(sec * TICK_HZ);
}

/** Converts a rate per second to the whole-tick period between events (`60 / rate`, rounded like `secToTicks`). */
export function ratePerSecToPeriodTicks(ratePerSec: number): number {
  if (!Number.isFinite(ratePerSec) || ratePerSec <= 0) {
    throw new RangeError(`a rate must be a finite number per second > 0 (got ${ratePerSec})`);
  }
  return roundTicks(TICK_HZ / ratePerSec);
}

/** Converts a per-second quantity (speed, regeneration) to per-tick. Exact division, no rounding. */
export function perSecToPerTick(perSec: number): number {
  return perSec / TICK_HZ;
}
