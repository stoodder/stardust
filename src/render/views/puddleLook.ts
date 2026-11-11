// Big Glorp's puddle as rules and pixels (T705's minimal readable look; T730a polishes it, T740b
// may replace it with `fx.puddle`; PuddleView applies them): pure, so they're unit-tested.
// - **The pool:** a 2:1 ellipse at the puddle's reach (the sim's radius, snapped to the ring bake
//   step), filled `green.3` at ~45% with a ragged (dithered) edge, a solid `green.4` rim, and three
//   `white.1` glints (bubbles) inside, so it reads as a pool on the ground, not a range ring
//   (dashed), the Bloom's frost disc (blue), or Underfoot's toothed snare (a ring). Not the `acid`
//   ramp: its yellow-green is the Hollow's reserved hue (art-direction §2).
// - **Drying:** whole while it lives, then the stepped fade over its last half second
//   (`puddleAlpha`), so its end is no surprise; under reduced motion it holds whole and vanishes.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { TICK_HZ } from '../../shared/time.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import { discImage, ringImage, snapRingRadius, type RingImage } from '../vfx/overlayPixels.ts';

export const PUDDLE_FILL: ColorName = 'green.3';
export const PUDDLE_RIM: ColorName = 'green.4';
export const PUDDLE_GLINT: ColorName = 'white.1';
export const PUDDLE_FILL_ALPHA = 0.45;
/** The fade runs over the puddle's last DRY_TICKS (half a second), a step per quarter of it. */
export const DRY_TICKS = TICK_HZ / 2;

/** The puddle's alpha with `ticksLeft` to go: whole, then the stepped fade (0: gone). */
export function puddleAlpha(ticksLeft: number, reducedMotion: boolean): number {
  if (ticksLeft <= 0) return 0;
  if (reducedMotion || ticksLeft > DRY_TICKS) return 1;
  const step = STEPPED_ALPHA.length - Math.ceil((ticksLeft / DRY_TICKS) * STEPPED_ALPHA.length);
  return STEPPED_ALPHA[Math.min(STEPPED_ALPHA.length - 1, Math.max(0, step))]!;
}

/** The texture key for a puddle of `radiusTiles` (one per snapped radius). */
export function puddleKey(radiusTiles: number): string {
  return `fx.puddle_${snapRingRadius(radiusTiles)}`;
}

/** The pool's pixels: the fill, its rim over it, and three glints; (cx, cy) on its centre. */
export function puddleImage(radiusTiles: number): RingImage {
  const disc = discImage(radiusTiles, PUDDLE_FILL, PUDDLE_FILL_ALPHA, true);
  const rim = ringImage(radiusTiles, PUDDLE_RIM, false);
  const { w, h, data } = disc.image;
  const out = new Uint8ClampedArray(data);
  // The rim has the disc's width; its height matches (no under-stroke), so pixels line up.
  for (let i = 0; i < rim.image.data.length && i < out.length; i += 4) {
    if (rim.image.data[i + 3] === 0) continue;
    out[i] = rim.image.data[i]!;
    out[i + 1] = rim.image.data[i + 1]!;
    out[i + 2] = rim.image.data[i + 2]!;
    out[i + 3] = 255;
  }
  const glint = rgbOf(PUDDLE_GLINT);
  const { cx, cy } = disc;
  const put = (x: number, y: number): void => {
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return;
    const i = (y * w + x) * 4;
    out[i] = glint.r;
    out[i + 1] = glint.g;
    out[i + 2] = glint.b;
    out[i + 3] = 255;
  };
  const qx = Math.max(1, Math.round(cx / 2));
  const qy = Math.max(1, Math.round(cy / 2));
  put(cx - qx, cy - 1);
  put(cx + 1, cy - qy);
  put(cx + qx, cy + 1);
  return { image: { w, h, data: out }, cx, cy };
}
