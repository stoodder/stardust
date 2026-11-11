// The meters' low marks (design/core-loop.md § 6.3 `low_integrity`; T569): when the core's
// integrity, an Escort's refugees still to lose, or a Holdout's losses count as low. One home for the rule, which the
// radio (app/dialogue.ts: QUILL's `low_integrity` bark), the HUD (app/hudEscort.ts: the Escort
// meter's alarm row) and through it the audio (app/audio.ts: the meter alarm) all read. Pure.

/** Integrity at or below this share of the maximum is low (core-loop.md § 6.3). */
export const LOW_INTEGRITY_SHARE = 0.25;

/** Whether the core's `integrity` of `max` is low: above 0 and at most LOW_INTEGRITY_SHARE of it. */
export function integrityLow(integrity: number, max: number): boolean {
  return integrity > 0 && integrity <= max * LOW_INTEGRITY_SHARE;
}

/**
 * Whether an Escort's losses are low on the meter (`low_integrity`, T513): the losses left before
 * defeat (lost reaching `maxLost`, D138) are LOW_INTEGRITY_SHARE of `maxLost` or fewer. Never
 * without a `maxLost` (no limit, no defeat) or before the first loss.
 */
export function escortLow(lost: number, maxLost: number | null): boolean {
  return maxLost !== null && lost > 0 && maxLost - lost <= maxLost * LOW_INTEGRITY_SHARE;
}

/**
 * Whether a Holdout's losses are low on the meter (`low_integrity`; A3M3: Bricks's "Steady. Steady
 * now."; T622): `lost` is at least half the share its `evacuatedFloor` allows to lose, of the run's
 * `total` refugees ((1 − floor) / 2: a quarter at A3M3's 50% floor). A Holdout has no defeat, so
 * the mark is a share of the run, not of a limit. Never before the first loss.
 */
export function holdoutLow(lost: number, total: number, evacuatedFloor: number | null): boolean {
  if (lost <= 0 || total <= 0) return false;
  return lost >= ((1 - (evacuatedFloor ?? 0)) / 2) * total;
}
