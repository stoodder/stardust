// Act II, part two (T550; A2M4–A2M6): the units, the Long Walk, and Sundown. The Aegis Cantor
// sings (a loop while one is on the field: "shoot the singer first"); the Sunderglass Penitent
// arrives on the Witch's chord an octave down, slower, its shield bursting into shards
// (BossPhase 2) and re-forming (ShieldReformed), and at the pivot it kneels on a hushed, falling
// sigh with no sting (BossEnded `pivot`), while every Aelari standing down breathes out once
// (StoodDown, one voice for them all). The Hollow's new units flicker as they phase (PhaseShift)
// and crack violet as they split (a Fracture or its Shard). Refugees reaching the safe exit chirp
// softly, Pebble with her own happy squeak; an enemy taking a sheltered one at the exit is the
// Escort's alarm, a falling horn, not the core's siren. Sundown deepens with a low fall at each
// wave that darkens it, and a night's air rises under the battle as the dark does.
import type { SfxRecipe, ToneLayer } from '../types.ts';

/** A struck glass partial: a sine with a bell decay (`at` s in, at `freq` Hz). */
const glass = (freq: number, at: number, gain: number, d = 0.25): ToneLayer => ({
  wave: 'sine',
  at,
  freq,
  env: { a: 0.001, d, s: 0, r: d * 0.6 },
  gain,
});

/** C5 a sixth of a semitone flat: the cut thread (the Witch's top note an octave down). */
const THREAD_HZ = 518;

