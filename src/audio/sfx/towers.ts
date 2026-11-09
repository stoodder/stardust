// Tower sounds: building, upgrading, selling, a new tower class, and each attack kind's shot.
// Everglow kit sounds like cheerful corporate hardware (design/towers.md § faction look).
import type { SfxRecipe } from '../types.ts';

export const TOWER_SFX = {
  /** A tower lands: a thunk, then a cheerful three-note startup chime (C–E–G). */
  build: {
    gain: 0.42,
    priority: 2,
    minGapMs: 50,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 900, freqEnd: 200 },
        env: { a: 0.002, d: 0.08, s: 0, r: 0.05 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: 110,
        glide: 0.5,
        glideSec: 0.08,
        env: { a: 0.002, d: 0.1, s: 0, r: 0.05 },
        gain: 0.7,
      },
      {
        wave: 'pulse25',
        at: 0.07,
        freq: 1046.5,
        steps: [
          [0.05, 1.26],
          [0.1, 1.498],
        ],
        env: { a: 0.002, d: 0.05, s: 0.6, hold: 0.1, r: 0.08 },
        gain: 0.35,
      },
    ],
  },
  /** An upgrade: a rising four-note arpeggio with a sparkle (pitched up a step per tier). */
  upgrade: {
    gain: 0.4,
    priority: 2,
    minGapMs: 60,
    layers: [
      {
        wave: 'square',
        freq: 523.25,
        filter: { type: 'lowpass', freq: 5000 },
        steps: [
          [0.05, 1.26],
          [0.1, 1.498],
          [0.15, 2],
        ],
        env: { a: 0.002, d: 0.05, s: 0.7, hold: 0.15, r: 0.12 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        freq: 261.63,
        steps: [
          [0.05, 1.26],
          [0.1, 1.498],
          [0.15, 2],
        ],
        env: { a: 0.002, d: 0.05, s: 0.7, hold: 0.15, r: 0.12 },
        gain: 0.5,
      },
      {
        wave: 'noise',
        at: 0.15,
        freq: 440,
        filter: { type: 'highpass', freq: 6000 },
        env: { a: 0.01, d: 0.2, s: 0, r: 0.05 },
        gain: 0.15,
      },
    ],
  },
  /** A sale: two bright register pings. */
  sell: {
    gain: 0.32,
    priority: 2,
    minGapMs: 60,
    layers: [
      {
        wave: 'pulse25',
        freq: 1568,
        env: { a: 0.002, d: 0.06, s: 0.3, hold: 0.02, r: 0.1 },
        gain: 0.5,
      },
      {
        wave: 'pulse25',
        at: 0.07,
        freq: 2093,
        env: { a: 0.002, d: 0.06, s: 0.3, hold: 0.04, r: 0.14 },
        gain: 0.5,
      },
    ],
  },
  /** A tower class unlocks ("New hardware!"): a quick major fanfare up two octaves. */
  unlock: {
    gain: 0.4,
    priority: 2,
    minGapMs: 500,
    duck: 0.6,
    layers: [
      {
        wave: 'pulse25',
        freq: 523.25,
        steps: [
          [0.07, 1.26],
          [0.14, 1.498],
          [0.21, 2],
          [0.28, 2.52],
        ],
        env: { a: 0.002, d: 0.04, s: 0.75, hold: 0.4, r: 0.2 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        freq: 261.63,
        steps: [
          [0.07, 1.26],
          [0.14, 1.498],
          [0.21, 2],
        ],
        env: { a: 0.002, d: 0.04, s: 0.8, hold: 0.4, r: 0.2 },
        gain: 0.5,
      },
    ],
  },
  /** Rivet's hitscan shot: a tiny crisp "tik". Rate-limited, so a stream reads as a rattle. */
  rivet_shot: {
    gain: 0.2,
    priority: 0,
    minGapMs: 70,
    maxVoices: 3,
    jitter: 0.6,
    layers: [
      {
        wave: 'pulse12',
        freq: 1400,
        glide: 0.35,
        glideSec: 0.05,
        env: { a: 0.001, d: 0.03, s: 0, r: 0.02 },
        gain: 0.6,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 3000 },
        env: { a: 0.001, d: 0.02, s: 0, r: 0.01 },
        gain: 0.3,
      },
    ],
  },
  /** Thumper launches a shell: a round "thoomp". */
  thumper_launch: {
    gain: 0.38,
    priority: 1,
    minGapMs: 90,
    maxVoices: 3,
    jitter: 0.5,
    layers: [
      {
        wave: 'sine',
        freq: 150,
        glide: 0.4,
        glideSec: 0.12,
        env: { a: 0.002, d: 0.12, s: 0, r: 0.05 },
        gain: 0.9,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 700 },
        env: { a: 0.002, d: 0.06, s: 0, r: 0.04 },
        gain: 0.35,
      },
    ],
  },
  /** A Thumper shell lands: a cartoon explosion with a low thump. */
  thumper_impact: {
    gain: 0.42,
    priority: 1,
    minGapMs: 60,
    maxVoices: 4,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 2200, freqEnd: 200 },
        env: { a: 0.002, d: 0.35, s: 0, r: 0.1 },
        gain: 0.8,
      },
      {
        wave: 'sine',
        freq: 75,
        glide: 0.5,
        glideSec: 0.25,
        env: { a: 0.002, d: 0.25, s: 0, r: 0.05 },
        gain: 0.8,
      },
    ],
  },
  /** Sprinkler's chill pulse: a cool spritz and a little icy chime. */
  sprinkler_pulse: {
    gain: 0.3,
    priority: 0,
    minGapMs: 120,
    maxVoices: 2,
    jitter: 0.4,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2600, freqEnd: 1200, q: 1.5 },
        env: { a: 0.02, d: 0.2, s: 0, r: 0.08 },
        gain: 0.7,
      },
      {
        wave: 'triangle',
        freq: 1760,
        vibrato: { hz: 9, cents: 25 },
        env: { a: 0.005, d: 0.15, s: 0, r: 0.1 },
        gain: 0.25,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
