// Phasing's look (T503's minimal view; art-direction §8's `phasing` tell: "alternating-frame flicker
// (visible / dithered) during the tell; dithered while untargetable", a broken circle in `teal.4`;
// enemies.md § 2.6, § 3), pure so it's unit-tested without Phaser. EnemyView reads the body's look
// here; PhaseView.ts draws the broken ring under the unit.
// - **The tell** (`phaseTelling`, the last 0.5 s before the Moth phases): the body alternates
//   whole and dithered on the sim's 3 Hz tell step (vfx/fxTiming.ts `tellHigh`, so it holds while
//   paused and keeps pace at 2×); under reduced motion it stays whole and the ring alone tells.
// - **Phased:** dithered and faint (a ghost), steady: the baked `cloak` variant's 50% checker at
//   PHASED_ALPHA, or, for a sprite without one, the plain body at PHASED_PLAIN_ALPHA.
// T530a polishes it (the Moth's own phase frames are T540a's).
import type { ColorName } from '../../content/palettes/master.ts';
import { phaseTelling } from '../../sim/index.ts';
import { tellHigh } from '../vfx/fxTiming.ts';
import type { PoseEnemy } from './enemyPose.ts';

/** A Phased body's alpha in its dithered `cloak` variant (with the checker, a ghost). */
export const PHASED_ALPHA = 0.55;
/** A Phased body's alpha without a dithered variant. */
export const PHASED_PLAIN_ALPHA = 0.3;
/** The tell's dithered frames' alpha (the whole frames draw at 1). */
export const TELL_DITHER_ALPHA = 0.85;
/** The tell's dimmer frames without a dithered variant. */
export const TELL_PLAIN_ALPHA = 0.55;
/** The broken ring's colour (art-direction §8). */
export const PHASE_RING_COLOR: ColorName = 'teal.4';

/** Where a phaser is in its cycle, for render: solid, in its tell, or Phased. */
export type PhaseState = 'solid' | 'tell' | 'phased';

/** A live unit's phase state (solid for a unit that doesn't phase). */
export function phaseState(e: PoseEnemy): PhaseState {
  const phase = e.def?.phase ?? null;
  if (phase === null || !e.alive) return 'solid';
  if (e.phased) return 'phased';
  return phaseTelling(e, phase) ? 'tell' : 'solid';
}

/** Whether the body draws dithered this frame: Phased, or a tell's dithered step. */
export function phaseDithered(e: PoseEnemy, reducedMotion: boolean): boolean {
  const s = phaseState(e);
  if (s === 'phased') return true;
  return s === 'tell' && !tellHigh(e.phaseTicks, reducedMotion);
}

/**
 * The body's alpha factor from phasing (1 for a solid unit); `hasDither`: its sprite bakes the
 * `cloak` variant, which EnemyView draws while `phaseDithered`.
 */
export function phaseAlpha(e: PoseEnemy, hasDither: boolean, reducedMotion: boolean): number {
  const s = phaseState(e);
  if (s === 'phased') return hasDither ? PHASED_ALPHA : PHASED_PLAIN_ALPHA;
  if (s === 'tell' && !tellHigh(e.phaseTicks, reducedMotion)) {
    return hasDither ? TELL_DITHER_ALPHA : TELL_PLAIN_ALPHA;
  }
  return 1;
}

/** The broken ring's alpha: stepping with the tell (steady under reduced motion), steady Phased. */
export function phaseRingAlpha(e: PoseEnemy, reducedMotion: boolean): number {
  const s = phaseState(e);
  if (s === 'phased') return 0.85;
  if (s === 'tell') return tellHigh(e.phaseTicks, reducedMotion) ? 1 : 0.6;
  return 0;
}
