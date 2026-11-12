// The finale's sounds (T850; story/campaign/finale.md § FIN). Warm gold means remembered, cold
// violet forgotten (story/bible.md § 3), and the sounds keep the colours: a unit laid to rest
// inside the song rings a struck bell in tune with the hymn and a mote rising (`rest_chime`; each
// one the next note of "Everglow Bright", so a Phase 2 well played sings the jingle in chimes);
// one that falls outside it scatters as a cold hiss with two wrong notes sliding apart
// (`scatter_hiss`), and its re-forming is the hiss drawn back in. The choir is voices: a singer
// hushed is a sung note cut off and a breath (`singer_hushed`), Pebble halting is a small "hm?",
// and the Voices running low is the chord faltering (`voices_low`, never the core's klaxon). The
// Unsung is many of the Hollow's wrong voices at once: it rises humming the jingle's first notes
// detuned, tears into three, gathers back, digs and churns under the singers, surfaces among them
// (or is dug out short: a thump and its hum cut off), starts singing the Song nearly in tune, and
// at rest its voices slide into a C major chord. The Deep Bore grinds while it drills, a step
// higher as it fills, and breaks through with a crash and the voices it woke. Directive 0 is QUILL
// glitching (a stutter, static, a falling modem, a flat "per policy" beep); "Not Everglow." is
// the stamp lifting and a warm power-up. A waymark lantern relit catches like a flame with a bell;
// Thrum's echo rises in gold; Dawn's light is a glass arpeggio over a hummed chord.
// This file loads with the finale's chunk (app/acts/fin.ts); the events that play each sound are
// eventTablesFin.ts's.
import type { SfxRecipe } from '../types.ts';

/** G4, the bell's note: the six notes of the jingle step from it (eventTablesFin.ts). */
const G4 = 392;
const C3 = 130.81;
const C4 = 261.63;
const E4 = 329.63;
const C5 = 523.25;
const E5 = 659.26;

