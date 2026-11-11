// Underfoot's trap as rules and pixels (T604, polished by T630a; TrapView applies them; core-loop.md
// § 3.2): pure, so they're unit-tested.
// - **The snare:** a `green.3` ring (moss) at half a tile over a 1 px `ink.0` under-stroke, with a
//   pair of `green.4` jaws biting inward at each of its four points (`trapImage`), so it reads as a
//   trap laid on the road, not a range ring or an aura.
// - **Armed:** it breathes on sim time, a step dimmer every other half second (`trapAlpha`: 100% ↔
//   60%, the stepped ladder), so a live trap reads as waiting; in its last second it blinks off and
//   on at 4 Hz, so its end is no surprise. Held lit under reduced motion, both.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { TICK_HZ } from '../../shared/time.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import { ringImage, type RingImage } from '../vfx/overlayPixels.ts';

export const TRAP_TILES = 0.5;
export const TRAP_COLOR: ColorName = 'green.3';
export const TRAP_JAW: ColorName = 'green.4';
export const TRAP_UNDER: ColorName = 'ink.0';
/** Each jaw reaches this far in from the ring (px). */
export const JAW_PX = 2;
/** The breath: a step dimmer every other BREATH_TICKS; the last WARN_TICKS blink every BLINK_TICKS. */
export const BREATH_TICKS = TICK_HZ / 2;
export const WARN_TICKS = TICK_HZ;
export const BLINK_TICKS = TICK_HZ / 8;

/** The trap's alpha with `ticksLeft` to go: its breath, its last second's blink (0: off). */
export function trapAlpha(ticksLeft: number, reducedMotion: boolean): number {
  if (ticksLeft <= 0) return 0;
  if (reducedMotion) return 1;
  if (ticksLeft <= WARN_TICKS) return Math.floor(ticksLeft / BLINK_TICKS) % 2 === 1 ? 0 : 1;
  return Math.floor(ticksLeft / BREATH_TICKS) % 2 === 0 ? 1 : STEPPED_ALPHA[1];
}

/** The snare: the ring with its four pairs of inward jaws; (cx, cy) sits on the tile's centre. */
export function trapImage(): RingImage {
  const ring = ringImage(TRAP_TILES, TRAP_COLOR, false, TRAP_UNDER);
  const { w, h, data } = ring.image;
  const out = new Uint8ClampedArray(data);
  const jaw = rgbOf(TRAP_JAW);
  const put = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    out[i] = jaw.r;
    out[i + 1] = jaw.g;
    out[i + 2] = jaw.b;
    out[i + 3] = 255;
  };
  const { cx, cy } = ring;
  // Left and right points: a jaw a pixel above and below the axis, biting in toward the centre.
  for (let k = 1; k <= JAW_PX; k++) {
    for (const side of [-1, 1] as const) {
      const x = cx + side * (cx - k);
      put(x, cy - 1);
      put(x, cy + 1);
    }
    // Top and bottom points: a jaw a pixel either side of the axis (half as deep: the ring is 2:1).
    if (k <= Math.ceil(JAW_PX / 2)) {
      for (const side of [-1, 1] as const) {
        const y = cy + side * (cy - k);
        put(cx - 1, y);
        put(cx + 1, y);
      }
    }
  }
  return { image: { w, h, data: out }, cx, cy };
}
