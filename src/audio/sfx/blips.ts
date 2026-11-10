// Speaker blips (T314; story-runtime.md § Dialogue in play): as a line starts, a short chirp in its
// speaker's voice (story/characters.md), one per `blip.<speaker>` in content/dialogue/speakers.ts,
// and the typewriter's soft per-character tick (`type_tick`, pitched per speaker by
// audio/speech.ts). Comms voices open with the radio's squelch; voices in the room (Pebble, Thrum,
// Bramble, Ves'thara) don't. Speakers with no blip in speakers.ts type silently.
import type { SPEAKERS } from '../../content/dialogue/speakers.ts';
import type { SpeakerId } from '../../content/dialogue/types.ts';
import type { SfxRecipe, ToneLayer } from '../types.ts';

/** Every blip id speakers.ts names. */
export type SpeakerBlipId = NonNullable<(typeof SPEAKERS)[SpeakerId]['blip']>;

/** The open-mic squelch a comms blip starts with. */
const SQUELCH: ToneLayer = {
  wave: 'noise',
  freq: 440,
  filter: { type: 'bandpass', freq: 1800, q: 2 },
  env: { a: 0.002, d: 0.04, s: 0, r: 0.02 },
  gain: 0.3,
};

/**
 * One blip per line start, at most: a new line cuts the last one's tail. Priority 3 (R10): a
 * storm of shots and pops can never steal a line's first sound.
 */
const VOICE = { priority: 3, minGapMs: 200, maxVoices: 1 } as const;

/**
 * Every blip sits 5 dB under D134's one level (its loudest 50 ms ≈ −17.5 dBFS RMS before the
 * limiter, which each recipe's own gain below still evens out to): a lone blip stays well under the
 * strike's boom, and the line-start dip under it (synth.ts LINE_DIP) keeps it ≥ 6 dB over a storm.
 */
const SIT_BACK = 10 ** (-5 / 20);

