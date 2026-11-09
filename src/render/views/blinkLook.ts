// The blink view's timing and colour (T404; BlinkView.ts), pure so they're unit-tested without
// Phaser: the tell's stepping alpha on sim ticks and the afterimage's stepped fade on real time.
import { rgbOf } from '../../content/palettes/master.ts';
import { fadeAlpha } from '../vfx/fxTiming.ts';

/** How long an afterimage takes to fade (ms). */
export const AFTERIMAGE_MS = 450;
/** The afterimage's alpha as it starts (it steps down from here). */
export const AFTERIMAGE_ALPHA = 0.7;
/** The tell steps between these every TELL_STEP_TICKS sim ticks (4 Hz at 60 ticks/s). */
const TELL_ALPHA = { on: 0.7, off: 0.4 } as const;
const TELL_STEP_TICKS = 8;

const GHOST_RGB = rgbOf('violet.4');
/** The silhouettes' fill: `violet.4`, the `blink` tell's colour (art-direction §8). */
export const GHOST_TINT = (GHOST_RGB.r << 16) | (GHOST_RGB.g << 8) | GHOST_RGB.b;

/** The tell's alpha `ticksLeft` ticks before the blink (steady under reduced motion). */
export function blinkTellAlpha(ticksLeft: number, reducedMotion: boolean): number {
  if (reducedMotion) return TELL_ALPHA.on;
  return Math.floor(ticksLeft / TELL_STEP_TICKS) % 2 === 0 ? TELL_ALPHA.on : TELL_ALPHA.off;
}

/** An afterimage's alpha `ms` into its fade (0 once it's over). */
export function afterimageAlpha(ms: number): number {
  if (ms >= AFTERIMAGE_MS) return 0;
  return AFTERIMAGE_ALPHA * fadeAlpha(ms / AFTERIMAGE_MS);
}
