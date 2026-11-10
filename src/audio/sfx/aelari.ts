// The Aelari (T450; design/enemies.md § 5.2, § 8; art-direction §4: woven glass that hums): glass
// in every sound. Their shields ripple when a hit lands on them (`ShieldHit`) and shatter when one
// breaks them (`broken`); a shield pulse swells through its tell, rings out as it fires, and
// chokes off when Stasis interrupts it (`ShieldPulse`); a blink tunes up through its tell
// (`BlinkTell`) and zips across (`Blinked`); an interrupted tell, pulse or blink, gives the same
// glassy fizzle, so Stasis reads as one answer. They die by shattering into chiming shards, and a
// formation on the field hums faintly (a loop, like the Puffwings' wings). The Glass Witch (A2M2)
// arrives on a glass chord, cracks between phases, and withdraws on a falling glissando, dimmed.
import type { SfxRecipe, ToneLayer } from '../types.ts';

/** A struck glass partial: a sine with a quick bell decay (`at` s in, at `freq` Hz). */
const glass = (freq: number, at: number, gain: number, d = 0.25): ToneLayer => ({
  wave: 'sine',
  at,
  freq,
  env: { a: 0.001, d, s: 0, r: d * 0.6 },
  gain,
});

export const AELARI_SFX = {
  /**
   * A hit lands on a shield (ShieldHit): a small, high glass "tink" with an inharmonic partial,
   * the "wrong tool" plink's Aelari voice. Frequent (every hit on a shield), so short, quiet,
   * and rate-limited; it stands in for the nothing-plink on a hit the shield took whole.
   */
  shield_ripple: {
    gain: 0.24,
    priority: 1,
    minGapMs: 70,
    maxVoices: 2,
    jitter: 1.5,
    layers: [glass(2093, 0, 0.5, 0.07), glass(5776, 0, 0.22, 0.04)],
  },
  /** A shield breaks (ShieldHit `broken`): a glass crack, then shards falling in a bright arpeggio. */
  shield_shatter: {
    gain: 0.34,
    priority: 2,
    minGapMs: 120,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 3500 },
        env: { a: 0.001, d: 0.12, s: 0, r: 0.06 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        at: 0.02,
        freq: 2637,
        steps: [
          [0.05, 0.75],
          [0.1, 0.84],
          [0.15, 0.63],
          [0.2, 0.5],
        ],
        env: { a: 0.001, d: 0.15, s: 0.4, hold: 0.1, r: 0.12 },
        gain: 0.4,
      },
      glass(1568, 0.04, 0.25, 0.3),
    ],
  },
  /**
   * A shield pulse's tell (ShieldPulse `tell`; the Witch's is 1.5 s): a glass chord swelling with
   * a quickening shimmer, so the player hears it coming and has time to answer (Stasis).
   */
  pulse_tell: {
    gain: 0.26,
    priority: 2,
    minGapMs: 600,
    maxVoices: 2,
    layers: [
      {
        wave: 'sine',
        freq: 659.25,
        glide: 1.5,
        glideSec: 1.3,
        vibrato: { hz: 7, cents: 18 },
        env: { a: 1.1, d: 0.1, s: 0.8, hold: 0.15, r: 0.1 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: 987.77,
        glide: 1.5,
        glideSec: 1.3,
        vibrato: { hz: 11, cents: 22 },
        env: { a: 1.1, d: 0.1, s: 0.8, hold: 0.15, r: 0.1 },
        gain: 0.3,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 3000, freqEnd: 7000, q: 3 },
        env: { a: 1.2, d: 0.1, s: 0.5, hold: 0.05, r: 0.1 },
        gain: 0.2,
      },
    ],
  },
  /** The pulse fires (ShieldPulse `fired`): a bright glass chord rings out with the blue ring. */
  pulse_fire: {
    gain: 0.36,
    priority: 2,
    minGapMs: 300,
    maxVoices: 2,
    duck: 0.7,
    layers: [
      glass(987.77, 0, 0.4, 0.6),
      glass(1479.98, 0.01, 0.3, 0.55),
      glass(1975.53, 0.02, 0.22, 0.5),
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 5000, freqEnd: 2000, q: 2 },
        env: { a: 0.005, d: 0.3, s: 0, r: 0.1 },
        gain: 0.15,
      },
    ],
  },
  /**
   * A tell choked off (ShieldPulse `interrupted`, BlinkInterrupted; Stasis did it): the glass note
   * bends down and stutters out, the "nice, you stopped it" of the Aelari.
   */
  tell_fizzle: {
    gain: 0.3,
    priority: 2,
    minGapMs: 150,
    maxVoices: 2,
    layers: [
      {
        wave: 'triangle',
        freq: 1318.5,
        glide: 0.45,
        glideSec: 0.25,
        steps: [
          [0.06, 0.9],
          [0.12, 0.8],
          [0.18, 0.7],
        ],
        env: { a: 0.002, d: 0.1, s: 0.5, hold: 0.1, r: 0.08 },
        gain: 0.5,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2500, freqEnd: 600, q: 2 },
        env: { a: 0.002, d: 0.2, s: 0, r: 0.06 },
        gain: 0.25,
      },
    ],
  },
  /**
   * A blink's tell (BlinkTell; the Witch's is 1.5 s, holding still): a thin glass whine tuning up
   * a fifth, so the player hears where she's about to be.
   */
  blink_tell: {
    gain: 0.22,
    priority: 2,
    minGapMs: 600,
    maxVoices: 2,
    layers: [
      {
        wave: 'pulse12',
        freq: 784,
        glide: 1.5,
        glideSec: 1.35,
        filter: { type: 'lowpass', freq: 3000 },
        vibrato: { hz: 9, cents: 12 },
        env: { a: 0.6, d: 0.2, s: 0.8, hold: 0.55, r: 0.08 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        freq: 1568,
        glide: 1.5,
        glideSec: 1.35,
        env: { a: 0.9, d: 0.1, s: 0.8, hold: 0.4, r: 0.08 },
        gain: 0.3,
      },
    ],
  },
  /** A blink lands (Blinked): a quick glass "fwip" up and a tink where it appears. */
  blink: {
    gain: 0.32,
    priority: 2,
    minGapMs: 150,
    maxVoices: 2,
    layers: [
      {
        wave: 'sine',
        freq: 600,
        glide: 4,
        glideSec: 0.08,
        env: { a: 0.002, d: 0.08, s: 0, r: 0.03 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2000, freqEnd: 6000, q: 2 },
        env: { a: 0.002, d: 0.08, s: 0, r: 0.03 },
        gain: 0.3,
      },
      glass(3136, 0.09, 0.35, 0.18),
    ],
  },
  /**
   * An Aelari construct dies (enemies.md § 8: it shatters into chiming shards): a crack, then
   * three falling glass notes. Pitched per enemy like the pop.
   */
  aelari_shatter: {
    gain: 0.3,
    priority: 1,
    minGapMs: 60,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 4000 },
        env: { a: 0.001, d: 0.06, s: 0, r: 0.04 },
        gain: 0.4,
      },
      glass(2349.32, 0.01, 0.35, 0.16),
      glass(1760, 0.07, 0.3, 0.16),
      glass(1396.91, 0.13, 0.3, 0.2),
    ],
  },
  /**
   * An Aelari formation on the field (a loop, ENEMY_LOOPS): the threads' faint hum, a held glass
   * fifth that swells and fades (art-direction §4: constructs read as sounding, not solid).
   */
  aelari_hum: {
    gain: 0.16,
    priority: 0,
    minGapMs: 900,
    maxVoices: 1,
    jitter: 0.5,
    layers: [
      {
        wave: 'sine',
        freq: 1046.5,
        vibrato: { hz: 3, cents: 10 },
        env: { a: 0.35, d: 0.2, s: 0.7, hold: 0.3, r: 0.4 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: 1567.98,
        vibrato: { hz: 4.5, cents: 10 },
        env: { a: 0.45, d: 0.2, s: 0.6, hold: 0.2, r: 0.4 },
        gain: 0.3,
      },
    ],
  },
  /**
   * The Glass Witch takes the field (BossPhase 1): a tall glass chord (A minor, the cut thread a
   * hair flat on top) over a low resonance. Not a comic tuba: Act II has stopped laughing at her.
   */
  witch_arrive: {
    gain: 0.36,
    priority: 3,
    minGapMs: 1000,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      {
        wave: 'sine',
        freq: 110,
        env: { a: 0.15, d: 0.4, s: 0.6, hold: 0.6, r: 0.5 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        freq: 440,
        vibrato: { hz: 4, cents: 8 },
        env: { a: 0.08, d: 0.3, s: 0.6, hold: 0.7, r: 0.5 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        at: 0.12,
        freq: 659.25,
        vibrato: { hz: 5, cents: 8 },
        env: { a: 0.08, d: 0.3, s: 0.6, hold: 0.6, r: 0.5 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        at: 0.24,
        // C6 a sixth of a semitone flat: the cut thread, out of tune (characters.md).
        freq: 1036,
        vibrato: { hz: 6, cents: 15 },
        env: { a: 0.08, d: 0.3, s: 0.5, hold: 0.5, r: 0.5 },
        gain: 0.2,
      },
    ],
  },
  /** A new phase (BossPhase 2+): her lattice cracks, a glass strike over a low gong. */
  witch_phase: {
    gain: 0.36,
    priority: 3,
    minGapMs: 500,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 2500 },
        env: { a: 0.001, d: 0.18, s: 0, r: 0.08 },
        gain: 0.4,
      },
      glass(1760, 0.01, 0.3, 0.5),
      glass(2489, 0.02, 0.2, 0.45),
      { wave: 'sine', freq: 82.41, env: { a: 0.002, d: 0.8, s: 0, r: 0.3 }, gain: 0.55 },
    ],
  },
  /**
   * She withdraws (BossEnded, `retreat`): a long, slow glissando down through glass, dimming, the
   * cut thread's note left ringing a hair flat at the end.
   */
  witch_retreat: {
    gain: 0.3,
    priority: 2,
    minGapMs: 1000,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 1760,
        glide: 0.25,
        glideSec: 1.1,
        vibrato: { hz: 5, cents: 15 },
        env: { a: 0.02, d: 0.2, s: 0.7, hold: 0.8, r: 0.3 },
        gain: 0.4,
      },
      {
        wave: 'triangle',
        freq: 1318.5,
        glide: 0.25,
        glideSec: 1.1,
        env: { a: 0.02, d: 0.2, s: 0.5, hold: 0.8, r: 0.3 },
        gain: 0.25,
      },
      glass(1036, 1.3, 0.3, 0.6),
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
