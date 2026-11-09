// The looks of the Skyhook's and Zapcoil's specs (T407b; art-direction §7): pure, unit-tested
// rules and pixel images that ProjectileView and SpecFx draw.
// - **Seekers** (Seeker Swarm): each missile climbs from the barrels to its flyer's height over its
//   first SEEKER_CLIMB_TICKS sim ticks, turns along its flight (a 3×3 sprite may rotate), and
//   leaves a smoke trail: a point dropped every TRAIL_SAMPLE_TICKS sim ticks, the newest an
//   exhaust spark, the older ones grey puffs fading down the stepped-alpha ladder (TRAIL_STEPS).
//   On sim ticks, so a pause holds the trail and 2× stretches nothing.
// - **The capacitor charge** (Capacitor Bank): an orb at the coil's claw that grows in four steps
//   as the charge fills (`chargeLevel`, from the sim's `chargeTicks`), a `blue.4` disc in a
//   `blue.3` halo round a white-hot heart; full (the last quarter) it flickers 100% ↔ 60% on the
//   sim's 3 Hz tell step (steady under reduced motion). A charge that fizzles (drops to 0 without
//   a discharge) sputters a small `steel.4` ring.
// - **Flak Curtain**: every burst leaves a puff of dark flak smoke hanging in the air where it
//   burst (CURTAIN_PUFF), drifting up a pixel at a time and fading in steps, so a stream of bursts
//   draws a curtain across the air lane.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { STEPPED_ALPHA, TELL_STEP_TICKS } from './fxTiming.ts';

/** A seeker climbs from its muzzle to its flyer's height over this many sim ticks. */
export const SEEKER_CLIMB_TICKS = 12;

/** A seeker's height (px) `ageTicks` into its flight: muzzle to body, stepped to whole pixels. */
export function seekerLift(ageTicks: number, fromPx: number, toPx: number): number {
  const t = Math.min(1, Math.max(0, ageTicks / SEEKER_CLIMB_TICKS));
  return Math.round(fromPx + (toPx - fromPx) * t);
}

/** A trail point is dropped every this many sim ticks. */
export const TRAIL_SAMPLE_TICKS = 2;

/** One trail point's look, newest first: colour, size (px), alpha. */
export interface TrailStep {
  readonly color: ColorName;
  readonly size: 1 | 2;
  readonly alpha: number;
}

/** The trail, newest point first: an exhaust spark, then grey smoke fading out. */
export const TRAIL_STEPS: readonly TrailStep[] = [
  { color: 'orange.4', size: 1, alpha: STEPPED_ALPHA[0] },
  { color: 'steel.4', size: 2, alpha: STEPPED_ALPHA[1] },
  { color: 'steel.3', size: 2, alpha: STEPPED_ALPHA[2] },
  { color: 'steel.2', size: 2, alpha: STEPPED_ALPHA[3] },
];

/**
 * The capacitor's charge level, 0 (empty) to 4 (full): a quarter of the charge per level, so the
 * orb grows in steps, never smoothly.
 */
export function chargeLevel(chargeTicks: number, neededTicks: number): number {
  if (chargeTicks <= 0 || neededTicks <= 0) return 0;
  return Math.min(4, 1 + Math.floor((4 * chargeTicks) / neededTicks));
}

/**
 * The orb's alpha: whole while it fills; once full (level 4) it steps 100% ↔ 60% every
 * TELL_STEP_TICKS sim ticks of charge (the 3 Hz cap), steady under reduced motion.
 */
export function chargeAlpha(level: number, chargeTicks: number, reducedMotion: boolean): number {
  if (level < 4 || reducedMotion) return STEPPED_ALPHA[0];
  return Math.floor(chargeTicks / TELL_STEP_TICKS) % 2 === 0 ? STEPPED_ALPHA[0] : STEPPED_ALPHA[1];
}

/** The orb's radius in pixels at each level (level 0 draws nothing). */
export const ORB_RADIUS_PX: readonly number[] = [0, 1, 2, 3, 4];

/** The orb at radius `r` px: a `blue.3` halo at 60%, a `blue.4` disc, a white-hot heart. */
export function orbImage(r: number): RgbaImage {
  const size = 2 * r + 1;
  const data = new Uint8ClampedArray(size * size * 4);
  const put = (x: number, y: number, color: ColorName, alpha: number): void => {
    const c = rgbOf(color);
    const i = (y * size + x) * 4;
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = Math.round(alpha * 255);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d2 = (x - r) * (x - r) + (y - r) * (y - r);
      // Integer discs: the heart (radius r − 2, at least the centre), the disc, the halo.
      if (d2 <= Math.max(0, (r - 2) * (r - 2))) put(x, y, 'white.1', 1);
      else if (d2 <= (r - 1) * (r - 1) + (r - 1)) put(x, y, 'blue.4', 1);
      else if (d2 <= r * r + r) put(x, y, 'blue.3', STEPPED_ALPHA[1]);
    }
  }
  return { w: size, h: size, data };
}

/** A square dot `size` px of white (tinted per use: a trail point). */
export function dotImage(size: number): RgbaImage {
  return { w: size, h: size, data: new Uint8ClampedArray(size * size * 4).fill(255) };
}

/** Flak Curtain's smoke puff: a 3×3 dark blot rimmed lighter, its life and drift. */
export const CURTAIN_PUFF = {
  core: 'ink.2' as ColorName,
  rim: 'steel.2' as ColorName,
  ms: 600,
  /** It rises a pixel every this many ms. */
  riseEveryMs: 200,
} as const;

/** The puff image: a rounded 3×3, a dark core inside a lighter rim. */
export function puffImage(): RgbaImage {
  const core = rgbOf(CURTAIN_PUFF.core);
  const rim = rgbOf(CURTAIN_PUFF.rim);
  const data = new Uint8ClampedArray(3 * 3 * 4);
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if ((x === 0 || x === 2) && (y === 0 || y === 2)) continue; // round the corners
      const c = x === 1 && y === 1 ? core : rim;
      const i = (y * 3 + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  return { w: 3, h: 3, data };
}

/** A puff's alpha `ms` into its life: 60%, then 35%, then 15%, then gone (0). */
export function puffAlpha(ms: number): number {
  if (ms < 0 || ms >= CURTAIN_PUFF.ms) return 0;
  const k = Math.floor((3 * ms) / CURTAIN_PUFF.ms);
  return STEPPED_ALPHA[1 + k]!; // k < 3
}

/** How far a puff has risen (px) `ms` into its life. */
export function puffRise(ms: number): number {
  return Math.max(0, Math.floor(ms / CURTAIN_PUFF.riseEveryMs));
}
