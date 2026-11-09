// The blink view's timing and colour (T404; BlinkView.ts), pure so they're unit-tested without
// Phaser: the tell's stepping alpha on sim ticks and the afterimage's stepped fade on real time.
import { rgbOf } from '../../content/palettes/master.ts';
import { fadeAlpha, tellHigh } from '../vfx/fxTiming.ts';

/** How long an afterimage takes to fade (ms). */
export const AFTERIMAGE_MS = 450;
/** The afterimage's alpha as it starts (it steps down from here). */
export const AFTERIMAGE_ALPHA = 0.7;
/** The tell steps between these on the sim's 3 Hz tell step (vfx/fxTiming.ts `tellHigh`). */
const TELL_ALPHA = { on: 0.85, off: 0.5 } as const;

const GHOST_RGB = rgbOf('violet.4');
/** The silhouettes' fill: `violet.4`, the `blink` tell's colour (art-direction §8). */
export const GHOST_TINT = (GHOST_RGB.r << 16) | (GHOST_RGB.g << 8) | GHOST_RGB.b;
const EDGE_RGB = rgbOf('white.1');
/** Their 1 px outline: `white.1`, so the ghost reads as a lit shape on any ground (T430a). */
export const GHOST_EDGE_TINT = (EDGE_RGB.r << 16) | (EDGE_RGB.g << 8) | EDGE_RGB.b;

/** The tell's alpha `ticksLeft` ticks before the blink (steady under reduced motion). */
export function blinkTellAlpha(ticksLeft: number, reducedMotion: boolean): number {
  return tellHigh(ticksLeft, reducedMotion) ? TELL_ALPHA.on : TELL_ALPHA.off;
}

/** An afterimage's alpha `ms` into its fade (0 once it's over). */
export function afterimageAlpha(ms: number): number {
  if (ms >= AFTERIMAGE_MS) return 0;
  return AFTERIMAGE_ALPHA * fadeAlpha(ms / AFTERIMAGE_MS);
}
