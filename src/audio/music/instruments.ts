// Music instruments: chiptune voices built from the same tone layers as the sound effects. Pitched
// instruments take each note's pitch; drums carry their own (DRUMS).
import type { Instrument } from '../types.ts';

export const INSTRUMENTS = {
  /** The melody: a 25% pulse with a little vibrato, doubled an octave down by a soft triangle. */
  lead: {
    gain: 0.5,
    layers: [
      {
        wave: 'pulse25',
        vibrato: { hz: 5.5, cents: 12 },
        env: { a: 0.005, d: 0.08, s: 0.6, r: 0.08 },
        gain: 0.6,
      },
      { wave: 'triangle', ratio: 0.5, env: { a: 0.005, d: 0.08, s: 0.6, r: 0.08 }, gain: 0.3 },
    ],
  },
  /** The bass: a round triangle with a buzzy 12% pulse underneath. */
  bass: {
    gain: 0.6,
    layers: [
      { wave: 'triangle', env: { a: 0.003, d: 0.1, s: 0.7, r: 0.04 }, gain: 0.9 },
      {
        wave: 'pulse12',
        filter: { type: 'lowpass', freq: 800 },
        env: { a: 0.003, d: 0.1, s: 0.5, r: 0.04 },
        gain: 0.15,
      },
    ],
  },
  /** Offbeat chord stabs: short, filtered squares (the bounce). */
  stab: {
    gain: 0.3,
    layers: [
      {
        wave: 'square',
        filter: { type: 'lowpass', freq: 2600 },
        env: { a: 0.002, d: 0.06, s: 0.3, r: 0.03 },
        gain: 0.5,
      },
    ],
  },
  /** Held chord tones for the calmer title theme. */
  pad: {
    gain: 0.3,
    layers: [
      { wave: 'triangle', env: { a: 0.04, d: 0.3, s: 0.6, r: 0.25 }, gain: 0.6 },
      {
        wave: 'pulse12',
        filter: { type: 'lowpass', freq: 1800 },
        vibrato: { hz: 4, cents: 8 },
        env: { a: 0.06, d: 0.3, s: 0.5, r: 0.25 },
        gain: 0.2,
      },
    ],
  },
  /** The jingle voice: a bright bell-like pulse with an octave shimmer. */
  chime: {
    gain: 0.5,
    layers: [
      { wave: 'pulse25', env: { a: 0.002, d: 0.3, s: 0.4, r: 0.25 }, gain: 0.55 },
      { wave: 'triangle', ratio: 2, env: { a: 0.002, d: 0.2, s: 0.2, r: 0.2 }, gain: 0.25 },
    ],
  },
  /**
   * Struck glass (the Aelari, T450): a sine with its inharmonic partial (2.76 ×, a bell's) that
   * rings off first, so a note sounds like a lattice tapped.
   */
  glass: {
    gain: 0.45,
    layers: [
      { wave: 'sine', env: { a: 0.002, d: 0.35, s: 0.35, r: 0.3 }, gain: 0.6 },
      { wave: 'sine', ratio: 2.76, env: { a: 0.001, d: 0.12, s: 0, r: 0.08 }, gain: 0.25 },
    ],
  },
  /** A chiptune brass: a filtered square that swells a little. */
  brass: {
    gain: 0.4,
    layers: [
      {
        wave: 'square',
        filter: { type: 'lowpass', freq: 2000 },
        env: { a: 0.02, d: 0.1, s: 0.7, r: 0.1 },
        gain: 0.6,
      },
    ],
  },
  /**
   * A hummed voice (T550; Pebble's home motif, and the hums of Act III and the finale): a soft
   * sine with a slow, breathy swell and a gentle wobble, a low-passed octave and a faint third
   * partial for the closed-mouth "m".
   */
  hum: {
    gain: 0.5,
    layers: [
      {
        wave: 'sine',
        vibrato: { hz: 4.5, cents: 14 },
        env: { a: 0.06, d: 0.2, s: 0.8, r: 0.25 },
        gain: 0.6,
      },
      {
        wave: 'triangle',
        ratio: 2,
        filter: { type: 'lowpass', freq: 1500 },
        vibrato: { hz: 4.5, cents: 14 },
        env: { a: 0.08, d: 0.2, s: 0.5, r: 0.25 },
        gain: 0.2,
      },
      { wave: 'sine', ratio: 3, env: { a: 0.1, d: 0.2, s: 0.4, r: 0.2 }, gain: 0.08 },
    ],
  },
  /**
   * The colony PA (T550; the shift change): a thin, high-passed square through a tinny horn, with
   * a little warble, as if from a loudspeaker on a pole.
   */
  pa: {
    gain: 0.4,
    layers: [
      {
        wave: 'square',
        filter: { type: 'highpass', freq: 700 },
        vibrato: { hz: 7, cents: 6 },
        env: { a: 0.01, d: 0.12, s: 0.7, r: 0.12 },
        gain: 0.5,
      },
      {
        wave: 'pulse12',
        filter: { type: 'lowpass', freq: 2500 },
        env: { a: 0.01, d: 0.12, s: 0.6, r: 0.12 },
        gain: 0.25,
      },
    ],
  },
  /** The sad trombone of the loss sting: a sagging, wobbling saw. */
  wah: {
    gain: 0.45,
    layers: [
      {
        wave: 'sawtooth',
        glide: 0.96,
        glideSec: 0.3,
        vibrato: { hz: 6, cents: 40 },
        filter: { type: 'lowpass', freq: 1400 },
        env: { a: 0.03, d: 0.1, s: 0.8, r: 0.15 },
        gain: 0.6,
      },
    ],
  },
} as const satisfies Readonly<Record<string, Instrument>>;

/** Drums: fixed-pitch instruments a pattern's kit letters play. */
export const DRUMS = {
  kick: {
    gain: 0.6,
    layers: [
      {
        wave: 'sine',
        freq: 150,
        glide: 0.3,
        glideSec: 0.08,
        env: { a: 0.001, d: 0.12, s: 0, r: 0.04 },
        gain: 0.9,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 1200 },
        env: { a: 0.001, d: 0.02, s: 0, r: 0.01 },
        gain: 0.25,
      },
    ],
  },
  snare: {
    gain: 0.45,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 1800, q: 0.8 },
        env: { a: 0.001, d: 0.12, s: 0, r: 0.05 },
        gain: 0.8,
      },
      {
        wave: 'triangle',
        freq: 190,
        glide: 0.7,
        glideSec: 0.05,
        env: { a: 0.001, d: 0.06, s: 0, r: 0.03 },
        gain: 0.2,
      },
    ],
  },
  hat: {
    gain: 0.25,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 7000 },
        env: { a: 0.001, d: 0.03, s: 0, r: 0.01 },
        gain: 0.7,
      },
    ],
  },
  ohat: {
    gain: 0.22,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 6000 },
        env: { a: 0.001, d: 0.15, s: 0, r: 0.05 },
        gain: 0.6,
      },
    ],
  },
} as const satisfies Readonly<Record<string, Instrument>>;

/** The standard kit: k kick, s snare, h hat, o open hat. */
export const KIT: Readonly<Record<string, keyof typeof DRUMS>> = {
  k: 'kick',
  s: 'snare',
  h: 'hat',
  o: 'ohat',
};

/** Any instrument or drum by id. */
export const ALL_INSTRUMENTS: Readonly<Record<string, Instrument>> = { ...INSTRUMENTS, ...DRUMS };
