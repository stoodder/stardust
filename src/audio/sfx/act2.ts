// Act II's other sounds (T450): detection (a cloaked unit's muffled footsteps while it's hidden, a
// sonar ping as one is Revealed, Scanner Sweep's wide ping), Stasis (Flash Freeze's burst and the
// crystal lock of a freeze), the M4 tower specs' own voices (the Capacitor Bank's rising hum as it
// charges and its discharge, the Seeker Swarm's volley), the rigs taking a leak (`AssetHit`), a
// retry checkpoint, and the Tidybots' cheerful chime as they finish a sweep (it never stops being
// cheerful; A2M4's QUILL: "I used to think the chime was cheerful.").
import type { SfxRecipe } from '../types.ts';

export const ACT2_SFX = {
  /**
   * A cloaked unit's footsteps while it's hidden (design/enemies.md § 3: "footsteps sound"): two
   * soft, muffled pads, a loop while anything hidden walks (one voice however many).
   */
  cloak_steps: {
    gain: 0.2,
    priority: 0,
    minGapMs: 250,
    maxVoices: 1,
    jitter: 1.5,
    layers: [0, 0.18].map((at) => ({
      wave: 'noise' as const,
      at,
      freq: 440,
      filter: { type: 'lowpass' as const, freq: 500, q: 1.5 },
      env: { a: 0.004, d: 0.05, s: 0, r: 0.03 },
      gain: 0.6,
    })),
  },
  /** A cloaked unit is Revealed (Revealed): a short sonar "ping" with a thin echo. */
  reveal_ping: {
    gain: 0.26,
    priority: 1,
    minGapMs: 150,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 1760,
        env: { a: 0.002, d: 0.12, s: 0.2, hold: 0.02, r: 0.12 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        at: 0.16,
        freq: 1760,
        env: { a: 0.002, d: 0.1, s: 0.1, r: 0.1 },
        gain: 0.18,
      },
    ],
  },
  /**
   * Scanner Sweep (the ability's cast): a wide sonar sweep, a falling "whoom" under two pings,
   * the second an echo of the first.
   */
  scan_ping: {
    gain: 0.32,
    priority: 2,
    minGapMs: 300,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 3000, freqEnd: 500, q: 3 },
        env: { a: 0.01, d: 0.45, s: 0, r: 0.1 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        freq: 1318.5,
        env: { a: 0.002, d: 0.25, s: 0.2, hold: 0.05, r: 0.2 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        at: 0.3,
        freq: 1318.5,
        env: { a: 0.002, d: 0.2, s: 0.1, r: 0.15 },
        gain: 0.22,
      },
      {
        wave: 'sine',
        at: 0.55,
        freq: 1318.5,
        env: { a: 0.002, d: 0.15, s: 0, r: 0.1 },
        gain: 0.1,
      },
    ],
  },
  /**
   * Flash Freeze's burst (PulseBurst): a cold "hsss" of frost blowing out with a crackle of ice.
   */
  frost_burst: {
    gain: 0.3,
    priority: 1,
    minGapMs: 200,
    maxVoices: 2,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 3000, freqEnd: 6000 },
        env: { a: 0.01, d: 0.3, s: 0, r: 0.1 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: 2093,
        steps: [
          [0.03, 1.5],
          [0.06, 1.12],
          [0.09, 1.68],
        ],
        env: { a: 0.002, d: 0.12, s: 0, r: 0.05 },
        gain: 0.3,
      },
    ],
  },
  /**
   * Units locked in Stasis (PulseBurst with `frozen` > 0): a crystal "clink" settling into a held,
   * glassy ring, the sound of time stopping.
   */
  stasis_lock: {
    gain: 0.28,
    priority: 2,
    minGapMs: 200,
    maxVoices: 2,
    layers: [
      {
        wave: 'triangle',
        freq: 2637,
        env: { a: 0.001, d: 0.05, s: 0, r: 0.03 },
        gain: 0.4,
      },
      {
        wave: 'sine',
        at: 0.03,
        freq: 1174.66,
        vibrato: { hz: 12, cents: 6 },
        env: { a: 0.005, d: 0.15, s: 0.5, hold: 0.35, r: 0.3 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        at: 0.03,
        freq: 1760,
        env: { a: 0.005, d: 0.15, s: 0.4, hold: 0.35, r: 0.3 },
        gain: 0.2,
      },
    ],
  },
  /**
   * A Capacitor Bank charging (fieldSounds.ts plays it at each quarter of the charge, pitched up
   * a step each time): an electric hum rising to a whine.
   */
  capacitor_hum: {
    gain: 0.2,
    priority: 1,
    minGapMs: 100,
    maxVoices: 2,
    layers: [
      {
        wave: 'sawtooth',
        freq: 110,
        glide: 1.12,
        glideSec: 0.4,
        filter: { type: 'lowpass', freq: 900, freqEnd: 1600 },
        env: { a: 0.05, d: 0.15, s: 0.7, hold: 0.15, r: 0.15 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        freq: 880,
        glide: 1.12,
        glideSec: 0.4,
        vibrato: { hz: 14, cents: 15 },
        env: { a: 0.05, d: 0.15, s: 0.6, hold: 0.15, r: 0.15 },
        gain: 0.25,
      },
    ],
  },
  /**
   * The Capacitor Bank's discharge (its charge attack fires): a heavy crack, a bright arc, and a
   * low thump as the splash lands; louder and longer than a Zapcoil's arc.
   */
  capacitor_discharge: {
    gain: 0.36,
    priority: 2,
    minGapMs: 120,
    maxVoices: 2,
    jitter: 0.5,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 3500, freqEnd: 900, q: 0.9 },
        env: { a: 0.001, d: 0.2, s: 0, r: 0.06 },
        gain: 0.5,
      },
      {
        wave: 'sawtooth',
        freq: 1600,
        glide: 0.2,
        glideSec: 0.15,
        steps: [
          [0.03, 1.4],
          [0.06, 0.9],
          [0.09, 1.2],
        ],
        filter: { type: 'lowpass', freq: 5000 },
        env: { a: 0.001, d: 0.15, s: 0, r: 0.05 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        at: 0.02,
        freq: 90,
        glide: 0.5,
        glideSec: 0.25,
        env: { a: 0.002, d: 0.25, s: 0, r: 0.08 },
        gain: 0.5,
      },
    ],
  },
  /**
   * A Seeker Swarm volley (four homing missiles leave at once): four quick rising "fssht"s, one
   * sound per volley (the gap merges the four shots' events into it).
   */
  seeker_launch: {
    gain: 0.26,
    priority: 1,
    minGapMs: 400,
    maxVoices: 1,
    jitter: 0.5,
    layers: [0, 0.05, 0.1, 0.15].map((at, i) => ({
      wave: 'noise' as const,
      at,
      freq: 440,
      filter: {
        type: 'bandpass' as const,
        freq: 900 + i * 150,
        freqEnd: 4000 + i * 300,
        q: 2,
      },
      env: { a: 0.005, d: 0.08, s: 0, r: 0.04 },
      gain: 0.55,
    })),
  },
  /**
   * A leak hits the Protect map's asset (AssetHit; A2M2's rigs): a metal clang under a short
   * two-tone warning, below the core's leak alarm so the two never read as one.
   */
  asset_hit: {
    gain: 0.36,
    priority: 3,
    minGapMs: 250,
    maxVoices: 1,
    duck: 0.6,
    layers: [
      {
        wave: 'square',
        freq: 233.08,
        filter: { type: 'lowpass', freq: 2500 },
        env: { a: 0.001, d: 0.3, s: 0, r: 0.15 },
        gain: 0.4,
      },
      {
        wave: 'triangle',
        freq: 622.25,
        env: { a: 0.001, d: 0.35, s: 0, r: 0.15 },
        gain: 0.3,
      },
      {
        wave: 'pulse25',
        at: 0.12,
        freq: 659.25,
        steps: [[0.12, 0.84]],
        filter: { type: 'lowpass', freq: 3000 },
        env: { a: 0.005, d: 0.02, s: 0.8, hold: 0.18, r: 0.06 },
        gain: 0.35,
      },
    ],
  },
  /**
   * A retry checkpoint is reached (CheckpointReached; the HUD's "Checkpoint" cue): a soft,
   * reassuring two-note "saved", never a fanfare.
   */
  checkpoint: {
    gain: 0.28,
    priority: 2,
    minGapMs: 1000,
    maxVoices: 1,
    layers: [
      {
        wave: 'triangle',
        freq: 783.99,
        env: { a: 0.005, d: 0.12, s: 0.4, hold: 0.06, r: 0.15 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        at: 0.13,
        freq: 1046.5,
        env: { a: 0.005, d: 0.15, s: 0.4, hold: 0.1, r: 0.25 },
        gain: 0.5,
      },
    ],
  },
  /**
   * A Tidybot finishes its sweep (its chime phase, render/vfx/tidybotFlight.ts): a cheerful
   * little bell, "ding-dong!", Everglow-bright in every act it flies in.
   */
  tidybot_chime: {
    gain: 0.24,
    priority: 1,
    minGapMs: 120,
    maxVoices: 2,
    layers: [
      {
        wave: 'pulse25',
        freq: 1567.98,
        env: { a: 0.002, d: 0.1, s: 0.3, hold: 0.04, r: 0.12 },
        gain: 0.4,
      },
      {
        wave: 'sine',
        freq: 3135.96,
        env: { a: 0.002, d: 0.08, s: 0, r: 0.05 },
        gain: 0.2,
      },
      {
        wave: 'pulse25',
        at: 0.14,
        freq: 1318.51,
        env: { a: 0.002, d: 0.12, s: 0.3, hold: 0.06, r: 0.18 },
        gain: 0.4,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