export const FIN_SFX = {
  // ── The song ──────────────────────────────────────────────────────────────────────────────
  /**
   * A Hollow unit laid to rest inside the song (LaidToRest): a warm struck bell (harmonic, not the
   * Aelari's glass), a hummed tone under it, and a sparkle rising like the gold mote. Pitched by
   * the table to the next of the six notes. Priority 2, so the Hollow's quiet keeps it.
   */
  rest_chime: {
    gain: 0.3,
    priority: 2,
    minGapMs: 60,
    maxVoices: 4,
    layers: [
      { wave: 'sine', freq: G4, env: { a: 0.004, d: 0.5, s: 0.3, hold: 0.2, r: 0.5 }, gain: 0.5 },
      { wave: 'sine', freq: G4 * 2, env: { a: 0.003, d: 0.25, s: 0, r: 0.15 }, gain: 0.18 },
      {
        wave: 'sine',
        freq: G4,
        vibrato: { hz: 4.5, cents: 10 },
        env: { a: 0.12, d: 0.2, s: 0.6, hold: 0.2, r: 0.4 },
        gain: 0.2,
      },
      {
        wave: 'triangle',
        freq: G4 * 4,
        glide: 1.5,
        glideSec: 0.6,
        env: { a: 0.05, d: 0.5, s: 0, r: 0.2 },
        gain: 0.08,
      },
    ],
  },
  /**
   * A Hollow unit fell outside the song and scattered (Scattered): a cold hiss sweeping down, and
   * two wrong notes a semitone apart sliding away under it.
   */
  scatter_hiss: {
    gain: 0.22,
    priority: 2,
    minGapMs: 70,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 3000, freqEnd: 900, q: 2 },
        env: { a: 0.01, d: 0.35, s: 0, r: 0.1 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: 466.16,
        glide: 0.7,
        glideSec: 0.4,
        vibrato: { hz: 7, cents: 30 },
        env: { a: 0.005, d: 0.35, s: 0, r: 0.1 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        freq: 493.88,
        glide: 0.68,
        glideSec: 0.4,
        env: { a: 0.005, d: 0.35, s: 0, r: 0.1 },
        gain: 0.2,
      },
    ],
  },
  /** A scattered unit re-formed (Reformed): the hiss drawn back in, cut dead. Quiet. */
  scatter_reform: {
    gain: 0.16,
    priority: 1,
    minGapMs: 150,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 900, freqEnd: 3000, q: 2 },
        env: { a: 0.35, d: 0.01, s: 0.8, hold: 0.02, r: 0.02 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        freq: 330,
        glide: 1.4,
        glideSec: 0.35,
        env: { a: 0.3, d: 0.05, s: 0, r: 0.03 },
        gain: 0.2,
      },
    ],
  },

  // ── The choir ─────────────────────────────────────────────────────────────────────────────
  /**
   * A singer hushed (SingerHushed): a sung A cut off mid-note, a breath let out, and a soft thud;
   * the music dips with it.
   */
  singer_hushed: {
    gain: 0.32,
    priority: 2,
    minGapMs: 120,
    maxVoices: 2,
    duck: 0.7,
    layers: [
      {
        wave: 'sine',
        freq: 440,
        vibrato: { hz: 5, cents: 12 },
        env: { a: 0.03, d: 0.05, s: 0.9, hold: 0.18, r: 0.006 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        freq: 880,
        filter: { type: 'lowpass', freq: 1500 },
        env: { a: 0.03, d: 0.05, s: 0.9, hold: 0.18, r: 0.006 },
        gain: 0.12,
      },
      {
        wave: 'noise',
        at: 0.2,
        freq: 440,
        filter: { type: 'lowpass', freq: 1200, freqEnd: 300 },
        env: { a: 0.01, d: 0.4, s: 0, r: 0.1 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        at: 0.2,
        freq: 110,
        env: { a: 0.003, d: 0.25, s: 0, r: 0.08 },
        gain: 0.35,
      },
    ],
  },
  /** The choir halts (ChoirHalted on): Pebble's small "hm?", E falling to C. */
  choir_halt: {
    gain: 0.22,
    priority: 2,
    minGapMs: 1500,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: E5,
        steps: [[0.18, C5 / E5]],
        vibrato: { hz: 4.5, cents: 12 },
        env: { a: 0.04, d: 0.1, s: 0.7, hold: 0.25, r: 0.15 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: E5 * 2,
        steps: [[0.18, C5 / E5]],
        filter: { type: 'lowpass', freq: 1800 },
        env: { a: 0.05, d: 0.1, s: 0.5, hold: 0.25, r: 0.15 },
        gain: 0.1,
      },
    ],
  },
  /** The choir walks on (ChoirHalted off): "hm-hm", C rising to E. */
  choir_walk: {
    gain: 0.2,
    priority: 2,
    minGapMs: 1500,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: C5,
        steps: [[0.15, E5 / C5]],
        vibrato: { hz: 4.5, cents: 12 },
        env: { a: 0.04, d: 0.1, s: 0.7, hold: 0.22, r: 0.15 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: C5 * 2,
        steps: [[0.15, E5 / C5]],
        filter: { type: 'lowpass', freq: 1800 },
        env: { a: 0.05, d: 0.1, s: 0.5, hold: 0.22, r: 0.15 },
        gain: 0.1,
      },
    ],
  },
  /**
   * The Voices meter at its low mark (the HUD's Escort meter on a choir map; app/audio.ts): the
   * choir's chord faltering, a hummed C falling to A with its octave, never the core's klaxon.
   */
  voices_low: {
    gain: 0.3,
    priority: 3,
    minGapMs: 2000,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: C5,
        steps: [[0.35, 440 / C5]],
        vibrato: { hz: 6, cents: 25 },
        env: { a: 0.05, d: 0.1, s: 0.8, hold: 0.55, r: 0.3 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: C4,
        steps: [[0.35, 440 / C5]],
        vibrato: { hz: 5, cents: 20 },
        env: { a: 0.06, d: 0.1, s: 0.8, hold: 0.55, r: 0.3 },
        gain: 0.25,
      },
      {
        wave: 'triangle',
        freq: C5 * 2,
        steps: [[0.35, 440 / C5]],
        filter: { type: 'lowpass', freq: 1600 },
        env: { a: 0.05, d: 0.1, s: 0.6, hold: 0.55, r: 0.3 },
        gain: 0.08,
      },
    ],
  },
  /** Thrum's echo reached the song (EchoArrived): a soft gold chime rising, C–E–G. */
  echo_rise: {
    gain: 0.26,
    priority: 2,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: C5,
        steps: [
          [0.15, E5 / C5],
          [0.3, 1.5],
        ],
        env: { a: 0.01, d: 0.4, s: 0.4, hold: 0.4, r: 0.5 },
        gain: 0.35,
      },
      {
        wave: 'triangle',
        freq: C5 * 2,
        glide: 1.5,
        glideSec: 1,
        filter: { type: 'lowpass', freq: 3000 },
        env: { a: 0.2, d: 0.6, s: 0, r: 0.3 },
        gain: 0.1,
      },
    ],
  },
  /**
   * A waymark lantern relit (its wreckage cleared; eventTablesFin.ts): a flame catching with a soft
   * whoomph and a crackle, and a warm bell, pitched by the table up the major chord, lantern by
   * lantern.
   */
  lantern_lit: {
    gain: 0.3,
    priority: 2,
    maxVoices: 2,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 1200, freqEnd: 600, q: 1 },
        env: { a: 0.03, d: 0.25, s: 0, r: 0.1 },
        gain: 0.3,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 700 },
        env: { a: 0.1, d: 0.4, s: 0.2, hold: 0.2, r: 0.3 },
        gain: 0.15,
      },
      {
        wave: 'sine',
        at: 0.12,
        freq: G4,
        env: { a: 0.005, d: 0.6, s: 0.3, hold: 0.2, r: 0.6 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        at: 0.12,
        freq: G4 * 2,
        env: { a: 0.003, d: 0.3, s: 0, r: 0.2 },
        gain: 0.12,
      },
    ],
  },

  // ── The Deep Bore ─────────────────────────────────────────────────────────────────────────
  /**
   * The Deep Bore drilling (fieldSounds.ts, while its timer runs): a low motor's grind with a
   * wobble and grit, every 1.5 s of sim time, a step higher for each fifth of its fill. Quiet:
   * under a Rivet shot.
   */
  bore_drill: {
    gain: 0.2,
    priority: 1,
    minGapMs: 600,
    maxVoices: 1,
    layers: [
      {
        wave: 'sawtooth',
        freq: 55,
        filter: { type: 'lowpass', freq: 300 },
        vibrato: { hz: 9, cents: 25 },
        env: { a: 0.1, d: 0.1, s: 0.9, hold: 1.1, r: 0.2 },
        gain: 0.35,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 180, q: 3 },
        env: { a: 0.1, d: 0.1, s: 0.9, hold: 1.1, r: 0.2 },
        gain: 0.35,
      },
      {
        wave: 'square',
        freq: 110,
        filter: { type: 'lowpass', freq: 500 },
        vibrato: { hz: 12, cents: 40 },
        env: { a: 0.1, d: 0.1, s: 0.8, hold: 1.1, r: 0.2 },
        gain: 0.12,
      },
    ],
  },
  /**
   * The Bore broke through (TimerFull `deep_bore`): a crash and the ground giving, a falling boom,
   * and the voices it woke rising a semitone apart. An alarm (priority 3); the music dips.
   */
  bore_breach: {
    gain: 0.3,
    priority: 3,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 1500, freqEnd: 200 },
        env: { a: 0.005, d: 0.8, s: 0.2, hold: 0.3, r: 0.6 },
        gain: 0.55,
      },
      {
        wave: 'sine',
        freq: 70,
        glide: 0.5,
        glideSec: 1.2,
        env: { a: 0.005, d: 1.2, s: 0, r: 0.3 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: 82.41 * 0.98,
        vibrato: { hz: 2, cents: 30 },
        env: { a: 0.3, d: 1, s: 0.3, hold: 0.2, r: 0.5 },
        gain: 0.3,
      },
      {
        wave: 'triangle',
        freq: 87.31,
        vibrato: { hz: 1.7, cents: 35 },
        env: { a: 0.4, d: 1, s: 0.3, hold: 0.2, r: 0.5 },
        gain: 0.25,
      },
    ],
  },

  // ── The Unsung ────────────────────────────────────────────────────────────────────────────
  /**
   * The Unsung rises from the Halls (BossPhase 1): many wrong voices swelling up from deep, humming
   * the jingle's first three notes, G–C–E, slow and out of tune, an octave a few cents sharp.
   */
  unsung_arrive: {
    gain: 0.3,
    priority: 2,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      {
        wave: 'sine',
        freq: 98 * 1.01,
        steps: [
          [0.8, 1.3348],
          [1.6, 1.6818],
        ],
        vibrato: { hz: 3, cents: 30 },
        env: { a: 0.5, d: 0.3, s: 0.8, hold: 1.6, r: 0.5 },
        gain: 0.35,
      },
      {
        wave: 'triangle',
        freq: 98 * 0.985,
        steps: [
          [0.8, 1.3348],
          [1.6, 1.6818],
        ],
        filter: { type: 'lowpass', freq: 700 },
        vibrato: { hz: 2.4, cents: 40 },
        env: { a: 0.5, d: 0.3, s: 0.8, hold: 1.6, r: 0.5 },
        gain: 0.3,
      },
      {
        wave: 'triangle',
        freq: 196 * 1.012,
        steps: [
          [0.8, 1.3348],
          [1.6, 1.6818],
        ],
        filter: { type: 'lowpass', freq: 1500 },
        vibrato: { hz: 3.3, cents: 35 },
        env: { a: 0.6, d: 0.3, s: 0.7, hold: 1.5, r: 0.5 },
        gain: 0.25,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 300, freqEnd: 900, q: 2 },
        env: { a: 0.8, d: 0.8, s: 0.5, hold: 0.8, r: 0.5 },
        gain: 0.2,
      },
    ],
  },
  /** The Unsung tears into three (BossSplit): three voices pulling apart, and a crack. */
  unsung_split: {
    gain: 0.3,
    priority: 2,
    maxVoices: 1,
    duck: 0.65,
    layers: [
      {
        wave: 'sine',
        freq: 196,
        glide: 1.26,
        glideSec: 0.7,
        vibrato: { hz: 6, cents: 30 },
        env: { a: 0.02, d: 0.7, s: 0, r: 0.2 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        freq: 196 * 1.01,
        glide: 0.8,
        glideSec: 0.7,
        env: { a: 0.02, d: 0.7, s: 0, r: 0.2 },
        gain: 0.3,
      },
      {
        wave: 'triangle',
        freq: 196 * 0.99,
        glide: 0.63,
        glideSec: 0.7,
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.02, d: 0.7, s: 0, r: 0.2 },
        gain: 0.25,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2000, q: 1 },
        env: { a: 0.002, d: 0.12, s: 0, r: 0.05 },
        gain: 0.4,
      },
    ],
  },
  /**
   * The Unsung rises again where its last part fell (BossRisen): the three voices drawn back
   * together into one, swelling.
   */
  unsung_rise: {
    gain: 0.3,
    priority: 2,
    maxVoices: 1,
    duck: 0.65,
    layers: [
      {
        wave: 'sine',
        freq: 147,
        glide: 1.33,
        glideSec: 1,
        env: { a: 0.8, d: 0.05, s: 0.9, hold: 0.3, r: 0.2 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        freq: 233,
        glide: 0.84,
        glideSec: 1,
        env: { a: 0.8, d: 0.05, s: 0.9, hold: 0.3, r: 0.2 },
        gain: 0.3,
      },
      {
        wave: 'triangle',
        freq: 175,
        glide: 1.12,
        glideSec: 1,
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.8, d: 0.05, s: 0.9, hold: 0.3, r: 0.2 },
        gain: 0.25,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 400, freqEnd: 1200, q: 2 },
        env: { a: 0.9, d: 0.05, s: 0.5, hold: 0.2, r: 0.2 },
        gain: 0.2,
      },
    ],
  },
  /** The Unsung digs in toward the choir (its burrow; fieldSounds.ts): the ground swallowing it. */
  unsung_dig: {
    gain: 0.3,
    priority: 2,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 800, freqEnd: 150 },
        env: { a: 0.02, d: 0.7, s: 0, r: 0.2 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        freq: 80,
        glide: 0.6,
        glideSec: 0.6,
        env: { a: 0.01, d: 0.6, s: 0, r: 0.2 },
        gain: 0.45,
      },
    ],
  },
  /**
   * The ground churns under the singers (the Unsung's surfacing tell, its last 1.5 s underground;
   * fieldSounds.ts): a rumble climbing, the tell to dig it out now.
   */
  unsung_churn: {
    gain: 0.3,
    priority: 2,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 200, freqEnd: 900 },
        env: { a: 1.2, d: 0.1, s: 0.8, hold: 0.1, r: 0.1 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: 55,
        glide: 1.6,
        glideSec: 1.4,
        vibrato: { hz: 8, cents: 40 },
        env: { a: 1, d: 0.2, s: 0.8, hold: 0.2, r: 0.1 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        freq: 110,
        glide: 1.6,
        glideSec: 1.4,
        filter: { type: 'lowpass', freq: 500 },
        vibrato: { hz: 11, cents: 50 },
        env: { a: 1.1, d: 0.2, s: 0.8, hold: 0.1, r: 0.1 },
        gain: 0.2,
      },
    ],
  },
  /**
   * The Unsung surfaces among the singers (BossSurfaced): the ground bursting, a falling boom, and
   * two wrong voices a semitone apart.
   */
  unsung_surface: {
    gain: 0.32,
    priority: 2,
    maxVoices: 1,
    duck: 0.7,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 3000, freqEnd: 300 },
        env: { a: 0.003, d: 0.5, s: 0, r: 0.2 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        freq: 90,
        glide: 0.5,
        glideSec: 0.4,
        env: { a: 0.002, d: 0.4, s: 0, r: 0.1 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: 233.08,
        vibrato: { hz: 6, cents: 40 },
        env: { a: 0.02, d: 0.8, s: 0, r: 0.3 },
        gain: 0.25,
      },
      {
        wave: 'triangle',
        freq: 246.94,
        vibrato: { hz: 5, cents: 40 },
        env: { a: 0.02, d: 0.8, s: 0, r: 0.3 },
        gain: 0.2,
      },
    ],
  },
  /**
   * The Unsung dug out short of the singers by a burrow answer (BossSurfaced `dugOut`): a thump, a
   * cough of earth, its hum cut short, and a small bright note: got it.
   */
  unsung_dug_out: {
    gain: 0.32,
    priority: 2,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 120,
        glide: 0.6,
        glideSec: 0.15,
        env: { a: 0.002, d: 0.15, s: 0, r: 0.05 },
        gain: 0.55,
      },
      {
        wave: 'noise',
        at: 0.03,
        freq: 440,
        filter: { type: 'bandpass', freq: 1200, q: 1.5 },
        env: { a: 0.003, d: 0.12, s: 0, r: 0.04 },
        gain: 0.4,
      },
      {
        wave: 'triangle',
        at: 0.05,
        freq: 220,
        glide: 0.5,
        glideSec: 0.2,
        env: { a: 0.005, d: 0.2, s: 0, r: 0.02 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        at: 0.12,
        freq: C5,
        env: { a: 0.003, d: 0.25, s: 0, r: 0.1 },
        gain: 0.15,
      },
    ],
  },
  /**
   * The Song (BossPhase 4): the Unsung starts to sing, G–C–E, its wrong voices wobbling toward the
   * tune and not there yet.
   */
  unsung_song: {
    gain: 0.28,
    priority: 2,
    maxVoices: 1,
    duck: 0.6,
    layers: [
      {
        wave: 'sine',
        freq: G4,
        steps: [
          [0.6, 1.3348],
          [1.2, 1.6818],
        ],
        vibrato: { hz: 3.5, cents: 35 },
        env: { a: 0.3, d: 0.2, s: 0.8, hold: 1.4, r: 0.5 },
        gain: 0.35,
      },
      {
        wave: 'triangle',
        freq: G4 * 1.02,
        steps: [
          [0.6, 1.3348],
          [1.2, 1.6818],
        ],
        filter: { type: 'lowpass', freq: 1200 },
        vibrato: { hz: 2.5, cents: 45 },
        env: { a: 0.3, d: 0.2, s: 0.8, hold: 1.4, r: 0.5 },
        gain: 0.25,
      },
      {
        wave: 'triangle',
        freq: (G4 / 2) * 0.99,
        steps: [
          [0.6, 1.3348],
          [1.2, 1.6818],
        ],
        filter: { type: 'lowpass', freq: 700 },
        vibrato: { hz: 3, cents: 30 },
        env: { a: 0.35, d: 0.2, s: 0.8, hold: 1.35, r: 0.5 },
        gain: 0.25,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 500, q: 2 },
        env: { a: 0.4, d: 0.4, s: 0.5, hold: 1, r: 0.5 },
        gain: 0.1,
      },
    ],
  },
  /** The Song calls its adds (BossAdds: Silencers walking in): a low moan, two voices beating. */
  unsung_call: {
    gain: 0.28,
    priority: 2,
    minGapMs: 2000,
    maxVoices: 1,
    layers: [
      {
        wave: 'triangle',
        freq: 110,
        glide: 0.89,
        glideSec: 0.9,
        vibrato: { hz: 4, cents: 40 },
        filter: { type: 'lowpass', freq: 600 },
        env: { a: 0.2, d: 0.6, s: 0.3, hold: 0.2, r: 0.3 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        freq: 116.54,
        glide: 0.89,
        glideSec: 0.9,
        filter: { type: 'lowpass', freq: 600 },
        env: { a: 0.2, d: 0.6, s: 0.3, hold: 0.2, r: 0.3 },
        gain: 0.3,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 300, q: 2 },
        env: { a: 0.3, d: 0.5, s: 0.2, hold: 0.2, r: 0.3 },
        gain: 0.2,
      },
    ],
  },
  /**
   * The Unsung laid to rest (BossEnded `layToRest`): its voices sliding into tune, C–E–G, and a
   * gold bell over them as they land.
   */
  unsung_rest: {
    gain: 0.32,
    priority: 2,
    maxVoices: 1,
    duck: 0.6,
    layers: [
      {
        wave: 'sine',
        freq: C3 * 1.03,
        glide: 1 / 1.03,
        glideSec: 1.2,
        env: { a: 0.4, d: 0.3, s: 0.8, hold: 1.2, r: 0.8 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        freq: 164.81 * 0.97,
        glide: 1 / 0.97,
        glideSec: 1.2,
        env: { a: 0.4, d: 0.3, s: 0.8, hold: 1.2, r: 0.8 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        freq: 196 * 1.02,
        glide: 1 / 1.02,
        glideSec: 1.2,
        env: { a: 0.4, d: 0.3, s: 0.8, hold: 1.2, r: 0.8 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        at: 0.9,
        freq: C5,
        env: { a: 0.005, d: 0.8, s: 0.3, hold: 0.3, r: 0.6 },
        gain: 0.2,
      },
    ],
  },

  // ── Dawn, and QUILL ───────────────────────────────────────────────────────────────────────
  /**
   * Dawn breaks (DawnBroke): the light, a glass arpeggio climbing C–E–G–C and held, over a hummed
   * C major chord swelling in, a sparkle on top.
   */
  dawn_break: {
    gain: 0.32,
    priority: 2,
    maxVoices: 1,
    duck: 0.7,
    layers: [
      {
        wave: 'sine',
        freq: C5,
        steps: [
          [0.18, E5 / C5],
          [0.36, 1.4983],
          [0.54, 2],
        ],
        env: { a: 0.005, d: 0.3, s: 0.6, hold: 1.2, r: 0.8 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        freq: C4,
        vibrato: { hz: 4.5, cents: 10 },
        env: { a: 0.6, d: 0.3, s: 0.8, hold: 0.8, r: 0.8 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        freq: E4,
        vibrato: { hz: 4, cents: 12 },
        env: { a: 0.6, d: 0.3, s: 0.8, hold: 0.8, r: 0.8 },
        gain: 0.25,
      },
      {
        wave: 'triangle',
        at: 0.54,
        freq: C5 * 2,
        filter: { type: 'lowpass', freq: 3000 },
        env: { a: 0.01, d: 0.9, s: 0.2, hold: 0.2, r: 0.6 },
        gain: 0.12,
      },
    ],
  },
  /**
   * Directive 0 (AbilityLocked on, in the same beat as the revocation's stamps): QUILL glitching,
   * a stuttering square jumping pitch, static under it, cut dead; then a modem's fall and a flat
   * "per policy" beep. Heard like an alarm (priority 3); the music dips.
   */
  directive_glitch: {
    gain: 0.3,
    priority: 3,
    maxVoices: 1,
    duck: 0.5,
    layers: [
      {
        wave: 'square',
        freq: 880,
        steps: [
          [0.06, 0.75],
          [0.12, 1.33],
          [0.18, 0.5],
          [0.24, 1.5],
          [0.3, 0.66],
          [0.36, 1],
          [0.42, 0.5],
        ],
        filter: { type: 'lowpass', freq: 2500 },
        env: { a: 0.002, d: 0.05, s: 0.8, hold: 0.45, r: 0.006 },
        gain: 0.3,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2000, q: 0.8 },
        env: { a: 0.002, d: 0.05, s: 0.6, hold: 0.45, r: 0.006 },
        gain: 0.2,
      },
      {
        wave: 'pulse12',
        at: 0.5,
        freq: 440,
        glide: 0.25,
        glideSec: 0.5,
        env: { a: 0.003, d: 0.5, s: 0, r: 0.05 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        at: 0.95,
        freq: 1000,
        env: { a: 0.005, d: 0.02, s: 1, hold: 0.3, r: 0.02 },
        gain: 0.12,
      },
    ],
  },
  /**
   * "Not Everglow." (ClassRestored): the stamp lifting (a short swell drawn in), a warm power-up
   * climbing an octave, and a C–E chime.
   */
  class_restored: {
    gain: 0.3,
    priority: 2,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 800, freqEnd: 2000, q: 1 },
        env: { a: 0.15, d: 0.01, s: 0, r: 0.01 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        at: 0.12,
        freq: C3,
        glide: 2,
        glideSec: 0.5,
        env: { a: 0.02, d: 0.5, s: 0.6, hold: 0.2, r: 0.4 },
        gain: 0.35,
      },
      {
        wave: 'sine',
        at: 0.55,
        freq: C5,
        env: { a: 0.005, d: 0.7, s: 0.2, hold: 0.1, r: 0.4 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        at: 0.62,
        freq: E5,
        env: { a: 0.005, d: 0.7, s: 0.2, hold: 0.1, r: 0.4 },
        gain: 0.2,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
