// Act I's new pests and Gerald (T314): the Puffwings' fluffy flaps (subtle, on a loop while a flock
// flies; D072), a burrower digging in and popping up (D073), a Bunchling's three-way split, the
// Elder's huddle (a soft coo), and Gerald the mail drone: his chime when a shot plinks off him
// (`NeutralHit`) and a cheery whistle as he leaves with the mail (`NeutralExited`).
import type { SfxRecipe } from '../types.ts';

export const PEST_SFX = {
  /** A Puffwing flock's wingbeats: two soft "fwup"s, under everything (a loop while they fly). */
  wing_flap: {
    gain: 0.22,
    priority: 0,
    minGapMs: 200,
    maxVoices: 1,
    jitter: 2,
    layers: [0, 0.07].map((at, i) => ({
      wave: 'noise' as const,
      at,
      freq: 440,
      filter: { type: 'bandpass' as const, freq: 900, freqEnd: 500, q: 1.2 },
      env: { a: 0.012, d: 0.04, s: 0, r: 0.025 },
      gain: i === 0 ? 0.5 : 0.4,
    })),
  },
  /** A burrower digs in: a falling scrape of dirt. */
  burrow_dig: {
    gain: 0.28,
    priority: 1,
    minGapMs: 150,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 1500, freqEnd: 300 },
        env: { a: 0.01, d: 0.25, s: 0, r: 0.08 },
        gain: 0.6,
      },
      {
        wave: 'triangle',
        freq: 220,
        glide: 0.5,
        glideSec: 0.25,
        env: { a: 0.005, d: 0.2, s: 0, r: 0.05 },
        gain: 0.3,
      },
    ],
  },
  /** A burrower surfaces: a rising "pop-up" through loose dirt. */
  burrow_surface: {
    gain: 0.28,
    priority: 1,
    minGapMs: 150,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 400, freqEnd: 2000 },
        env: { a: 0.005, d: 0.12, s: 0, r: 0.05 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: 180,
        glide: 2.5,
        glideSec: 0.1,
        env: { a: 0.002, d: 0.1, s: 0, r: 0.04 },
        gain: 0.4,
      },
    ],
  },
  /** A Bunchling splits: three quick rising bloops, one per Nibbler it becomes (after its pop). */
  split_pop: {
    gain: 0.3,
    priority: 1,
    minGapMs: 60,
    maxVoices: 2,
    jitter: 1,
    layers: [392, 523.25, 659.25].map((freq, i) => ({
      wave: i === 0 ? ('square' as const) : ('triangle' as const),
      at: i * 0.03,
      freq,
      glide: 1.5,
      glideSec: 0.03,
      filter: { type: 'lowpass' as const, freq: 3000 },
      env: { a: 0.001, d: 0.04, s: 0, r: 0.02 },
      gain: 0.45,
    })),
  },
  /** An Elder gathers its young into a huddle: a soft, warm coo (subtle). */
  huddle_coo: {
    gain: 0.2,
    priority: 0,
    minGapMs: 1500,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 392,
        glide: 1.06,
        glideSec: 0.15,
        vibrato: { hz: 6, cents: 20 },
        env: { a: 0.06, d: 0.1, s: 0.5, hold: 0.1, r: 0.15 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        at: 0.12,
        freq: 493.88,
        glide: 0.94,
        glideSec: 0.15,
        env: { a: 0.05, d: 0.1, s: 0.4, hold: 0.06, r: 0.15 },
        gain: 0.35,
      },
    ],
  },
  /** A shot plinks off Gerald: the "tink", then his chime falling a fourth, mildly offended. */
  gerald_chime: {
    gain: 0.3,
    priority: 2,
    minGapMs: 250,
    maxVoices: 1,
    layers: [
      { wave: 'triangle', freq: 2637, env: { a: 0.001, d: 0.04, s: 0, r: 0.03 }, gain: 0.4 },
      {
        wave: 'sine',
        at: 0.05,
        freq: 1568,
        env: { a: 0.002, d: 0.15, s: 0.3, hold: 0.02, r: 0.12 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        at: 0.14,
        freq: 1174.66,
        env: { a: 0.002, d: 0.2, s: 0.3, hold: 0.02, r: 0.15 },
        gain: 0.45,
      },
    ],
  },
  /** Gerald delivers and leaves: a cheery two-note whistle, up and away. */
  gerald_whistle: {
    gain: 0.28,
    priority: 2,
    minGapMs: 500,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 1046.5,
        glide: 1.5,
        glideSec: 0.12,
        vibrato: { hz: 7, cents: 15 },
        env: { a: 0.02, d: 0.1, s: 0.7, hold: 0.08, r: 0.06 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        at: 0.28,
        freq: 1318.5,
        glide: 1.33,
        glideSec: 0.1,
        vibrato: { hz: 7, cents: 15 },
        env: { a: 0.02, d: 0.1, s: 0.7, hold: 0.12, r: 0.12 },
        gain: 0.45,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
