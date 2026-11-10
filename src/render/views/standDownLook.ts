// How a unit standing down looks (design/enemies.md § 6.1 `pivot`; T506's minimal view, T530a
// polishes): it holds still where it stopped (the sim holds it) in its `flee` pose where it has one
// (EnemyView's leaving pose) and fades out over the stand-down's 1 s down the stepped-alpha ladder
// (art-direction §7): 80%, 60%, 40%, 20%, a rung per quarter second, then it's gone (the sim
// removes it). enemyPose.ts `cloakAlpha` reads it first. A pivoted boss's Ward kneels in its place
// over the same second, stepping the other way (`wardInAlpha`: 20%, 40%, 60%, 80%, then whole;
// T530a), so the sinking boss and the kneeling Ward cross-fade into one figure instead of
// doubling. Pure, so it's unit-tested.
import { STAND_DOWN_FADE_SEC } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';

const FADE_TICKS = secToTicks(STAND_DOWN_FADE_SEC);
/** The ladder's rungs, first to last. */
export const STAND_DOWN_ALPHAS: readonly number[] = [0.8, 0.6, 0.4, 0.2];

/** The body's alpha with `ticksLeft` of the fade to go (1 … FADE_TICKS). */
export function standDownAlpha(ticksLeft: number): number {
  const done = FADE_TICKS - Math.min(Math.max(ticksLeft, 0), FADE_TICKS);
  const step = Math.floor((done * STAND_DOWN_ALPHAS.length) / FADE_TICKS);
  return STAND_DOWN_ALPHAS[Math.min(step, STAND_DOWN_ALPHAS.length - 1)]!; // clamped above
}

/** The ladder the Ward fades in up, first to last (then whole). */
export const WARD_IN_ALPHAS: readonly number[] = [0.2, 0.4, 0.6, 0.8];

/** The Ward's alpha `ticksSince` it knelt (0 the tick it appeared): up the ladder, then 1. */
export function wardInAlpha(ticksSince: number): number {
  if (ticksSince >= FADE_TICKS) return 1;
  const step = Math.floor((Math.max(ticksSince, 0) * WARD_IN_ALPHAS.length) / FADE_TICKS);
  return WARD_IN_ALPHAS[Math.min(step, WARD_IN_ALPHAS.length - 1)]!; // clamped above
}
