// The Act I boss, Matriarch Chitterbloom (T314; design/enemies.md § 6, D073): a comic tuba as she
// arrives, her sneeze's 1.5 s tell ("ah... ah... AH") and the sneeze ("CHOO!"), the alarmed whoop
// of a phase change, and the scurry as she is driven off (`BossEnded`; the sting that follows is a
// music cue, `boss_sting`). Act I is laugh-out-loud funny: she's formidable, never frightening.
import type { SfxRecipe } from '../types.ts';

export const BOSS_SFX = {
  /** A boss takes the field (BossPhase 1): a big comic "BWOMP-bwomp" over a ground rumble. */
  boss_arrive: {
    gain: 0.45,
    priority: 3,
    minGapMs: 1000,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      {
        wave: 'sawtooth',
        freq: 87.31,
        steps: [[0.3, 0.944]],
        filter: { type: 'lowpass', freq: 600 },
        env: { a: 0.02, d: 0.1, s: 0.7, hold: 0.4, r: 0.2 },
        gain: 0.5,
      },
      {
        wave: 'square',
        freq: 174.61,
        steps: [[0.3, 0.944]],
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.02, d: 0.1, s: 0.6, hold: 0.4, r: 0.2 },
        gain: 0.25,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 220 },
        env: { a: 0.05, d: 0.5, s: 0, r: 0.2 },
        gain: 0.35,
      },
    ],
  },
  /**
   * The sneeze's tell (1.5 s, BOSS_ABILITY_TELL_SEC): three rising, wobbling inhales over a
   * building breath. It ends as the tell does, so the sneeze lands on the beat after.
   */
  sneeze_tell: {
    gain: 0.3,
    priority: 2,
    minGapMs: 1000,
    maxVoices: 1,
    layers: [
      ...[330, 392].map((freq, i) => ({
        wave: 'triangle' as const,
        at: i * 0.5,
        freq,
        glide: 1.2,
        glideSec: 0.3,
        vibrato: { hz: 6, cents: 25 },
        env: { a: 0.1, d: 0.2, s: 0.5, hold: 0.05, r: 0.08 },
        gain: 0.4,
      })),
      {
        wave: 'triangle',
        at: 0.95,
        freq: 466.16,
        glide: 1.3,
        glideSec: 0.35,
        vibrato: { hz: 7, cents: 30 },
        env: { a: 0.1, d: 0.25, s: 0.6, hold: 0.05, r: 0.08 },
        gain: 0.5,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 1200, freqEnd: 2400, q: 1.5 },
        env: { a: 0.3, d: 0.8, s: 0.4, hold: 0.2, r: 0.1 },
        gain: 0.2,
      },
    ],
  },
  /** The sneeze: a big, wet "CHOO!" with a thump (the young tumble out). */
  sneeze: {
    gain: 0.42,
    priority: 2,
    minGapMs: 500,
    maxVoices: 1,
    duck: 0.6,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2500, freqEnd: 600, q: 0.8 },
        env: { a: 0.003, d: 0.25, s: 0, r: 0.08 },
        gain: 0.65,
      },
      {
        wave: 'square',
        freq: 523.25,
        glide: 0.5,
        glideSec: 0.15,
        filter: { type: 'lowpass', freq: 2000 },
        env: { a: 0.002, d: 0.15, s: 0, r: 0.05 },
        gain: 0.3,
      },
      {
        wave: 'noise',
        at: 0.02,
        freq: 440,
        filter: { type: 'lowpass', freq: 300 },
        env: { a: 0.002, d: 0.12, s: 0, r: 0.05 },
        gain: 0.4,
      },
    ],
  },
  /** A new phase (BossPhase 2+, with its invulnerability): an alarmed "whoop-whoop" on a low gong. */
  boss_phase: {
    gain: 0.4,
    priority: 3,
    minGapMs: 500,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      ...[0, 0.22].map((at) => ({
        wave: 'square' as const,
        at,
        freq: 440,
        glide: 2,
        glideSec: 0.15,
        filter: { type: 'lowpass' as const, freq: 2500 },
        env: { a: 0.005, d: 0.05, s: 0.8, hold: 0.1, r: 0.05 },
        gain: 0.35,
      })),
      { wave: 'sine', freq: 98, env: { a: 0.002, d: 0.8, s: 0, r: 0.3 }, gain: 0.6 },
    ],
  },
  /** The boss is driven off (BossEnded): a skittering patter under a long falling whistle. */
  boss_retreat: {
    gain: 0.32,
    priority: 2,
    minGapMs: 1000,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 1200,
        glide: 0.25,
        glideSec: 0.8,
        env: { a: 0.01, d: 0.1, s: 0.7, hold: 0.6, r: 0.1 },
        gain: 0.4,
      },
      {
        wave: 'pulse12',
        freq: 1500,
        steps: [
          [0.08, 1.3],
          [0.16, 1],
          [0.24, 1.3],
          [0.32, 1],
          [0.4, 1.3],
          [0.48, 1],
          [0.56, 1.3],
          [0.64, 1],
        ],
        filter: { type: 'highpass', freq: 1200 },
        env: { a: 0.005, d: 0.1, s: 0.5, hold: 0.55, r: 0.1 },
        gain: 0.3,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
