// Radio blips: as each radio line appears, a squelch and a short chirp in the speaker's register
// (story/characters.md): QUILL bright and quick, Bricks low and gruff, Goldie warm and mid.
import type { RadioSpeaker } from '../../content/radio/types.ts';
import type { SfxRecipe, ToneLayer } from '../types.ts';

/** The open-mic squelch every blip starts with. */
const SQUELCH: ToneLayer = {
  wave: 'noise',
  freq: 440,
  filter: { type: 'bandpass', freq: 1800, q: 2 },
  env: { a: 0.002, d: 0.04, s: 0, r: 0.02 },
  gain: 0.3,
};

export const RADIO_SFX = {
  /** QUILL: two bright rising chirps. */
  radio_quill: {
    gain: 0.3,
    priority: 2,
    minGapMs: 200,
    maxVoices: 1,
    layers: [
      SQUELCH,
      {
        wave: 'pulse25',
        at: 0.04,
        freq: 1568,
        glide: 1.33,
        glideSec: 0.04,
        env: { a: 0.002, d: 0.04, s: 0, r: 0.02 },
        gain: 0.5,
      },
      {
        wave: 'pulse25',
        at: 0.11,
        freq: 1760,
        glide: 1.33,
        glideSec: 0.04,
        env: { a: 0.002, d: 0.05, s: 0, r: 0.03 },
        gain: 0.5,
      },
    ],
  },
  /** Bricks: one low, unimpressed "hm". */
  radio_bricks: {
    gain: 0.32,
    priority: 2,
    minGapMs: 200,
    maxVoices: 1,
    layers: [
      SQUELCH,
      {
        wave: 'triangle',
        at: 0.04,
        freq: 147,
        glide: 0.9,
        glideSec: 0.15,
        env: { a: 0.01, d: 0.08, s: 0.5, hold: 0.06, r: 0.06 },
        gain: 0.7,
      },
      {
        wave: 'square',
        at: 0.04,
        freq: 147,
        glide: 0.9,
        glideSec: 0.15,
        filter: { type: 'lowpass', freq: 600 },
        env: { a: 0.01, d: 0.08, s: 0.5, hold: 0.06, r: 0.06 },
        gain: 0.3,
      },
    ],
  },
  /** Goldie: a warm two-note lilt. */
  radio_goldie: {
    gain: 0.32,
    priority: 2,
    minGapMs: 200,
    maxVoices: 1,
    layers: [
      SQUELCH,
      {
        wave: 'triangle',
        at: 0.04,
        freq: 523.25,
        steps: [[0.07, 1.19]],
        env: { a: 0.004, d: 0.05, s: 0.5, hold: 0.06, r: 0.06 },
        gain: 0.6,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;

/** Each radio speaker's blip. */
export const RADIO_BLIP: Readonly<Record<RadioSpeaker, keyof typeof RADIO_SFX>> = {
  quill: 'radio_quill',
  bricks: 'radio_bricks',
  goldie: 'radio_goldie',
};
