// Battle sounds: enemy deaths, leaks and the low-integrity alarm, the wave cues, and the Orbital
// Strike (its 1 s charge under the reticle, then the beam and the boom as the zone lands; D022).
// Act I deaths are a comic "pop" (research/emotional-storytelling.md's death-tone ramp).
import type { SfxRecipe } from '../types.ts';

export const BATTLE_SFX = {
  /** An enemy dies: a bouncy cartoon pop with a confetti crackle. Pitched per enemy type. */
  enemy_pop: {
    gain: 0.3,
    priority: 1,
    minGapMs: 35,
    maxVoices: 4,
    jitter: 1.5,
    layers: [
      {
        wave: 'square',
        freq: 520,
        glide: 2.2,
        glideSec: 0.05,
        filter: { type: 'lowpass', freq: 4000 },
        env: { a: 0.001, d: 0.05, s: 0, r: 0.03 },
        gain: 0.6,
      },
      {
        wave: 'noise',
        at: 0.02,
        freq: 440,
        filter: { type: 'highpass', freq: 2500 },
        env: { a: 0.001, d: 0.04, s: 0, r: 0.02 },
        gain: 0.3,
      },
    ],
  },
  /**
   * A carrier's sack bursts (the Brood Hauler, SackBurst): a wet, low "plop" under a glitter
   * sparkle, after its death pop.
   */
  sack_pop: {
    // +4 dB over T210a's 0.3 (D059): the burst is a moment, so it's heard over the wave.
    gain: 0.475,
    priority: 1,
    minGapMs: 120,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'sine',
        freq: 180,
        glide: 0.45,
        glideSec: 0.12,
        env: { a: 0.002, d: 0.12, s: 0, r: 0.05 },
        gain: 0.7,
      },
      {
        wave: 'noise',
        freq: 300,
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.002, d: 0.08, s: 0, r: 0.04 },
        gain: 0.35,
      },
      {
        wave: 'noise',
        at: 0.06,
        freq: 440,
        filter: { type: 'highpass', freq: 6000 },
        env: { a: 0.005, d: 0.25, s: 0, r: 0.1 },
        gain: 0.15,
      },
    ],
  },
  /** A leak at the core: a clear two-tone alarm the player can't miss. */
  leak: {
    gain: 0.42,
    priority: 3,
    minGapMs: 250,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      {
        wave: 'square',
        freq: 880,
        filter: { type: 'lowpass', freq: 3000 },
        steps: [
          [0.12, 0.75],
          [0.24, 1],
          [0.36, 0.75],
        ],
        env: { a: 0.005, d: 0.02, s: 0.9, hold: 0.42, r: 0.08 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: 440,
        steps: [
          [0.12, 0.75],
          [0.24, 1],
          [0.36, 0.75],
        ],
        env: { a: 0.005, d: 0.02, s: 0.9, hold: 0.42, r: 0.08 },
        gain: 0.5,
      },
    ],
  },
  /** Integrity dropped to the alarm line (5): three klaxon pulses. */
  low_integrity: {
    gain: 0.36,
    priority: 3,
    minGapMs: 2000,
    maxVoices: 1,
    duck: 0.45,
    layers: [0, 0.3, 0.6].map((at) => ({
      wave: 'sawtooth' as const,
      at,
      freq: 330,
      glide: 1.06,
      glideSec: 0.2,
      filter: { type: 'lowpass' as const, freq: 1400 },
      env: { a: 0.01, d: 0.05, s: 0.9, hold: 0.15, r: 0.05 },
      gain: 0.55,
    })),
  },
  /** A wave starts: a two-voice horn on a fifth, with a scoop up into the note. */
  wave_start: {
    gain: 0.38,
    priority: 2,
    minGapMs: 300,
    duck: 0.6,
    layers: [
      {
        wave: 'square',
        freq: 392,
        steps: [[0.06, 1.0595]],
        filter: { type: 'lowpass', freq: 2400 },
        env: { a: 0.02, d: 0.1, s: 0.7, hold: 0.25, r: 0.2 },
        gain: 0.45,
      },
      {
        wave: 'square',
        freq: 587.33,
        steps: [[0.06, 1.0595]],
        filter: { type: 'lowpass', freq: 2400 },
        env: { a: 0.02, d: 0.1, s: 0.7, hold: 0.25, r: 0.2 },
        gain: 0.35,
      },
    ],
  },
  /** The next wave called early: a whoosh, then the bonus "ding-ding". */
  wave_call: {
    gain: 0.36,
    priority: 2,
    minGapMs: 300,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 800, freqEnd: 4000, q: 1.2 },
        env: { a: 0.1, d: 0.1, s: 0, r: 0.05 },
        gain: 0.5,
      },
      {
        wave: 'pulse25',
        at: 0.14,
        freq: 1318.5,
        steps: [[0.07, 1.498]],
        env: { a: 0.002, d: 0.08, s: 0.5, hold: 0.06, r: 0.12 },
        gain: 0.45,
      },
    ],
  },
  /** One second of the last three before a wave: a short tick (the last one pitched up). */
  countdown_tick: {
    gain: 0.28,
    priority: 2,
    minGapMs: 300,
    layers: [
      { wave: 'pulse25', freq: 1046.5, env: { a: 0.001, d: 0.04, s: 0, r: 0.02 }, gain: 0.6 },
    ],
  },
  /** Orbital Strike: the uplink charges under the 1 s reticle, a rising whine. */
  strike_charge: {
    gain: 0.28,
    priority: 2,
    maxVoices: 2,
    layers: [
      {
        wave: 'sawtooth',
        freq: 220,
        glide: 4,
        glideSec: 1,
        vibrato: { hz: 8, cents: 30 },
        filter: { type: 'lowpass', freq: 1200, freqEnd: 4000 },
        env: { a: 0.05, d: 0.3, s: 0.8, hold: 0.62, r: 0.05 },
        gain: 0.5,
      },
      {
        wave: 'pulse12',
        freq: 440,
        glide: 4,
        glideSec: 1,
        env: { a: 0.05, d: 0.3, s: 0.8, hold: 0.62, r: 0.05 },
        gain: 0.25,
      },
    ],
  },
  /** Orbital Strike: the beam (it lands with the zone). */
  strike_beam: {
    gain: 0.36,
    priority: 3,
    maxVoices: 2,
    layers: [
      {
        wave: 'square',
        freq: 2000,
        glide: 0.1,
        glideSec: 0.2,
        filter: { type: 'lowpass', freq: 6000 },
        env: { a: 0.001, d: 0.2, s: 0, r: 0.02 },
        gain: 0.5,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 4000 },
        env: { a: 0.001, d: 0.15, s: 0, r: 0.05 },
        gain: 0.4,
      },
    ],
  },
  /** Orbital Strike: the boom under the beam. */
  strike_boom: {
    gain: 0.5,
    priority: 3,
    maxVoices: 2,
    duck: 0.35,
    layers: [
      {
        wave: 'noise',
        at: 0.03,
        freq: 440,
        filter: { type: 'lowpass', freq: 3000, freqEnd: 150 },
        env: { a: 0.002, d: 0.6, s: 0, r: 0.2 },
        gain: 0.9,
      },
      {
        wave: 'sine',
        at: 0.03,
        freq: 60,
        glide: 0.5,
        glideSec: 0.5,
        env: { a: 0.002, d: 0.5, s: 0, r: 0.1 },
        gain: 0.9,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
