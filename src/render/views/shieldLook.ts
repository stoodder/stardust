// The shield bubble's timing (T430a; art-direction §8 `shielded`: "hexagonal bubble outline that
// ripples when hit and shatters into shards when broken"): pure, unit-tested; EnemyView draws the
// bubble (vfx/markPixels.ts) and ShieldView the ripple ring, the break, and the shards.
// A shielded unit wears its bubble faint (BUBBLE_IDLE_ALPHA) while its shield holds; a hit flashes
// it whole and it steps back down the stepped-alpha ladder over BUBBLE_HIT_MS. A broken shield
// takes the bubble with it (the shards); a regenerated one brings it back.
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';

export const BUBBLE_IDLE_ALPHA = STEPPED_ALPHA[2];
export const BUBBLE_HIT_MS = 240;

/** The bubble's alpha `msSinceHit` after its last hit (negative or long past: idle). */
export function bubbleAlpha(msSinceHit: number): number {
  if (msSinceHit < 0 || msSinceHit >= BUBBLE_HIT_MS) return BUBBLE_IDLE_ALPHA;
  const t = msSinceHit / BUBBLE_HIT_MS;
  if (t < 0.4) return STEPPED_ALPHA[0];
  if (t < 0.7) return STEPPED_ALPHA[1];
  return BUBBLE_IDLE_ALPHA;
}