export const ACT2B_SFX = {
  /**
   * An Aegis Cantor on the field (a loop, ENEMY_LOOPS): a living lyre, three plucked glass notes
   * rising over one sung tone, louder than a formation's hum so the singer can be picked out.
   */
  cantor_song: {
    gain: 0.2,
    priority: 1,
    minGapMs: 1200,
    maxVoices: 1,
    jitter: 0.3,
    layers: [
      glass(1318.51, 0, 0.3, 0.2),
      glass(1661.22, 0.09, 0.25, 0.2),
      glass(1975.53, 0.18, 0.25, 0.3),
      {
        wave: 'sine',
        at: 0.1,
        freq: 987.77,
        vibrato: { hz: 5, cents: 18 },
        env: { a: 0.25, d: 0.2, s: 0.7, hold: 0.4, r: 0.45 },
        gain: 0.35,
      },
    ],
  },
  /**
   * The Penitent takes the field (BossPhase 1): the Witch's A-minor glass chord an octave down
   * and slower, a glass giant, with the cut thread's flat C on top (Ves'thara is inside).
   */
  penitent_arrive: {
    gain: 0.33,
    priority: 3,
    minGapMs: 1000,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      { wave: 'sine', freq: 110, env: { a: 0.3, d: 0.5, s: 0.6, hold: 0.8, r: 0.6 }, gain: 0.45 },
      {
        wave: 'triangle',
        freq: 220,
        vibrato: { hz: 3.5, cents: 8 },
        env: { a: 0.25, d: 0.4, s: 0.6, hold: 0.8, r: 0.6 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        at: 0.15,
        freq: 329.63,
        vibrato: { hz: 4, cents: 8 },
        env: { a: 0.2, d: 0.4, s: 0.6, hold: 0.7, r: 0.6 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        at: 0.3,
        freq: THREAD_HZ,
        vibrato: { hz: 5, cents: 14 },
        env: { a: 0.15, d: 0.4, s: 0.5, hold: 0.6, r: 0.6 },
        gain: 0.2,
      },
    ],
  },
  /**
   * The Penitent's shield breaks (BossPhase 2, the shield-broken phase): a great glass burst
   * over a low thud, then three shards tinkling loose (the Glimmer-shards).
   */
  penitent_break: {
    gain: 0.36,
    priority: 3,
    minGapMs: 1000,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 2000 },
        env: { a: 0.001, d: 0.25, s: 0, r: 0.1 },
        gain: 0.45,
      },
      { wave: 'sine', freq: 65.41, env: { a: 0.002, d: 0.9, s: 0, r: 0.3 }, gain: 0.5 },
      {
        wave: 'triangle',
        at: 0.12,
        freq: 2349.32,
        steps: [
          [0.1, 1.19],
          [0.2, 1.335],
        ],
        env: { a: 0.001, d: 0.06, s: 0.5, hold: 0.25, r: 0.12 },
        gain: 0.3,
      },
    ],
  },
  /**
   * The Penitent's shield re-forms (ShieldReformed: a shard still lives): a shatter heard
   * backwards, a glass shimmer swelling up into one clear chime. The player's cue to hunt the
   * shards.
   */
  shield_reform: {
    gain: 0.3,
    priority: 2,
    minGapMs: 500,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2000, freqEnd: 7000, q: 3 },
        env: { a: 0.5, d: 0.02, s: 0, r: 0.05 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        freq: 659.25,
        glide: 1.5,
        glideSec: 0.5,
        env: { a: 0.4, d: 0.1, s: 0.6, hold: 0.1, r: 0.2 },
        gain: 0.35,
      },
      glass(1318.51, 0.55, 0.4, 0.5),
    ],
  },
  /**
   * The pivot (BossEnded `pivot`): the Penitent kneels and becomes the Ward. Hushed, never a
   * fanfare: a glass sigh falling a fourth onto a soft low A, the cut thread left ringing. No
   * sting follows it (its `endCue` is null) and it leaves the music alone; the pivot's cue speaks.
   */
  penitent_kneel: {
    gain: 0.26,
    priority: 2,
    minGapMs: 1000,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 880,
        glide: 0.75,
        glideSec: 0.9,
        vibrato: { hz: 4, cents: 10 },
        env: { a: 0.05, d: 0.3, s: 0.6, hold: 0.6, r: 0.6 },
        gain: 0.35,
      },
      {
        wave: 'triangle',
        freq: 659.25,
        glide: 0.75,
        glideSec: 0.9,
        env: { a: 0.05, d: 0.3, s: 0.5, hold: 0.6, r: 0.6 },
        gain: 0.2,
      },
      {
        wave: 'sine',
        at: 0.6,
        freq: 220,
        env: { a: 0.3, d: 0.4, s: 0.5, hold: 0.4, r: 0.8 },
        gain: 0.35,
      },
      glass(THREAD_HZ, 1.2, 0.2, 0.8),
    ],
  },
  /**
   * An Aelari unit stands down (StoodDown, the pivot): a soft glass exhale. The whole faction
   * stands down at once, so one voice and a gap make it a single breath.
   */
  stand_down: {
    gain: 0.18,
    priority: 1,
    minGapMs: 400,
    maxVoices: 1,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 3000, freqEnd: 1200, q: 2 },
        env: { a: 0.08, d: 0.4, s: 0, r: 0.15 },
        gain: 0.4,
      },
      {
        wave: 'sine',
        freq: 1318.51,
        glide: 0.84,
        glideSec: 0.5,
        env: { a: 0.02, d: 0.3, s: 0.3, hold: 0.1, r: 0.3 },
        gain: 0.35,
      },
    ],
  },
  /**
   * A phasing unit's tell (PhaseShift `tell`, 0.5 s; the Rift Moth): a stuttering flicker, the
   * pitch wobbling between two wrong notes, so a Stasis or Unnerved answer has its moment.
   */
  phase_tell: {
    gain: 0.2,
    priority: 1,
    minGapMs: 250,
    maxVoices: 1,
    layers: [
      {
        wave: 'pulse12',
        freq: 392,
        steps: [
          [0.08, 1.06],
          [0.16, 0.94],
          [0.24, 1.06],
          [0.32, 0.94],
        ],
        filter: { type: 'lowpass', freq: 1800 },
        vibrato: { hz: 14, cents: 30 },
        env: { a: 0.02, d: 0.1, s: 0.6, hold: 0.25, r: 0.08 },
        gain: 0.4,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 800, q: 4 },
        env: { a: 0.05, d: 0.1, s: 0.5, hold: 0.25, r: 0.08 },
        gain: 0.2,
      },
    ],
  },
  /** A unit goes Phased (PhaseShift `in`): a hollow "whum" falling away to nothing. */
  phase_in: {
    gain: 0.22,
    priority: 1,
    minGapMs: 200,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 330,
        glide: 0.5,
        glideSec: 0.25,
        env: { a: 0.005, d: 0.25, s: 0, r: 0.1 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 600 },
        env: { a: 0.01, d: 0.2, s: 0, r: 0.08 },
        gain: 0.25,
      },
    ],
  },
  /** A Phased unit is back (PhaseShift `out`): the "whum" heard backwards, cut dead. */
  phase_out: {
    gain: 0.2,
    priority: 1,
    minGapMs: 200,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 165,
        glide: 2,
        glideSec: 0.15,
        env: { a: 0.12, d: 0.03, s: 0.8, hold: 0.02, r: 0.05 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 700 },
        env: { a: 0.12, d: 0.02, s: 0.6, hold: 0.02, r: 0.03 },
        gain: 0.2,
      },
    ],
  },
  /**
   * A Hollow splitter splits (a Fracture into Shards, a Shard into Motes; SPLIT_SOUNDS): a dry,
   * low violet crack, wrong where the Bunchling's split is a cartoon pop. The Hollow's own sound,
   * so its quiet keeps it (HOLLOW_QUIET).
   */
  void_crack: {
    gain: 0.3,
    priority: 1,
    minGapMs: 60,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 1200, q: 1 },
        env: { a: 0.001, d: 0.05, s: 0, r: 0.03 },
        gain: 0.5,
      },
      {
        wave: 'pulse12',
        freq: 110,
        glide: 0.7,
        glideSec: 0.1,
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.001, d: 0.12, s: 0, r: 0.05 },
        gain: 0.3,
      },
    ],
  },
  /**
   * A refugee reaches the safe exit (RefugeeEvacuated): a tiny, relieved two-note chirp rising a
   * fourth. A group files in a beat apart, so one voice and a gap keep it a patter.
   */
  refugee_safe: {
    gain: 0.16,
    priority: 1,
    minGapMs: 200,
    maxVoices: 1,
    jitter: 0.5,
    layers: [0, 0.07].map((at, i) => ({
      wave: 'triangle' as const,
      at,
      freq: i === 0 ? 1046.5 : 1396.91,
      env: { a: 0.003, d: 0.05, s: 0.2, hold: 0.01, r: 0.04 },
      gain: 0.5,
    })),
  },
  /** Pebble reaches the safe exit (RefugeeEvacuated `pebble`): her "eep!", happy, then a chirp up. */
  pebble_safe: {
    gain: 0.24,
    priority: 2,
    minGapMs: 1000,
    maxVoices: 1,
    layers: [
      {
        wave: 'triangle',
        freq: 1567.98,
        glide: 1.3,
        glideSec: 0.05,
        env: { a: 0.002, d: 0.06, s: 0.3, hold: 0.02, r: 0.03 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        at: 0.12,
        freq: 2093,
        steps: [[0.06, 1.335]],
        env: { a: 0.003, d: 0.08, s: 0.3, hold: 0.04, r: 0.06 },
        gain: 0.4,
      },
    ],
  },
  /**
   * An enemy reaches the safe exit and takes a sheltered refugee (RefugeeLost `exit`): the
   * Escort's alarm, a low horn falling a third under a small squeak cut off, kin to the leak's
   * siren but never it (Escort costs no integrity; the core's alarm stays the core's).
   */
  refugee_taken: {
    gain: 0.34,
    priority: 3,
    minGapMs: 400,
    maxVoices: 1,
    duck: 0.6,
    layers: [
      {
        wave: 'square',
        freq: 329.63,
        steps: [[0.18, 0.8409]],
        filter: { type: 'lowpass', freq: 1800 },
        env: { a: 0.01, d: 0.05, s: 0.8, hold: 0.3, r: 0.12 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        freq: 164.81,
        steps: [[0.18, 0.8409]],
        env: { a: 0.01, d: 0.05, s: 0.8, hold: 0.3, r: 0.12 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        freq: 1760,
        glide: 1.3,
        glideSec: 0.05,
        env: { a: 0.002, d: 0.05, s: 0.5, hold: 0.002, r: 0.006 },
        gain: 0.25,
      },
    ],
  },
  /**
   * Sundown deepens (DarknessShift to a darker level, at a wave's start): a low, soft fall, two
   * voices an octave apart sinking a fourth, under the wave's horn.
   */
  dusk_fall: {
    gain: 0.22,
    priority: 1,
    minGapMs: 2000,
    maxVoices: 1,
    layers: [
      {
        wave: 'triangle',
        freq: 392,
        glide: 0.75,
        glideSec: 1.5,
        filter: { type: 'lowpass', freq: 1200 },
        env: { a: 0.3, d: 0.5, s: 0.5, hold: 0.5, r: 0.8 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        freq: 196,
        glide: 0.75,
        glideSec: 1.5,
        env: { a: 0.3, d: 0.5, s: 0.5, hold: 0.5, r: 0.8 },
        gain: 0.4,
      },
    ],
  },
  /**
   * The night's air at Sundown (fieldSounds.ts, a loop while it's dark, its level following the
   * dark): a low wind swelling and falling under a faint, far creak of the domes. Each swell
   * overlaps the next, so it reads as a bed, never a pulse.
   */
  night_air: {
    gain: 0.2,
    priority: 0,
    minGapMs: 2000,
    maxVoices: 2,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 420, q: 0.8 },
        env: { a: 1, d: 0.5, s: 0.6, hold: 0.5, r: 0.8 },
        gain: 0.6,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 900, freqEnd: 600, q: 3 },
        env: { a: 1.1, d: 0.4, s: 0.5, hold: 0.4, r: 0.8 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        at: 1.2,
        freq: 1760,
        glide: 0.97,
        glideSec: 0.4,
        env: { a: 0.05, d: 0.3, s: 0, r: 0.2 },
        gain: 0.08,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
