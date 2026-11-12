// Thrum's echo on screen (T830; art-direction §6 *Thrum's echo*, design/maps.md § 5.5 with
// `spared_quiet_wave = false`; sim/echo.ts): pure rules, unit-tested; EchoView applies them.
// - **Walking in** (`restTicks` 0): `fx.echo` `walk_<facing>`, the drained grey Elder drifting toward
//   the choir's leader (2 frames, a pixel's bob), facing the way she drifts.
// - **At rest** (`restTicks` > 0, from `EchoArrived`): `warm_<facing>` once (gold from the outline
//   in, 4 frames at 8 fps), then `rise_<facing>` breathing gold while she lifts ECHO_RISE_PX over
//   the sim's ECHO_RISE_SEC and fades down the stepped-alpha ladder over its last part
//   (`echoRiseAt`, sim ticks: it holds while paused). Under reduced motion she doesn't lift; she
//   only fades. No rest motes: she is not a unit laid to rest, and earns no rest points.
import { ECHO_RISE_SEC } from '../../content/rules.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import { TICK_HZ } from '../../shared/time.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';

export const ECHO_SPRITE: SpriteId = 'fx.echo';
/** The sim's rise (ticks) after she arrives. */
export const ECHO_RISE_TICKS = Math.round(ECHO_RISE_SEC * TICK_HZ);
/** The warm flip (4 frames at 8 fps) before she lifts, in ticks. */
export const ECHO_WARM_TICKS = Math.round(0.5 * TICK_HZ);
/** How far she lifts (px) by the end of her rise. */
export const ECHO_RISE_PX = 20;

export type EchoLook = 'walk' | 'warm' | 'rise';

/** Her look at `restTicks` (0: walking in). */
export function echoLook(restTicks: number): EchoLook {
  if (restTicks <= 0) return 'walk';
  return restTicks <= ECHO_WARM_TICKS ? 'warm' : 'rise';
}

/** Her lift (px) and alpha at `restTicks` (see the header). */
export function echoRiseAt(
  restTicks: number,
  still: boolean,
  out: { lift: number; alpha: number },
): { lift: number; alpha: number } {
  const span = ECHO_RISE_TICKS - ECHO_WARM_TICKS;
  const t = span > 0 ? (restTicks - ECHO_WARM_TICKS) / span : 1;
  if (!(t > 0)) {
    out.lift = 0;
    out.alpha = 1;
    return out;
  }
  out.lift = still ? 0 : Math.round(ECHO_RISE_PX * Math.min(1, t));
  out.alpha = t >= 1 ? 0 : t < 0.55 ? 1 : STEPPED_ALPHA[1 + Math.min(2, Math.floor(((t - 0.55) / 0.45) * 3))]!;
  return out;
}
