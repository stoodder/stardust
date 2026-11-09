// Act I's new shots and hits (T314): the Skyhook's flak (a steep "thoonk" up, an airburst where it
// meets the flock; D072), the Zapcoil's arc and the crackle of each jump (D076), and the two
// "wrong tool" plinks (design/core-loop.md § 5: a hit armor blunts, `ProjectileHit.reduced`, D069;
// and a hit that does nothing at all, a boss between phases or a shield, D073). All are frequent,
// so all are short, quiet, and rate-limited.
import type { SfxRecipe } from '../types.ts';

export const HIT_SFX = {
  /** A Skyhook fires: a steep, hollow "thoonk" up with a puff of breech smoke. */
  flak_fire: {
    gain: 0.3,
    priority: 1,
    minGapMs: 70,
    maxVoices: 3,
    jitter: 1,
    layers: [
      {
        wave: 'square',
        freq: 220,
        glide: 1.8,
        glideSec: 0.06,
        filter: { type: 'lowpass', freq: 1800 },
        env: { a: 0.001, d: 0.06, s: 0, r: 0.03 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 1200, q: 1.5 },
        env: { a: 0.001, d: 0.05, s: 0, r: 0.02 },
        gain: 0.3,
      },
    ],
  },
  /** Flak bursts at its intercept point: a soft airburst "puff-crack" with a glitter of shrapnel. */
  flak_burst: {
    gain: 0.28,
    priority: 1,
    minGapMs: 50,
    maxVoices: 3,
    jitter: 1.5,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 2500, freqEnd: 400 },
        env: { a: 0.001, d: 0.1, s: 0, r: 0.03 },
        gain: 0.55,
      },
      {
        wave: 'square',
        freq: 160,
        glide: 0.5,
        glideSec: 0.08,
        filter: { type: 'lowpass', freq: 1200 },
        env: { a: 0.001, d: 0.08, s: 0, r: 0.03 },
        gain: 0.3,
      },
      {
        wave: 'noise',
        at: 0.03,
        freq: 440,
        filter: { type: 'highpass', freq: 5000 },
        env: { a: 0.001, d: 0.05, s: 0, r: 0.03 },
        gain: 0.15,
      },
    ],
  },
  /** A Zapcoil fires: a bright, buzzing arc snapping onto its first target. */
  zap_arc: {
    gain: 0.26,
    priority: 1,
    minGapMs: 60,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'sawtooth',
        freq: 1800,
        glide: 0.4,
        glideSec: 0.05,
        filter: { type: 'bandpass', freq: 3000, q: 2 },
        env: { a: 0.001, d: 0.05, s: 0.2, hold: 0.02, r: 0.03 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 3500 },
        env: { a: 0.001, d: 0.06, s: 0, r: 0.03 },
        gain: 0.35,
      },
    ],
  },
  /** One jump of the arc to the next pest: a tiny crackle, pitched up a step per jump. */
  zap_jump: {
    gain: 0.22,
    priority: 1,
    minGapMs: 35,
    maxVoices: 3,
    layers: [
      {
        wave: 'square',
        freq: 1400,
        glide: 0.6,
        glideSec: 0.03,
        filter: { type: 'highpass', freq: 1000 },
        env: { a: 0.001, d: 0.03, s: 0, r: 0.015 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 5000, q: 2 },
        env: { a: 0.001, d: 0.025, s: 0, r: 0.01 },
        gain: 0.3,
      },
    ],
  },
  /** Armor blunted a hit: a thin metallic "tink", the "wrong tool" tell. */
  armor_plink: {
    gain: 0.2,
    priority: 1,
    minGapMs: 90,
    maxVoices: 2,
    jitter: 0.7,
    layers: [
      { wave: 'triangle', freq: 2637, env: { a: 0.001, d: 0.05, s: 0, r: 0.04 }, gain: 0.5 },
      { wave: 'sine', freq: 3951, env: { a: 0.001, d: 0.03, s: 0, r: 0.03 }, gain: 0.3 },
      {
        wave: 'square',
        freq: 1975.5,
        filter: { type: 'highpass', freq: 2000 },
        env: { a: 0.001, d: 0.015, s: 0, r: 0.01 },
        gain: 0.2,
      },
    ],
  },
  /**
   * A hit that did nothing (a boss between phases, a shield that took it all): a hollow "tunk-tink"
   * that bounces off, lower and emptier than the armor plink.
   */
  invuln_plink: {
    gain: 0.24,
    priority: 1,
    minGapMs: 80,
    maxVoices: 2,
    jitter: 0.5,
    layers: [
      {
        wave: 'triangle',
        freq: 1760,
        steps: [[0.03, 1.5]],
        env: { a: 0.001, d: 0.06, s: 0, r: 0.04 },
        gain: 0.5,
      },
      { wave: 'sine', freq: 880, env: { a: 0.001, d: 0.05, s: 0, r: 0.03 }, gain: 0.3 },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
