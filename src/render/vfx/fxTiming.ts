// Timing and shape of the event-driven effects FxView draws (art-direction §7): pure functions of
// an effect's age, so they're unit-tested without Phaser. Everything steps: alpha in the 100/60/35/15
// ladder, sizes and offsets in whole pixels or quarter tiles.
import { RING_STEP_TILES } from './overlayPixels.ts';

/** Stepped alpha (art-direction §7). */
export const STEPPED_ALPHA = [1, 0.6, 0.35, 0.15] as const;

/**
 * Scanner Sweep's ring (T406) with `ticksLeft` of its zone to go: whole, then the stepped fade over
 * its last `fadeTicks` (sim ticks, so it holds while paused); 0 once the zone is done.
 */
export function sweepAlpha(ticksLeft: number, fadeTicks: number): number {
  if (ticksLeft <= 0) return 0;
  return ticksLeft >= fadeTicks ? STEPPED_ALPHA[0] : fadeAlpha(1 - ticksLeft / fadeTicks);
}

/** The stepped alpha for an effect `t` (0–1) of the way through its fade. */
export function fadeAlpha(t: number): number {
  if (t < 0.5) return STEPPED_ALPHA[0];
  if (t < 0.7) return STEPPED_ALPHA[1];
  if (t < 0.85) return STEPPED_ALPHA[2];
  return STEPPED_ALPHA[3];
}

/**
 * The starting vertical speed (px/ms) of a lob under gravity `g` (px/ms², down) that falls `dy` px
 * (negative: rises) in `ms`: it lands exactly there, arcing `g·ms²/8` px over the straight line.
 */
export function lobVelocity(dy: number, ms: number, g: number): number {
  return ms > 0 ? (dy - 0.5 * g * ms * ms) / ms : 0;
}

// ── Tells on sim ticks (art-direction §8, T430a) ─────────────────────────────────────────────

/**
 * Tells drawn from sim state (a shield pulse's rings, a blink's ghost, the hush) step between two
 * alphas every TELL_STEP_TICKS sim ticks: a 3 Hz cycle at 60 ticks/s, the flicker cap (art-direction
 * §8), at any game speed's frame rate; they hold while paused.
 */
export const TELL_STEP_TICKS = 10;

/** Whether a tell with `ticksLeft` to go is on its high step (always, under reduced motion). */
export function tellHigh(ticksLeft: number, reducedMotion: boolean): boolean {
  return reducedMotion || Math.floor(Math.max(0, ticksLeft) / TELL_STEP_TICKS) % 2 === 0;
}

/** The page clock's shimmer: a look alternates every SHIMMER_MS, a 3 Hz cycle (D097). */
export const SHIMMER_MS = 167;

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
/** A Cluster Thumper bomblet's pop (fx.bomblet_burst): 3 frames at 12 fps. */
export const BOMBLET_BURST_MS = 3 * (1000 / 12);

/**
 * Shell bursts playing at once on one tile, by size (review R14): a choke under several Thumpers
 * shows a couple of blasts and their rings, not a wall of stacked fireballs burying the units. A
 * shell over the cap still rings its splash; only its burst is skipped.
 */
export const BURSTS_PER_TILE = { big: 2, small: 3 } as const;

/**
 * A burst's alpha `ms` into its play of `frames` frames over `durationMs`: whole, then the stepped
 * fade over its last frame, so the smoke thins by alpha (its puffs are solid, never a dither).
 */
export function burstAlpha(ms: number, durationMs: number, frames: number): number {
  const lastFrom = durationMs * (1 - 1 / frames);
  if (!(ms > lastFrom)) return STEPPED_ALPHA[0];
  return fadeAlpha((ms - lastFrom) / (durationMs - lastFrom));
}

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

// ── Feedback juice (D026) ────────────────────────────────────────────────────────────────────

/** A leak: the core's red pulse ring grows to this radius (tiles) over LEAK_RING_MS. */
export const LEAK_RING_TILES = 1;
export const LEAK_RING_MS = 360;
/** A leak shakes the camera 1 px for this long (off under reduced motion). */
export const LEAK_SHAKE_MS = 120;
const LEAK_SHAKE_STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
];

