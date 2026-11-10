// Act II, part two's towers (T550, T501h): the Aelari towers chime and hold tones (design/towers.md
// § 9: "glass chimes, sustained tones"). A Prism Spire's beam rings as it locks a target and hums
// while it holds one, the hum climbing with its ramp and settling into a held bed once the ramp
// caps (fieldSounds.ts); the Seer's Lantern opens
// its eye on a lock; a Mindspike's shot is a soft psionic pressure with a violet shimmer, and Echo
// Spike's echo repeats it, fading; Ves'thara's Stillness holds its breath. And the M4 towers'
// own voices (T501h): Skewer's harpoon tearing down its line, Magnet Crane's hum and slam, a
// Capacitor Bank's charge collapsing when it fizzles or is vented, and a coin for a tower's
// income (TowerIncome).
import type { SfxRecipe, ToneLayer } from '../types.ts';

/** A struck glass partial: a sine with a bell decay (`at` s in, at `freq` Hz). */
const glass = (freq: number, at: number, gain: number, d = 0.25): ToneLayer => ({
  wave: 'sine',
  at,
  freq,
  env: { a: 0.001, d, s: 0, r: d * 0.6 },
  gain,
});

export const ACT2_TOWER_SFX = {
  /**
   * A Prism beam locks a target (ProjectileFired `beam`, once per lock; the ramp starts over): a
   * quick glass "ting-ting" a fifth apart over a soft tone.
   */
  prism_lock: {
    gain: 0.24,
    priority: 1,
    minGapMs: 90,
    maxVoices: 2,
    jitter: 0.5,
    layers: [
      glass(1567.98, 0, 0.4, 0.18),
      glass(2349.32, 0.05, 0.35, 0.25),
      {
        wave: 'sine',
        freq: 783.99,
        env: { a: 0.002, d: 0.1, s: 0.3, hold: 0.05, r: 0.15 },
        gain: 0.3,
      },
    ],
  },
  /**
   * A beam holding a target as its ramp climbs (fieldSounds.ts, a loop while any beam is on;
   * BEAM_SOUNDS): a sustained glass fifth on C5 with a faint buzz an octave under it, a step
   * higher as the strongest beam's ramp climbs. Each tone overlaps the next, so it holds.
   */
  beam_hum: {
    gain: 0.092,
    priority: 1,
    minGapMs: 400,
    maxVoices: 2,
    layers: [
      {
        wave: 'sine',
        freq: 523.25,
        vibrato: { hz: 6, cents: 8 },
        env: { a: 0.08, d: 0.1, s: 0.8, hold: 0.35, r: 0.12 },
        gain: 0.4,
      },
      {
        wave: 'sine',
        freq: 783.99,
        env: { a: 0.1, d: 0.1, s: 0.7, hold: 0.3, r: 0.12 },
        gain: 0.2,
      },
      {
        wave: 'sawtooth',
        freq: 261.63,
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.08, d: 0.1, s: 0.7, hold: 0.35, r: 0.12 },
        gain: 0.12,
      },
    ],
  },
  /**
   * The same beam once its ramp has capped (BEAM_SOUNDS `bed`, every `bedEverySec`): the hum's
   * fifth at its top step, softer, turning over like a prism. The fifth (C5 and G5, the buzz an
   * octave under) swells and hands over to its inversion (G4 and C6) halfway through, which hands
   * over to the next one's fifth; the overlapping swells never share a pitch, so they cross-fade
   * into a held tone instead of cancelling, and a beam held for minutes is a bed, not a pulse.
   */
  beam_bed: {
    gain: 0.065,
    priority: 1,
    minGapMs: 1500,
    maxVoices: 2,
    layers: [
      {
        wave: 'sine',
        freq: 523.25,
        vibrato: { hz: 3, cents: 5 },
        env: { a: 0.5, d: 0.2, s: 0.85, hold: 0.9, r: 0.45 },
        gain: 0.4,
      },
      {
        wave: 'sine',
        freq: 783.99,
        env: { a: 0.55, d: 0.2, s: 0.75, hold: 0.85, r: 0.45 },
        gain: 0.18,
      },
      {
        wave: 'sawtooth',
        freq: 261.63,
        filter: { type: 'lowpass', freq: 700 },
        env: { a: 0.5, d: 0.2, s: 0.7, hold: 0.9, r: 0.45 },
        gain: 0.1,
      },
      {
        wave: 'sine',
        at: 1.3,
        freq: 392,
        vibrato: { hz: 3, cents: 5 },
        env: { a: 0.5, d: 0.2, s: 0.85, hold: 0.9, r: 0.45 },
        gain: 0.42,
      },
      {
        wave: 'sine',
        at: 1.3,
        freq: 1046.5,
        env: { a: 0.55, d: 0.2, s: 0.75, hold: 0.85, r: 0.45 },
        gain: 0.14,
      },
    ],
  },
  /** The Seer's Lantern locks its beam (TOWER_SOUNDS): an eye opening, a bell sliding up. */
  lantern_lock: {
    gain: 0.22,
    priority: 1,
    minGapMs: 120,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 880,
        glide: 1.5,
        glideSec: 0.15,
        env: { a: 0.005, d: 0.15, s: 0.3, hold: 0.05, r: 0.2 },
        gain: 0.35,
      },
      glass(2637.02, 0.12, 0.3, 0.25),
    ],
  },
  /**
   * A Mindspike fires (TOWER_SOUNDS): a soft psionic pressure, a low "thoom" sinking, with a
   * violet shimmer wobbling over it.
   */
  mindspike_shot: {
    gain: 0.26,
    priority: 1,
    minGapMs: 60,
    maxVoices: 2,
    jitter: 0.5,
    layers: [
      {
        wave: 'sine',
        freq: 330,
        glide: 0.5,
        glideSec: 0.12,
        env: { a: 0.002, d: 0.12, s: 0, r: 0.05 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: 1318.51,
        vibrato: { hz: 20, cents: 40 },
        env: { a: 0.002, d: 0.06, s: 0, r: 0.04 },
        gain: 0.2,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 900, q: 3 },
        env: { a: 0.002, d: 0.05, s: 0, r: 0.03 },
        gain: 0.2,
      },
    ],
  },
  /** Echo Spike's echo (EchoBurst): the shot's pressure repeated twice, falling and fading. */
  echo_burst: {
    gain: 0.22,
    priority: 1,
    minGapMs: 120,
    maxVoices: 2,
    layers: [0, 0.08, 0.16].map((at, i) => ({
      wave: 'sine' as const,
      at,
      freq: 660 * 0.94 ** i,
      glide: 0.8,
      glideSec: 0.08,
      env: { a: 0.003, d: 0.08, s: 0, r: 0.04 },
      gain: 0.4 * 0.62 ** i,
    })),
  },
  /**
   * Ves'thara's Stillness (the ability's cast): her held breath. A glass rush falling silent, a
   * chord frozen mid-fall, and her cut thread ringing a hair flat under it.
   */
  stillness_cast: {
    gain: 0.32,
    priority: 2,
    minGapMs: 1000,
    maxVoices: 1,
    duck: 0.6,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 4000, freqEnd: 800, q: 2 },
        env: { a: 0.01, d: 0.4, s: 0, r: 0.1 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        freq: 1318.51,
        glide: 0.5,
        glideSec: 0.25,
        env: { a: 0.005, d: 0.3, s: 0.7, hold: 0.6, r: 0.5 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        at: 0.3,
        freq: 659.25,
        vibrato: { hz: 3, cents: 6 },
        env: { a: 0.01, d: 0.3, s: 0.6, hold: 0.4, r: 0.6 },
        gain: 0.3,
      },
      // C5 a sixth of a semitone flat: Ves'thara's cut thread (her blip carries it too).
      glass(518, 0.3, 0.25, 0.8),
    ],
  },
  /**
   * The Harpoon's Skewer fires (ATTACK_SOUNDS `line`): a sharp crack, the line tearing through
   * everything in it, and a heavy thud at the end.
   */
  skewer_shot: {
    gain: 0.34,
    priority: 1,
    minGapMs: 150,
    maxVoices: 2,
    jitter: 0.5,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2500, freqEnd: 600, q: 1 },
        env: { a: 0.001, d: 0.25, s: 0, r: 0.08 },
        gain: 0.45,
      },
      {
        wave: 'square',
        freq: 220,
        glide: 0.5,
        glideSec: 0.2,
        filter: { type: 'lowpass', freq: 2000 },
        env: { a: 0.001, d: 0.2, s: 0, r: 0.06 },
        gain: 0.3,
      },
      { wave: 'sine', freq: 70, env: { a: 0.002, d: 0.25, s: 0, r: 0.08 }, gain: 0.4 },
    ],
  },
  /**
   * Magnet Crane's grab (TOWER_SOUNDS): the magnet's hum rising as it lifts, then the slam: a
   * low thud, a crash of metal, and a clank.
   */
  magnet_grab: {
    gain: 0.36,
    priority: 2,
    minGapMs: 300,
    maxVoices: 2,
    layers: [
      {
        wave: 'sawtooth',
        freq: 80,
        glide: 2,
        glideSec: 0.3,
        filter: { type: 'lowpass', freq: 700 },
        env: { a: 0.02, d: 0.05, s: 0.8, hold: 0.25, r: 0.03 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        at: 0.33,
        freq: 90,
        glide: 0.6,
        glideSec: 0.2,
        env: { a: 0.002, d: 0.3, s: 0, r: 0.1 },
        gain: 0.5,
      },
      {
        wave: 'noise',
        at: 0.33,
        freq: 440,
        filter: { type: 'lowpass', freq: 1500 },
        env: { a: 0.001, d: 0.18, s: 0, r: 0.06 },
        gain: 0.4,
      },
      {
        wave: 'triangle',
        at: 0.35,
        freq: 523.25,
        env: { a: 0.001, d: 0.15, s: 0, r: 0.06 },
        gain: 0.15,
      },
    ],
  },
  /**
   * A Capacitor Bank's charge fizzles or is vented (CHARGE_SOUNDS `fizzle`: it lost its target,
   * or Hold Fire vented it): the hum collapsing, a sputter of sparks.
   */
  charge_fizzle: {
    gain: 0.24,
    priority: 1,
    minGapMs: 150,
    maxVoices: 2,
    layers: [
      {
        wave: 'sawtooth',
        freq: 196,
        glide: 0.4,
        glideSec: 0.3,
        filter: { type: 'lowpass', freq: 1200, freqEnd: 300 },
        env: { a: 0.002, d: 0.3, s: 0, r: 0.08 },
        gain: 0.4,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 1500, freqEnd: 400, q: 2 },
        env: { a: 0.002, d: 0.25, s: 0, r: 0.06 },
        gain: 0.25,
      },
    ],
  },
  /**
   * A tower pays income (TowerIncome: Salvage Crane's per-wave income or kill bonus, Haggler's
   * Stall's interest, Reel It In): a small, quiet coin, kin to Zibzab's.
   */
  income_coin: {
    gain: 0.16,
    priority: 1,
    minGapMs: 150,
    maxVoices: 1,
    jitter: 0.5,
    layers: [
      {
        wave: 'pulse25',
        freq: 2093,
        steps: [[0.04, 1.26]],
        env: { a: 0.001, d: 0.08, s: 0.2, hold: 0.02, r: 0.06 },
        gain: 0.4,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
