// The results counter's count-up (art-direction §9: counters tick up and don't jump). Pure, so the
// curve is unit-tested; Results.tsx drives it from requestAnimationFrame.

/** Shortest and longest count-up, in ms. Small counts finish quickly; big ones never drag. */
export const COUNT_UP_MIN_MS = 600;
export const COUNT_UP_MAX_MS = 1800;
/** Extra ms per unit counted, between the bounds. */
const MS_PER_UNIT = 30;

/** How long counting up to `target` takes, in ms. */
export function countUpDuration(target: number): number {
  return Math.min(COUNT_UP_MAX_MS, Math.max(COUNT_UP_MIN_MS, target * MS_PER_UNIT));
}

/**
 * The value shown `elapsedMs` into counting up to `target` over `durationMs`: an integer that never
 * decreases, starts at 0, and lands exactly on `target`. Ease-out, so the last units tick slowly.
 */
export function countUpValue(target: number, elapsedMs: number, durationMs: number): number {
  if (target <= 0) return 0;
  if (durationMs <= 0 || elapsedMs >= durationMs) return target;
  if (elapsedMs <= 0) return 0;
  const t = elapsedMs / durationMs;
  const eased = 1 - (1 - t) * (1 - t) * (1 - t);
  return Math.min(target, Math.floor(eased * target));
}
