// The Hollow, and what it does to the Skitterkin (T450; design/enemies.md § 5.4, § 8; story/
// bible.md §8). The Hollow *hums the jingle, wrong*: "Ev-er-glow" forward, then the second half
// backwards, every note out of tune, a wobbling hum that drops in while Hollow units are on the
// field and ducks the music under it (a loop, ENEMY_LOOPS). Around a Hollow unit the small sounds
// drop out (HOLLOW_QUIET, eventTables.ts). Its hush tell is a breath drawn in; the hush itself a
// squeak cut off mid-breath and a low, hollow thud, the music dipping with it; a Hollow unit dies
// by unravelling into static, a faint backward hiss cut dead, so the silence after it is the
// sound. Act II's Skitterkin no longer pop with confetti: a muffled pop and a small, sad squeak
// (the `sad_squeak` death dial); fleeing runners bolting (Skittish) squeak in panic.
import type { SfxRecipe } from '../types.ts';

/** G3, the Hollow hum's tonic: the jingle's "Ev-" a twelfth down. */
const HUM_HZ = 196;
/**
 * The hum's notes over HUM_HZ, each `[at s, ratio]`: G–C–E (forward) then C–D–F (F–D–C
 * backwards), every one off by its own cents (−35, +20, −50, +30, −40): out of tune, half
 * backwards (bible §8).
 */
const HUM_STEPS = [
  [0.45, 1.3348 * 0.98],
  [0.9, 1.6818 * 1.0116],
  [1.35, 1.3348 * 0.9715],
  [1.8, 1.4983 * 1.0175],
  [2.25, 1.7818 * 0.9772],
] as const;

export const HOLLOW_SFX = {
  /**
   * The Hollow hums the jingle wrong (a loop while Hollow units are on the field): two sine voices
   * a few cents apart, so the hum beats against itself, over a breath of noise. It ducks the music
   * while it hums ("drops in near Hollow units while other music ducks").
   */
  hollow_hum: {
    gain: 0.3,
    priority: 2,
    minGapMs: 4000,
    maxVoices: 1,
    duck: 0.45,
    layers: [
      {
        wave: 'sine',
        freq: HUM_HZ,
        steps: HUM_STEPS,
        vibrato: { hz: 3.3, cents: 30 },
        env: { a: 0.3, d: 0.3, s: 0.8, hold: 1.8, r: 0.4 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: HUM_HZ * 1.007,
        steps: HUM_STEPS,
        vibrato: { hz: 2.7, cents: 40 },
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.4, d: 0.3, s: 0.7, hold: 1.7, r: 0.4 },
        gain: 0.3,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 500, q: 2 },
        env: { a: 0.5, d: 0.4, s: 0.6, hold: 1.3, r: 0.5 },
        gain: 0.15,
      },
    ],
  },
  /**
   * A Hollow unit dies (it unravels into static and cold-violet motes): a faint hiss swelling
   * backwards, then cut dead. Exempt from the Hollow's own quiet (HOLLOW_QUIET), it's the
   * Hollow's sound; the hole it leaves is the point.
   */
  hollow_unravel: {
    gain: 0.2,
    priority: 1,
    minGapMs: 70,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 1500, freqEnd: 5000, q: 1.5 },
        env: { a: 0.14, d: 0.005, s: 0.9, hold: 0.01, r: 0.006 },
        gain: 0.55,
      },
      {
        wave: 'pulse12',
        freq: 300,
        glide: 2.2,
        glideSec: 0.15,
        filter: { type: 'lowpass', freq: 1500 },
        env: { a: 0.12, d: 0.005, s: 0.8, hold: 0.02, r: 0.006 },
        gain: 0.2,
      },
    ],
  },
  /**
   * The hush tell (HushStarted; 0.5 s, both units held still): a breath drawn in, rising, with
   * the runner's tiny alarmed "eep?" on top.
   */
  hush_tell: {
    gain: 0.28,
    priority: 2,
    minGapMs: 200,
    maxVoices: 2,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 600, freqEnd: 2400, q: 2 },
        env: { a: 0.4, d: 0.05, s: 0.8, hold: 0.04, r: 0.04 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        at: 0.05,
        freq: 1568,
        glide: 1.25,
        glideSec: 0.08,
        env: { a: 0.003, d: 0.06, s: 0, r: 0.02 },
        gain: 0.3,
      },
    ],
  },
  /**
   * The hush lands (Hushed): the runner's squeak cut off mid-breath, then a low, hollow thud, and
   * the music dips with it.
   */
  hushed: {
    gain: 0.34,
    priority: 2,
    minGapMs: 200,
    maxVoices: 2,
    duck: 0.5,
    layers: [
      {
        wave: 'triangle',
        freq: 1318.5,
        glide: 1.4,
        glideSec: 0.06,
        env: { a: 0.002, d: 0.06, s: 0.6, hold: 0.002, r: 0.006 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        at: 0.07,
        freq: 73.42,
        glide: 0.8,
        glideSec: 0.4,
        env: { a: 0.01, d: 0.4, s: 0, r: 0.2 },
        gain: 0.6,
      },
      {
        wave: 'noise',
        at: 0.07,
        freq: 440,
        filter: { type: 'lowpass', freq: 250 },
        env: { a: 0.02, d: 0.35, s: 0, r: 0.15 },
        gain: 0.3,
      },
    ],
  },
  /**
   * A fleeing runner bolts (SkittishBolt): a quick, high panicked squeak-squeak. A whole group
   * bolts at once, so one voice and a gap merge them.
   */
  panic_squeak: {
    gain: 0.24,
    priority: 1,
    minGapMs: 160,
    maxVoices: 1,
    jitter: 2,
    layers: [0, 0.07].map((at, i) => ({
      wave: 'triangle' as const,
      at,
      freq: i === 0 ? 1760 : 1975.53,
      glide: 1.35,
      glideSec: 0.04,
      env: { a: 0.002, d: 0.04, s: 0, r: 0.02 },
      gain: 0.55,
    })),
  },
  /**
   * An Act II Skitterkin dies (the `sad_squeak` dial; enemies.md § 8): a soft, muffled pop, no
   * confetti, then a small squeak falling away. Quieter than Act I's pop. Pitched per enemy.
   */
  sad_squeak: {
    gain: 0.24,
    priority: 1,
    minGapMs: 45,
    maxVoices: 3,
    jitter: 1,
    layers: [
      {
        wave: 'square',
        freq: 420,
        glide: 1.6,
        glideSec: 0.04,
        filter: { type: 'lowpass', freq: 1400 },
        env: { a: 0.001, d: 0.04, s: 0, r: 0.02 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        at: 0.06,
        freq: 1318.5,
        glide: 0.7,
        glideSec: 0.12,
        env: { a: 0.004, d: 0.08, s: 0.3, hold: 0.02, r: 0.05 },
        gain: 0.4,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