export const BLIP_SFX = {
  /** The Technician: an even, unhurried two-note "mm-hm" (they rarely speak unprompted). */
  'blip.player': {
    ...VOICE,
    gain: SIT_BACK,
    layers: [
      SQUELCH,
      {
        wave: 'triangle',
        at: 0.04,
        freq: 659.25,
        steps: [[0.07, 1.335]],
        env: { a: 0.004, d: 0.05, s: 0.5, hold: 0.06, r: 0.05 },
        gain: 0.65,
      },
    ],
  },
  /** QUILL: two bright rising chirps, eager and precise. */
  'blip.quill': {
    ...VOICE,
    gain: SIT_BACK,
    layers: [
      SQUELCH,
      ...[1568, 1760].map((freq, i) => ({
        wave: 'pulse25' as const,
        at: 0.04 + i * 0.07,
        freq,
        glide: 1.33,
        glideSec: 0.04,
        env: { a: 0.002, d: 0.025, s: 0.8, hold: 0.02 + i * 0.01, r: 0.02 },
        gain: 0.7,
      })),
    ],
  },
  /** Bricks: one low, unimpressed "hm". */
  'blip.bricks': {
    ...VOICE,
    gain: SIT_BACK * 0.54,
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
  /** Goldie: a warm, quick two-note lilt. */
  'blip.goldie': {
    ...VOICE,
    gain: SIT_BACK,
    layers: [
      SQUELCH,
      {
        wave: 'triangle',
        at: 0.04,
        freq: 523.25,
        steps: [[0.07, 1.19]],
        env: { a: 0.004, d: 0.05, s: 0.5, hold: 0.06, r: 0.06 },
        gain: 0.66,
      },
    ],
  },
  /**
   * Kip (his own at last; he borrowed Goldie's): a cocky upward slide, then a "ding" wink off his
   * #1 pin. Breezy trash talk in two notes.
   */
  'blip.kip': {
    ...VOICE,
    gain: SIT_BACK,
    layers: [
      SQUELCH,
      {
        wave: 'pulse25',
        at: 0.04,
        freq: 587.33,
        glide: 1.5,
        glideSec: 0.07,
        filter: { type: 'lowpass', freq: 3500 },
        env: { a: 0.003, d: 0.06, s: 0.5, hold: 0.03, r: 0.04 },
        gain: 0.7,
      },
      {
        wave: 'pulse12',
        at: 0.16,
        freq: 1760,
        env: { a: 0.001, d: 0.04, s: 0, r: 0.03 },
        gain: 0.3,
      },
    ],
  },
  /** Sterling: a sparkly major "ding-ding-ding!" (exclamation points, all of them). */
  'blip.sterling': {
    ...VOICE,
    gain: SIT_BACK * 0.93,
    layers: [
      SQUELCH,
      ...[1046.5, 2093].map((freq, i) => ({
        wave: i === 0 ? ('sine' as const) : ('triangle' as const),
        at: 0.04,
        freq,
        steps: [
          [0.05, 1.26],
          [0.1, 1.498],
        ] as const,
        env: { a: 0.002, d: 0.06, s: 0.6, hold: 0.1, r: 0.08 },
        gain: i === 0 ? 0.5 : 0.2,
      })),
    ],
  },
  /** Zibzab: a nasal merchant's buzz, then the clink of a coin. Price first. */
  'blip.zibzab': {
    ...VOICE,
    gain: SIT_BACK,
    layers: [
      SQUELCH,
      {
        wave: 'pulse12',
        at: 0.065,
        freq: 311.13,
        glide: 0.94,
        glideSec: 0.12,
        vibrato: { hz: 14, cents: 40 },
        filter: { type: 'lowpass', freq: 2500 },
        env: { a: 0.005, d: 0.06, s: 0.8, hold: 0.08, r: 0.05 },
        gain: 0.9,
      },
      { wave: 'sine', at: 0.27, freq: 2637, env: { a: 0.001, d: 0.05, s: 0, r: 0.04 }, gain: 0.3 },
    ],
  },
  /**
   * Ves'thara: struck glass, then a glassy fifth, formal and unhurried, and a loose strand a hair
   * flat beating against it (the cut thread at her collar, out of tune; story/characters.md).
   */
  'blip.vesthara': {
    ...VOICE,
    gain: SIT_BACK * 0.79,
    layers: [
      // The strike: glass's inharmonic partial (2.76 × the root) rings off first.
      { wave: 'sine', freq: 2428.8, env: { a: 0.001, d: 0.12, s: 0, r: 0.08 }, gain: 0.18 },
      {
        wave: 'sine',
        freq: 880,
        vibrato: { hz: 4, cents: 6 },
        env: { a: 0.04, d: 0.12, s: 0.6, hold: 0.1, r: 0.16 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        at: 0.03,
        freq: 1318.5,
        env: { a: 0.04, d: 0.12, s: 0.5, hold: 0.08, r: 0.16 },
        gain: 0.3,
      },
      // The cut thread: 11 cents under the fifth, so the two beat slowly.
      {
        wave: 'triangle',
        at: 0.06,
        freq: 1310.1,
        env: { a: 0.05, d: 0.1, s: 0.4, hold: 0.05, r: 0.14 },
        gain: 0.12,
      },
    ],
  },
  /**
   * Pebble: the Peeker's "eep!" made small (she was the Peeker, so her voice is its kin): a tiny
   * rising squeak, then a chirp falling away, higher and quicker than `peeker_squeak`.
   */
  'blip.pebble': {
    ...VOICE,
    gain: SIT_BACK,
    layers: [
      {
        wave: 'triangle',
        freq: 1396.91,
        glide: 1.5,
        glideSec: 0.05,
        env: { a: 0.003, d: 0.05, s: 0, r: 0.02 },
        gain: 1,
      },
      {
        wave: 'triangle',
        at: 0.075,
        freq: 2093,
        glide: 0.75,
        glideSec: 0.05,
        env: { a: 0.002, d: 0.05, s: 0, r: 0.02 },
        gain: 0.72,
      },
    ],
  },
  /** Old Thrum: a slow, low, warm hum with a faint glass overtone (Ves'thara translates). */
  'blip.thrum': {
    ...VOICE,
    gain: SIT_BACK * 0.67,
    layers: [
      {
        wave: 'sine',
        freq: 196,
        glide: 0.92,
        glideSec: 0.3,
        vibrato: { hz: 4, cents: 15 },
        env: { a: 0.04, d: 0.12, s: 0.6, hold: 0.12, r: 0.15 },
        gain: 0.6,
      },
      {
        wave: 'triangle',
        freq: 392,
        glide: 0.92,
        glideSec: 0.3,
        env: { a: 0.04, d: 0.1, s: 0.4, hold: 0.1, r: 0.12 },
        gain: 0.25,
      },
      { wave: 'sine', at: 0.05, freq: 1568, env: { a: 0.02, d: 0.1, s: 0, r: 0.08 }, gain: 0.1 },
    ],
  },
  /** Bramble (Chitterbloom): a low, dryly unimpressed "hmph" between two chitters. */
  'blip.chitterbloom': {
    ...VOICE,
    gain: SIT_BACK,
    layers: [
      {
        wave: 'sawtooth',
        freq: 130.81,
        glide: 0.85,
        glideSec: 0.2,
        filter: { type: 'lowpass', freq: 700 },
        env: { a: 0.01, d: 0.1, s: 0.5, hold: 0.08, r: 0.08 },
        gain: 0.53,
      },
      ...[0, 0.09].map((at) => ({
        wave: 'noise' as const,
        at,
        freq: 440,
        filter: { type: 'bandpass' as const, freq: 3000, q: 3 },
        env: { a: 0.002, d: 0.03, s: 0, r: 0.02 },
        gain: 0.25,
      })),
    ],
  },
  /** Compliance Officer Prim: two flat, identical beeps. Polite. Relentless. */
  'blip.prim': {
    ...VOICE,
    gain: SIT_BACK * 0.97,
    layers: [
      SQUELCH,
      ...[0.04, 0.15].map((at) => ({
        wave: 'square' as const,
        at,
        freq: 880,
        filter: { type: 'lowpass' as const, freq: 2500 },
        env: { a: 0.002, d: 0.03, s: 0.8, hold: 0.04, r: 0.02 },
        gain: 0.4,
      })),
    ],
  },
  /** Gerald: his delivery chime, "ding-dong" (he speaks in chimes and status text only). */
  'blip.gerald': {
    ...VOICE,
    gain: SIT_BACK * 0.68,
    layers: [
      {
        wave: 'sine',
        freq: 1318.5,
        env: { a: 0.002, d: 0.15, s: 0.3, hold: 0.02, r: 0.12 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        at: 0.14,
        freq: 1046.5,
        env: { a: 0.002, d: 0.2, s: 0.3, hold: 0.02, r: 0.15 },
        gain: 0.5,
      },
      { wave: 'triangle', freq: 2637, env: { a: 0.001, d: 0.05, s: 0, r: 0.03 }, gain: 0.1 },
    ],
  },
  /**
   * The Everglow PA: the announcement chime, G–C–E, the first three notes of "Everglow Bright"
   * (the shift-change jingle), on a tinny loudspeaker.
   */
  'blip.pa': {
    ...VOICE,
    gain: SIT_BACK,
    layers: [392, 784].map((freq, i) => ({
      wave: i === 0 ? ('sine' as const) : ('triangle' as const),
      freq,
      steps: [
        [0.12, 1.335],
        [0.24, 1.682],
      ] as const,
      filter: { type: 'bandpass' as const, freq: 1200, q: 0.7 },
      env: { a: 0.003, d: 0.08, s: 0.6, hold: 0.3, r: 0.15 },
      gain: i === 0 ? 0.62 : 0.26,
    })),
  },
} as const satisfies Readonly<Record<SpeakerBlipId, SfxRecipe>>;

export const SPEECH_SFX = {
  ...BLIP_SFX,
  /**
   * The typewriter's tick, per character (rate-limited to every other one or so at 40 chars/s):
   * a soft, short click under the line, pitched per speaker (audio/speech.ts).
   */
  type_tick: {
    gain: 0.14,
    // Above the combat rattle (R10), so a line keeps its patter in a storm.
    priority: 2,
    minGapMs: 55,
    maxVoices: 2,
    jitter: 0.4,
    layers: [
      {
        wave: 'pulse25',
        freq: 1400,
        filter: { type: 'lowpass', freq: 3500 },
        env: { a: 0.001, d: 0.018, s: 0, r: 0.012 },
        gain: 0.6,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
