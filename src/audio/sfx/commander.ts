// Act I's new commander tools (T314): Time Dilation's map-wide slow as a swell that sags in pitch
// (D077), Clearance Sale's cash register ("ka-ching!"), and the salvage drone (D076): its rotor as
// it flies out, on, or home, the buzz of its tractor beam while it works a tile, and the clank and
// "bip-boop" as the tile clears and the salvage pays.
import type { SfxRecipe } from '../types.ts';

export const COMMANDER_SFX = {
  /** Time Dilation: everything slows, a wide swell sagging two octaves under a blurred hiss. */
  dilation_swell: {
    gain: 0.34,
    priority: 3,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      {
        wave: 'sawtooth',
        freq: 880,
        glide: 0.25,
        glideSec: 1.2,
        vibrato: { hz: 3, cents: 25 },
        filter: { type: 'lowpass', freq: 3000, freqEnd: 500 },
        env: { a: 0.25, d: 0.6, s: 0.5, hold: 0.3, r: 0.4 },
        gain: 0.4,
      },
      {
        wave: 'sine',
        freq: 440,
        glide: 0.25,
        glideSec: 1.2,
        env: { a: 0.25, d: 0.6, s: 0.5, hold: 0.3, r: 0.4 },
        gain: 0.4,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2000, freqEnd: 300 },
        env: { a: 0.3, d: 0.6, s: 0.3, hold: 0.2, r: 0.3 },
        gain: 0.2,
      },
    ],
  },
  /** Clearance Sale: a cash register, the drawer's "ka" and the bell's bright "ching!". */
  sale_kaching: {
    gain: 0.36,
    priority: 2,
    maxVoices: 1,
    minGapMs: 300,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 3000, q: 2 },
        env: { a: 0.001, d: 0.03, s: 0, r: 0.02 },
        gain: 0.4,
      },
      {
        wave: 'square',
        freq: 220,
        filter: { type: 'lowpass', freq: 1200 },
        env: { a: 0.001, d: 0.05, s: 0, r: 0.02 },
        gain: 0.3,
      },
      {
        wave: 'triangle',
        at: 0.08,
        freq: 2093,
        env: { a: 0.001, d: 0.25, s: 0.3, hold: 0.05, r: 0.3 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        at: 0.08,
        freq: 3136,
        env: { a: 0.001, d: 0.2, s: 0.2, hold: 0.05, r: 0.25 },
        gain: 0.35,
      },
    ],
  },
  /** The salvage drone flies (out, on to the next tile, or home): a soft rotor whirr. */
  drone_fly: {
    gain: 0.22,
    priority: 1,
    minGapMs: 300,
    maxVoices: 1,
    layers: [
      {
        wave: 'sawtooth',
        freq: 140,
        vibrato: { hz: 18, cents: 30 },
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.1, d: 0.1, s: 0.7, hold: 0.35, r: 0.25 },
        gain: 0.4,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 1500, q: 1 },
        env: { a: 0.1, d: 0.1, s: 0.7, hold: 0.35, r: 0.25 },
        gain: 0.25,
      },
    ],
  },
  /** The drone works over a tile: a short servo-and-beam buzz with sparks (repeats while it works). */
  drone_work: {
    gain: 0.18,
    priority: 0,
    minGapMs: 400,
    maxVoices: 1,
    jitter: 0.5,
    layers: [
      {
        wave: 'pulse12',
        freq: 330,
        steps: [
          [0.06, 1.5],
          [0.12, 1.26],
        ],
        filter: { type: 'lowpass', freq: 2500 },
        env: { a: 0.005, d: 0.05, s: 0.6, hold: 0.1, r: 0.05 },
        gain: 0.4,
      },
      {
        wave: 'noise',
        at: 0.04,
        freq: 440,
        filter: { type: 'highpass', freq: 4000 },
        env: { a: 0.001, d: 0.04, s: 0, r: 0.02 },
        gain: 0.2,
      },
    ],
  },
  /** A wreckage tile cleared (WreckageCleared): a clank, then a "bip-boop" as the salvage pays. */
  drone_cleared: {
    gain: 0.32,
    priority: 2,
    minGapMs: 200,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 1800 },
        env: { a: 0.001, d: 0.08, s: 0, r: 0.03 },
        gain: 0.5,
      },
      {
        wave: 'square',
        freq: 196,
        filter: { type: 'lowpass', freq: 1000 },
        env: { a: 0.001, d: 0.06, s: 0, r: 0.02 },
        gain: 0.35,
      },
      {
        wave: 'pulse25',
        at: 0.12,
        freq: 1046.5,
        steps: [[0.07, 1.335]],
        env: { a: 0.002, d: 0.06, s: 0.5, hold: 0.05, r: 0.1 },
        gain: 0.4,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
