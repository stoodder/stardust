// Everglow Security, part two's looks (T703; design/enemies.md § 3 `healer_aura`, § 5.3; art-
// direction.md §8's `healer` row: a plus ✚, an expanding ring pulse, `green.3`). Pure rules and
// pixel images, unit-tested; HealAuraView applies them. Minimal readable views: T730a/T740a
// polish them.
// - **The heal ring:** a solid `green.3` ring over a 1 px `ink.0` under-stroke at the aura's radius
//   round every unit projecting one (the sim's `projectedHeal`), always on (the aura is continuous),
//   and once a second a **pulse**: a `green.4` ring that expands from a quarter of the radius out
//   to the ring in PULSE_STEPS steps on sim time (`pulseStep`; held while paused, keeps pace at
//   2×), offset per uid so two Associates don't pulse in unison. Solid and green where the
//   Cantor's is dashed blue and the Expediter's beats orange, so the three auras read apart. No
//   pulse under reduced motion: the ring stays, steady.
// - **The ✚:** every unit an aura is mending right now (the sim's `healRate` > 0: below its max HP,
//   in a ring) wears a small plus at the top left of its body (`plusImage`: a `green.4` cross with a
//   `white.1` heart in an `ink.0` rim, 7×7), rising a pixel on the pulse's second half; still under
//   reduced motion. It goes the moment the unit is whole.
// - **The open panel** (C4 Purge; the sim's `def.openPanel`): every such unit wears a maintenance
//   hatch hanging open off its right flank (`panelImage`: a `steel.4` door on an `ink.0` rim, its
//   dark `ink.0` bay behind it, 5×6) with an `orange.4` spark that blinks in the bay on the 3 Hz
//   tell step (`panelSpark`; lit, steady, under reduced motion): QUILL working against it from
//   inside. T740a draws the real panel into the Everglow sprites.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { TELL_STEP_TICKS } from '../vfx/fxTiming.ts';

export const HEAL_COLOR: ColorName = 'green.3';
export const HEAL_PULSE_COLOR: ColorName = 'green.4';
export const HEAL_UNDER: ColorName = 'ink.0';
/** The ring's alpha (whole: Act III's ground is near-black, nightRings.ts). */
export const HEAL_RING_ALPHA = 1;
/** One pulse a second (sim ticks), in this many radius steps, then a rest. */
export const PULSE_TICKS = 60;
export const PULSE_STEPS = 4;
/** Each pulse step lasts this many ticks; the rest of the period shows no pulse. */
export const PULSE_STEP_TICKS = 8;
/** The pulse starts at this share of the radius and ends at the ring. */
export const PULSE_FROM = 0.25;

/**
 * The pulse's step at sim tick `tick` for unit `uid` (0 to PULSE_STEPS − 1), or −1 between pulses
 * and always under reduced motion.
 */
export function pulseStep(tick: number, uid: number, reducedMotion: boolean): number {
  if (reducedMotion) return -1;
  const t = (tick + uid * 17) % PULSE_TICKS;
  const step = Math.floor(t / PULSE_STEP_TICKS);
  return step < PULSE_STEPS ? step : -1;
}

/** The pulse ring's radius (tiles) at step `step` of an aura of `radiusTiles`. */
export function pulseRadius(radiusTiles: number, step: number): number {
  const k = step / (PULSE_STEPS - 1);
  return radiusTiles * (PULSE_FROM + (1 - PULSE_FROM) * k);
}

/** The pulse ring's alpha at step `step`: whole as it leaves, fading as it reaches the ring. */
export function pulseAlpha(step: number): number {
  return [1, 0.85, 0.6, 0.35][step] ?? 0;
}

/** Whether the ✚ rides a pixel up (the pulse's second half); never under reduced motion. */
export function plusLifted(tick: number, uid: number, reducedMotion: boolean): boolean {
  if (reducedMotion) return false;
  return (tick + uid * 17) % PULSE_TICKS >= PULSE_TICKS / 2;
}

/** Whether the open panel's spark is lit at sim tick `tick` (always under reduced motion). */
export function panelSpark(tick: number, uid: number, reducedMotion: boolean): boolean {
  if (reducedMotion) return true;
  return Math.floor((tick + uid * 5) / TELL_STEP_TICKS) % 2 === 0;
}

/** Paints `rows` ('.' clear, else a key of `colors`) into an image. */
function paint(rows: readonly string[], colors: Readonly<Record<string, ColorName>>): RgbaImage {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const name = colors[rows[y]![x]!]; // y < h, x < w
      if (name === undefined) continue;
      const c = rgbOf(name);
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  return { w, h, data };
}

/** The ✚ (7×7): a `green.4` cross, `white.1` heart, `ink.0` rim. */
export const PLUS_ROWS: readonly string[] = [
  '..kkk..',
  '..kgk..',
  'kkkgkkk',
  'kggwggk',
  'kkkgkkk',
  '..kgk..',
  '..kkk..',
];
export const PLUS_SIZE = 7;

export function plusImage(): RgbaImage {
  return paint(PLUS_ROWS, { k: HEAL_UNDER, g: HEAL_PULSE_COLOR, w: 'white.1' });
}

/**
 * The open panel (5×6): a `steel.4` hatch door swung out to the right of an `ink.0` bay, frame 1
 * with the `orange.4` spark lit inside the bay.
 */
export const PANEL_ROWS: readonly (readonly string[])[] = [
  ['kk...', 'kbk..', 'kbsk.', 'kbsk.', 'kbsk.', 'kkkk.'],
  ['kk...', 'kbk..', 'kosk.', 'kbsk.', 'kbsk.', 'kkkk.'],
];

export function panelImage(frame: 0 | 1): RgbaImage {
  return paint(PANEL_ROWS[frame]!, { k: HEAL_UNDER, b: 'ink.1', s: 'steel.4', o: 'orange.4' });
}
