// Ally and companion sounds (T207b): Sgt. Bricks at his post (his rivet cannon readied as the map
// opens, and each shot: a deeper, chunkier "tunk" than a Rivet turret's "tik", so his fire reads as
// a person's, not a tower's) and his Suppressing Fire (a rattling burst as it's called in).
import type { SfxRecipe } from '../types.ts';

export const ALLY_SFX = {
  /** Bricks readies his cannon at his post (AllySpawned): a two-click "ka-chunk". */
  bricks_ready: {
    gain: 0.3,
    priority: 1,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2200, q: 2 },
        env: { a: 0.001, d: 0.03, s: 0, r: 0.02 },
        gain: 0.5,
      },
      {
        wave: 'noise',
        at: 0.09,
        freq: 440,
        filter: { type: 'bandpass', freq: 1200, q: 2 },
        env: { a: 0.001, d: 0.05, s: 0, r: 0.03 },
        gain: 0.6,
      },
      {
        wave: 'square',
        at: 0.09,
        freq: 140,
        glide: 0.7,
        glideSec: 0.06,
        filter: { type: 'lowpass', freq: 1500 },
        env: { a: 0.001, d: 0.06, s: 0, r: 0.03 },
        gain: 0.35,
      },
    ],
  },
  /** One shot of Bricks's rivet cannon (AllyAttacked): a chunky "tunk". Rate-limited. */
  bricks_shot: {
    gain: 0.22,
    priority: 0,
    minGapMs: 80,
    maxVoices: 2,
    jitter: 0.5,
    layers: [
      {
        wave: 'pulse25',
        freq: 620,
        glide: 0.4,
        glideSec: 0.06,
        filter: { type: 'lowpass', freq: 3500 },
        env: { a: 0.001, d: 0.05, s: 0, r: 0.03 },
        gain: 0.6,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 2500 },
        env: { a: 0.001, d: 0.04, s: 0, r: 0.02 },
        gain: 0.35,
      },
    ],
  },
  /** Suppressing Fire is called in: a four-round rattle, "brrrt". */
  suppress_burst: {
    gain: 0.4,
    priority: 2,
    maxVoices: 2,
    layers: [0, 0.065, 0.13, 0.195].map((at) => ({
      wave: 'noise' as const,
      at,
      freq: 440,
      filter: { type: 'bandpass' as const, freq: 1800, q: 1.2 },
      env: { a: 0.001, d: 0.04, s: 0, r: 0.02 },
      gain: 0.24,
    })),
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
