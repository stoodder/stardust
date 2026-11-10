// How a unit standing down looks (design/enemies.md § 6.1 `pivot`; T506's minimal view, T530a
// polishes): it holds still where it stopped (the sim holds it) in its `flee` pose where it has one
// (EnemyView's leaving pose) and fades out over the stand-down's 1 s down the stepped-alpha ladder
// (art-direction §7): 80%, 60%, 40%, 20%, a rung per quarter second, then it's gone (the sim
// removes it). enemyPose.ts `cloakAlpha` reads it first. Pure, so it's unit-tested.
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