/** The camera offset `ms` into a leak shake ([0, 0] once it's over). Allocation-free. */
export function leakShakeOffset(ms: number): readonly [number, number] {
  if (ms < 0 || ms >= LEAK_SHAKE_MS) return NO_SHAKE;
  return LEAK_SHAKE_STEPS[Math.floor(ms / (LEAK_SHAKE_MS / LEAK_SHAKE_STEPS.length))] ?? NO_SHAKE;
}

/** Floating numbers ("−2", "+126") rise this many px over FLOAT_MS, then fade. */
export const FLOAT_MS = 900;
export const FLOAT_RISE_PX = 10;

/** A floating number's rise in whole pixels at `ms`. */
export function floatRise(ms: number): number {
  const t = Math.min(1, Math.max(0, ms / FLOAT_MS));
  return Math.floor(t * FLOAT_RISE_PX);
}

/** A new tower drops in from this many px above its tile, one px per BUILD_DROP_STEP_FRAMES. */
export const BUILD_DROP_PX = 4;
export const BUILD_DROP_STEP_FRAMES = 2;
/** The dust ring around a new tower: grows to BUILD_PUFF_TILES over BUILD_PUFF_MS. */
export const BUILD_PUFF_TILES = 0.75;
export const BUILD_PUFF_MS = 240;

/** An upgrade: 2 frames of white, and a teal ring grown to UPGRADE_RING_TILES. */
export const UPGRADE_FLASH_FRAMES = 2;
export const UPGRADE_RING_TILES = 1;
export const UPGRADE_RING_MS = 300;

/** A Thumper shell's splash ring under its burst, at the splash radius. */
export const SPLASH_RING_MS = 200;

/** The Orbital Strike's ground flash (at its radius) and the scorch it leaves. */
export const STRIKE_FLASH_MS = 240;
export const SCORCH_MS = 1500;
export const SCORCH_TILES = 0.75;

/** The radius (tiles) the baked `fx.orbital_reticle` is drawn for; any other gets a ring anim. */
export const RETICLE_SPRITE_TILES = 1.5;

// ── Suppressing Fire (T207b): a strip of fire along its path segment ────────────────────────

/** A new tracer streak lands somewhere on each live segment this often (ms). */
export const SUPPRESS_TRACER_MS = 35;
/** The ground strip flickers between its two top alpha steps this often (ms). */
export const SUPPRESS_FLICKER_MS = 125;
/** The strip fades down the stepped ladder over its last ticks (sim time: it holds while paused). */
export const SUPPRESS_FADE_TICKS = 30;

/**
 * The ground strip's alpha: flickering 100% ↔ 60% every SUPPRESS_FLICKER_MS while the zone has
 * more than SUPPRESS_FADE_TICKS left (a steady 100% under reduced motion), then 35% and 15% as it
 * runs out.
 */
export function suppressAlpha(ms: number, ticksLeft: number, reducedMotion: boolean): number {
  if (ticksLeft <= SUPPRESS_FADE_TICKS / 2) return STEPPED_ALPHA[3];
  if (ticksLeft <= SUPPRESS_FADE_TICKS) return STEPPED_ALPHA[2];
  if (reducedMotion) return STEPPED_ALPHA[0];
  return Math.floor(Math.max(0, ms) / SUPPRESS_FLICKER_MS) % 2 === 0
    ? STEPPED_ALPHA[0]
    : STEPPED_ALPHA[1];
}

/**
 * Time Dilation's playfield tint (T312a; views/FieldTintView.ts), on sim ticks so it holds while
 * paused: a 35% flash for its first FIELD_FLASH_TICKS, then a 15% hold, blinking off for every
 * other FIELD_BLINK_TICKS over its last FIELD_FADE_TICKS (3 Hz; held steady under reduced motion).
 */
export const FIELD_FLASH_TICKS = 15;
export const FIELD_FADE_TICKS = 30;
export const FIELD_BLINK_TICKS = 10;

/** The tint's alpha `elapsed` ticks into a field with `ticksLeft` to go. */
export function fieldAlpha(elapsed: number, ticksLeft: number, reduced: boolean): number {
  if (elapsed < FIELD_FLASH_TICKS) return STEPPED_ALPHA[2];
  const blinkOff = Math.floor(ticksLeft / FIELD_BLINK_TICKS) % 2 === 0;
  if (!reduced && ticksLeft < FIELD_FADE_TICKS && blinkOff) return 0;
  return STEPPED_ALPHA[3];
}
