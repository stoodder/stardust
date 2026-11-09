// Timing and shape of the event-driven effects FxView draws (art-direction §7): pure functions of
// an effect's age, so they're unit-tested without Phaser. Everything steps: alpha in the 100/60/35/15
// ladder, sizes and offsets in whole pixels or quarter tiles.
import { RING_STEP_TILES } from './overlayPixels.ts';

/** Stepped alpha (art-direction §7). */
export const STEPPED_ALPHA = [1, 0.6, 0.35, 0.15] as const;

/** The stepped alpha for an effect `t` (0–1) of the way through its fade. */
export function fadeAlpha(t: number): number {
  if (t < 0.5) return STEPPED_ALPHA[0];
  if (t < 0.7) return STEPPED_ALPHA[1];
  if (t < 0.85) return STEPPED_ALPHA[2];
  return STEPPED_ALPHA[3];
}

// ── Hitscan tracer (Kinetic: a straight streak, art-direction §7) ───────────────────────────

/** A tracer's flight from muzzle to target, in ms (about 5 frames at 60 Hz). */
export const TRACER_MS = 90;

// ── Sprinkler pulse ring ─────────────────────────────────────────────────────────────────────

/** A pulse ring's expansion from the tower to its radius, in ms. */
export const PULSE_MS = 360;

/** The ring's radius at age `t` (0–1): grows in quarter-tile steps from one step to `radius`. */
export function pulseRadius(radiusTiles: number, t: number): number {
  const steps = Math.max(1, Math.round(radiusTiles / RING_STEP_TILES));
  const k = Math.min(steps, 1 + Math.floor(Math.max(0, t) * steps));
  return k * RING_STEP_TILES;
}

// ── Explosion bursts (fx.explosion: 4 frames at 12 fps) ─────────────────────────────────────

export const BURST_MS = 4 * (1000 / 12);

// ── Orbital Strike impact ────────────────────────────────────────────────────────────────────

/** The beam's life after the strike lands, in ms. */
export const BEAM_MS = 200;

/** The beam's width in pixels at `ms` after impact (0 once it's gone): 8, 6, 4, then 2. */
export function beamWidth(ms: number): number {
  if (ms < 0 || ms >= BEAM_MS) return 0;
  const k = Math.floor((ms / BEAM_MS) * 4);
  return 8 - 2 * k;
}

/**
 * The beam's white core width for a beam `w` px wide: 4, 2, 2, 2. Never under 2: Phaser's WebGL
 * Graphics drops 1 px wide rects, so the thinnest beam is all core.
 */
export function beamCore(w: number): number {
  return Math.max(2, w - 4);
}

/** One burst of the strike: its grid offset from the target's center and its delay in ms. */
export interface StrikeBurst {
  readonly dx: number;
  readonly dy: number;
  readonly delayMs: number;
}

/**
 * The strike's bursts: the center, then a ring of six at 0.9 tiles (inside the 1.5-tile radius),
 * alternating delays so the blast rolls outward.
 */
export const STRIKE_BURSTS: readonly StrikeBurst[] = Object.freeze([
  { dx: 0, dy: 0, delayMs: 0 },
  ...Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3 + Math.PI / 6;
    return { dx: 0.9 * Math.cos(a), dy: 0.9 * Math.sin(a), delayMs: i % 2 === 0 ? 50 : 100 };
  }),
]);

/** How long a landed strike lives (its last burst ends). */
export const STRIKE_MS = Math.max(BEAM_MS, 100 + BURST_MS);

// ── Screen shake (big explosions only; off under reduced motion, art-direction §7) ──────────

export const SHAKE_MS = 240;
/** Integer camera offsets, at most 2 px, one step per 40 ms, settling to 0. */
const SHAKE_STEPS: readonly (readonly [number, number])[] = [
  [2, 1],
  [-2, -1],
  [1, 2],
  [-1, -2],
  [1, 0],
  [0, -1],
];

const NO_SHAKE = [0, 0] as const;

/** The camera offset `ms` into a shake ([0, 0] once it's over). Allocation-free. */
export function shakeOffset(ms: number): readonly [number, number] {
  if (ms < 0 || ms >= SHAKE_MS) return NO_SHAKE;
  return SHAKE_STEPS[Math.floor(ms / (SHAKE_MS / SHAKE_STEPS.length))] ?? NO_SHAKE;
}
