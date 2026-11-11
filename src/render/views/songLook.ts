// The Leaving Song's rest and scatter motes (T805's minimal look; design/maps.md § 5.5,
// enemies.md § 7's finale row; T830 and T841's `fx.rest_mote` / `fx.scatter_mote` replace it):
// pure motion, so it is testable without Phaser. SongView draws it.
// - **Laid to rest:** the body flips to a warm-gold flash, then REST_MOTES gold motes rise
//   straight up from it, swaying a little, fading in steps over REST_MS.
// - **Scattered:** SCATTER_MOTES cold-violet motes drift from where the unit fell back to where
//   it lies scattered (2 tiles back along its road) over DRIFT_MS, then hover there, circling
//   slowly, until it re-forms: they draw in on it over REFORM_MS with a violet flash.
// Under reduced motion the motes hold still at their end points and only fade.
import type { ColorName } from '../../content/palettes/master.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';

export const REST_MOTES = 6;
export const REST_MS = 1400;
/** The gold flip: the body's flash before the motes rise. */
export const FLIP_MS = 220;
export const REST_RISE_PX = 22;
export const SCATTER_MOTES = 5;
export const DRIFT_MS = 1500;
export const REFORM_MS = 300;
/** A scatter never outlives this (the sim re-forms it at 4 s; a Dawn may lay it to rest first). */
export const SCATTER_MAX_MS = 6000;
export const REST_COLORS: readonly ColorName[] = ['gold.4', 'white.1', 'gold.3'];
export const SCATTER_COLORS: readonly ColorName[] = ['violet.4', 'violet.3', 'hollow.4'];
export const FLIP_COLOR: ColorName = 'gold.4';
export const REFORM_COLOR: ColorName = 'violet.4';

export interface MoteAt {
  dx: number;
  dy: number;
  alpha: number;
}

/** The stepped fade (STEPPED_ALPHA) at `t` in [0, 1]. */
function stepFade(t: number): number {
  if (t <= 0) return STEPPED_ALPHA[0];
  if (t >= 1) return 0;
  const i = Math.min(STEPPED_ALPHA.length - 1, Math.floor(t * STEPPED_ALPHA.length));
  return STEPPED_ALPHA[i]!; // i < length
}

/**
 * Rest mote `i` at `ms` after the flip began, in screen px from the body: hidden during the flip,
 * then rising REST_RISE_PX with a sway, each a little apart; faded out at REST_MS.
 */
export function restMoteAt(ms: number, i: number, still: boolean, out: MoteAt): MoteAt {
  const t = (ms - FLIP_MS) / (REST_MS - FLIP_MS);
  const spread = (i - (REST_MOTES - 1) / 2) * 2;
  if (t < 0) {
    out.alpha = 0;
    out.dx = spread;
    out.dy = 0;
    return out;
  }
  const lag = i * 0.06;
  const p = still ? 1 : Math.max(0, Math.min(1, (t - lag) / (1 - lag)));
  out.dx = Math.round(spread + (still ? 0 : Math.sin((p * 3 + i) * Math.PI) * 1.5));
  out.dy = -Math.round(REST_RISE_PX * p + (i % 2) * 3);
  out.alpha = stepFade(t);
  return out;
}

/** Whether the gold flip shows at `ms` (the body's flash before the motes). */
export function flipShows(ms: number): boolean {
  return ms >= 0 && ms < FLIP_MS;
}

/**
 * Scatter mote `i` at `ms` after the fall: a share of the way from the fall (0) to where the unit
 * lies (1), and a small circling offset in px once it's there. `reformMs` ≥ 0: that long into the
 * re-form, drawing in on the body.
 */
export function scatterMoteAt(
  ms: number,
  i: number,
  reformMs: number,
  still: boolean,
  out: MoteAt & { share: number },
): MoteAt & { share: number } {
  const angle = (i / SCATTER_MOTES) * Math.PI * 2 + (still ? 0 : ms / 900);
  let radius = 5;
  if (reformMs >= 0) radius = 5 * Math.max(0, 1 - reformMs / REFORM_MS);
  out.share = still ? 1 : Math.min(1, ms / DRIFT_MS);
  out.dx = Math.round(Math.cos(angle) * radius);
  out.dy = Math.round(Math.sin(angle) * radius * 0.5) - 6;
  out.alpha = reformMs >= 0 ? stepFade(reformMs / REFORM_MS) : ms < DRIFT_MS ? 1 : 0.6;
  return out;
}
