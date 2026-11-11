// Act III (T650; A3M1–A3M3): the Quiet. Most of the act's sound is what isn't there (no wave-clear
// sting, no win jingle, the Hollow dying with no sound; architecture.md § Audio), so what does
// sound is spare and means something. The Gathering Maw draws a unit in on a breath and swallows
// it; the Undertow sinks and rises like water closing; a rift cracks a wave ahead and tears open
// as its wave starts. The Skitterkin fight beside you now: a Scuttle Den's swarmlings bite as they
// latch and chirp a head count as they come home, and Bramble's Underfoot digs a trap that snaps.
// Everglow's machines walk on servos and shut down with a falling price tag; the Expediter ticks
// like a metronome. The Stasis Bloom rings a crystal chime as its field pulses (Gravity Well
// thrums as it pulls a unit back). The story's own: the revocation stamp, Bricks bracing at the
// Gap, the door hum (Bricks over the radio with Pebble humming along, a loop while the SEAL
// waits), and the door sealing.
import { noteHz } from '../notes.ts';
import type { SfxRecipe, ToneLayer } from '../types.ts';

/** A short tick or click (`at` s in): a triangle at `freq` with a few ms of body. */
const click = (freq: number, at: number, gain: number, d = 0.02): ToneLayer => ({
  wave: 'triangle',
  at,
  freq,
  env: { a: 0.001, d, s: 0, r: 0.01 },
  gain,
});

/** A small rising chirp (a swarmling's voice, the warren's): `freq` up by `glide`. */
const chirp = (freq: number, at: number, gain: number, glide = 1.3): ToneLayer => ({
  wave: 'triangle',
  at,
  freq,
  glide,
  glideSec: 0.04,
  env: { a: 0.002, d: 0.045, s: 0, r: 0.02 },
  gain,
});

/** G2, the door hum's tonic: "Ev-er-glow" in Bricks's register, two octaves under the sting's. */
const DOOR_HZ = noteHz('G2');
/**
 * The six notes over the tonic, `[at s, ratio]`: G (0) – C – E held – F – D – C held to the end,
 * "Ev-er-glow, Ev-er-glow" slow, filling the 3 s the hum is struck every (app/forcedInput.ts
 * HUM_EVERY_MS), so struck again it runs on as one phrase after another, a breath between.
 */
const DOOR_STEPS = [
  [0.4, 1.3348],
  [0.8, 1.6818],
  [1.5, 1.7818],
  [1.9, 1.4983],
  [2.3, 1.3348],
] as const;

export const ACT3_SFX = {
  // ── The Hollow ───────────────────────────────────────────────────────────────────────────────
  /**
   * The Gathering Maw's tendril tell (GatherTell; its 1 s): a breath drawn in, low and wrong,
   * rising toward the gather, two voices a few cents apart beating under it.
   */
  maw_tell: {
    gain: 0.34,
    priority: 2,
    minGapMs: 250,
    maxVoices: 2,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 300, freqEnd: 1600, q: 2 },
        env: { a: 0.75, d: 0.1, s: 0.6, r: 0.12 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: 82.41,
        glide: 1.5,
        glideSec: 0.9,
        env: { a: 0.3, d: 0.4, s: 0.7, hold: 0.2, r: 0.12 },
        gain: 0.4,
      },
      {
        wave: 'triangle',
        freq: 82.41 * 2 * 1.012,
        glide: 1.5,
        glideSec: 0.9,
        filter: { type: 'lowpass', freq: 900 },
        vibrato: { hz: 3.1, cents: 30 },
        env: { a: 0.3, d: 0.4, s: 0.7, hold: 0.2, r: 0.12 },
        gain: 0.25,
      },
    ],
  },
  /**
   * The Maw takes what it drew in (Gathered): a deep, muffled swallow falling away, with a wrong
   * partial under it. Never a death or a pop: nothing is gone, it's inside.
   */
  maw_gulp: {
    gain: 0.4,
    priority: 2,
    minGapMs: 150,
    maxVoices: 2,
    jitter: 0.5,
    layers: [
      {
        wave: 'sine',
        freq: 150,
        glide: 0.35,
        glideSec: 0.25,
        env: { a: 0.01, d: 0.3, s: 0, r: 0.15 },
        gain: 0.6,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 380 },
        env: { a: 0.01, d: 0.22, s: 0, r: 0.1 },
        gain: 0.3,
      },
      {
        wave: 'triangle',
        at: 0.04,
        freq: 233 * 0.985,
        glide: 0.5,
        glideSec: 0.3,
        filter: { type: 'lowpass', freq: 1100 },
        env: { a: 0.02, d: 0.25, s: 0, r: 0.1 },
        gain: 0.2,
      },
    ],
  },
  /** An Undertow sinks (a Hollow burrower going under): water closing over it, falling away. */
  undertow_sink: {
    gain: 0.26,
    priority: 1,
    minGapMs: 120,
    maxVoices: 2,
    jitter: 0.5,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 800, freqEnd: 180, q: 3 },
        env: { a: 0.04, d: 0.4, s: 0, r: 0.1 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        freq: 130.81,
        glide: 0.5,
        glideSec: 0.35,
        env: { a: 0.02, d: 0.35, s: 0, r: 0.1 },
        gain: 0.45,
      },
    ],
  },
  /** An Undertow rises (surfacing): the same water, run backwards, swelling up and cut off. */
  undertow_rise: {
    gain: 0.26,
    priority: 1,
    minGapMs: 120,
    maxVoices: 2,
    jitter: 0.5,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 180, freqEnd: 900, q: 3 },
        env: { a: 0.35, d: 0.02, s: 0.5, r: 0.03 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        freq: 65.41,
        glide: 2,
        glideSec: 0.35,
        env: { a: 0.3, d: 0.03, s: 0.5, r: 0.04 },
        gain: 0.45,
      },
    ],
  },
  /**
   * A rift will open next wave (RiftOpening; maps.md § 4, telegraphed a wave ahead): a low crackle
   * over a sub rumble, and a cold, out-of-tune shimmer over it.
   */
  rift_crack: {
    gain: 0.32,
    priority: 2,
    minGapMs: 500,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 900, q: 4 },
        env: { a: 0.01, d: 0.6, s: 0, r: 0.2 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: 49,
        glide: 0.9,
        glideSec: 1.2,
        env: { a: 0.05, d: 1, s: 0, r: 0.3 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        at: 0.1,
        freq: 1244.5 * 1.018,
        vibrato: { hz: 2.6, cents: 40 },
        env: { a: 0.4, d: 0.6, s: 0, r: 0.3 },
        gain: 0.12,
      },
    ],
  },
  /**
   * A rift opens as its wave starts (RiftOpened): a tear swelling up and cut dead (the unravel's
   * shape, much bigger), a boom under it; the music dips with it.
   */
  rift_open: {
    gain: 0.42,
    priority: 2,
    minGapMs: 500,
    maxVoices: 1,
    duck: 0.7,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 400, freqEnd: 3200, q: 1.5 },
        env: { a: 0.3, d: 0.01, s: 0.9, hold: 0.05, r: 0.02 },
        gain: 0.4,
      },
      {
        wave: 'sine',
        at: 0.32,
        freq: 65.41,
        glide: 0.5,
        glideSec: 0.5,
        env: { a: 0.005, d: 0.7, s: 0, r: 0.3 },
        gain: 0.55,
      },
      {
        wave: 'pulse12',
        freq: 220,
        glide: 0.5,
        glideSec: 0.3,
        filter: { type: 'lowpass', freq: 1200 },
        env: { a: 0.28, d: 0.01, s: 0.8, hold: 0.04, r: 0.02 },
        gain: 0.15,
      },
    ],
  },

  // ── The Skitterkin at your side ──────────────────────────────────────────────────────────────
  /**
   * A swarmling (or a Champion) latches on (SwarmLatch `on`): a tiny chitter and a click of
   * mandibles. A family of five latching is a quick patter, not a wall (gap, voices, jitter).
   */
  swarm_latch: {
    gain: 0.2,
    priority: 0,
    minGapMs: 120, // D143 R17: a family latching is a patter, not a buzz
    maxVoices: 2,
    jitter: 2,
    layers: [
      chirp(2093, 0, 0.45, 1.2),
      chirp(2349.3, 0.045, 0.4, 1.15),
      {
        wave: 'noise',
        at: 0.09,
        freq: 440,
        filter: { type: 'highpass', freq: 4000 },
        env: { a: 0.001, d: 0.012, s: 0, r: 0.008 },
        gain: 0.3,
      },
    ],
  },
  /**
   * A swarmling home at its Den (SwarmHome; towers.md § 8, the head-count chirp): one small rising
   * chirp each, so a family coming home counts itself in.
   */
  swarm_home: {
    gain: 0.17,
    priority: 0,
    minGapMs: 70,
    maxVoices: 2,
    jitter: 3,
    layers: [chirp(1567.98, 0, 0.55, 1.33)],
  },
  /**
   * Bramble's Underfoot (AbilityUsed): the warren digging the trap in, a low earthy rumble and
   * three quick chitters, one after another.
   */
  underfoot_cast: {
    gain: 0.34,
    priority: 2,
    minGapMs: 300,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 600, freqEnd: 250 },
        env: { a: 0.05, d: 0.5, s: 0, r: 0.15 },
        gain: 0.5,
      },
      chirp(1760, 0.1, 0.3),
      chirp(1975.53, 0.2, 0.3),
      chirp(2093, 0.3, 0.3),
    ],
  },
  /** Underfoot's trap springs on a unit (TrapSprung): a woody snap, a spring, and a thump. */
  trap_snap: {
    gain: 0.34,
    priority: 1,
    minGapMs: 60,
    maxVoices: 3,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2200, q: 2 },
        env: { a: 0.001, d: 0.03, s: 0, r: 0.01 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        freq: 880,
        glide: 0.6,
        glideSec: 0.06,
        env: { a: 0.001, d: 0.06, s: 0, r: 0.02 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        at: 0.02,
        freq: 130.81,
        glide: 0.5,
        glideSec: 0.1,
        env: { a: 0.002, d: 0.18, s: 0, r: 0.06 },
        gain: 0.5,
      },
    ],
  },

  // ── Everglow's machines ──────────────────────────────────────────────────────────────────────
  /**
   * An Everglow machine dies (enemies.md § 8: a clean shutdown and a falling price tag): a
   * power-down whine falling an octave and a half, then the label gun's two ticks. Pitched per
   * unit (ENEMY_POP_PITCH).
   */
  everglow_shutdown: {
    gain: 0.3,
    priority: 1,
    minGapMs: 60,
    maxVoices: 3,
    jitter: 0.5,
    layers: [
      {
        wave: 'sine',
        freq: 659.25,
        glide: 0.33,
        glideSec: 0.32,
        env: { a: 0.004, d: 0.3, s: 0, r: 0.05 },
        gain: 0.5,
      },
      {
        wave: 'square',
        freq: 1318.5,
        glide: 0.33,
        glideSec: 0.32,
        filter: { type: 'lowpass', freq: 2000 },
        env: { a: 0.004, d: 0.25, s: 0, r: 0.04 },
        gain: 0.12,
      },
      click(2637, 0.3, 0.3),
      click(3136, 0.36, 0.25),
    ],
  },
  /**
   * A Compliance Drone on the field (a loop, ENEMY_LOOPS): a servo's whirr-clack, faint. Product,
   * not staff: one voice however many walk.
   */
  compliance_step: {
    gain: 0.13,
    priority: 0,
    minGapMs: 400,
    maxVoices: 1,
    jitter: 0.3,
    layers: [
      {
        wave: 'square',
        freq: 180,
        glide: 1.3,
        glideSec: 0.06,
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.004, d: 0.07, s: 0, r: 0.02 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        at: 0.07,
        freq: 440,
        filter: { type: 'bandpass', freq: 1500, q: 2 },
        env: { a: 0.001, d: 0.03, s: 0, r: 0.01 },
        gain: 0.35,
      },
    ],
  },
  /**
   * An Expediter on the field (a loop, ENEMY_LOOPS): its haste aura's metronome, a clean, dry tick
   * every half second, so a hasted rush is heard coming.
   */
  haste_tick: {
    gain: 0.15,
    priority: 0,
    minGapMs: 300,
    maxVoices: 1,
    layers: [
      click(1760, 0, 0.5, 0.025),
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 3000, q: 3 },
        env: { a: 0.001, d: 0.012, s: 0, r: 0.008 },
        gain: 0.3,
      },
    ],
  },

  // ── The Stasis Bloom ─────────────────────────────────────────────────────────────────────────
  /**
   * The Stasis Bloom's field pulses (PulseBurst from a Bloom; towers.md § 7, crystal lattices that
   * chime): a struck crystal fifth with its bell partial and a soft swell under it. A moment
   * (priority 2): heard even among the Hollow it freezes.
   */
  bloom_chime: {
    gain: 0.28,
    priority: 2,
    minGapMs: 150,
    maxVoices: 2,
    layers: [
      { wave: 'sine', freq: 1567.98, env: { a: 0.002, d: 0.8, s: 0, r: 0.4 }, gain: 0.4 },
      { wave: 'sine', freq: 1567.98 * 2.76, env: { a: 0.001, d: 0.15, s: 0, r: 0.08 }, gain: 0.12 },
      {
        wave: 'sine',
        at: 0.05,
        freq: 2349.32,
        env: { a: 0.002, d: 0.7, s: 0, r: 0.35 },
        gain: 0.3,
      },
      {
        wave: 'triangle',
        freq: 783.99,
        env: { a: 0.03, d: 0.5, s: 0, r: 0.2 },
        gain: 0.15,
      },
    ],
  },
  /** Gravity Well pulls a unit back along its road (PulledBack): a sinking thrum and a whoosh. */
  gravity_pull: {
    gain: 0.3,
    priority: 1,
    minGapMs: 120,
    maxVoices: 2,
    jitter: 0.5,
    layers: [
      {
        wave: 'sine',
        freq: 220,
        glide: 0.5,
        glideSec: 0.35,
        env: { a: 0.01, d: 0.35, s: 0, r: 0.1 },
        gain: 0.5,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 500, freqEnd: 150 },
        env: { a: 0.05, d: 0.3, s: 0, r: 0.1 },
        gain: 0.35,
      },
    ],
  },

  // ── The story ────────────────────────────────────────────────────────────────────────────────
  /**
   * LICENSE REVOKED (TowerRevoked, one per tower, staggered; an uplink revoked the same): a rubber
   * stamp's thunk and its paper slap, and the tower powering down under it as it folds away.
   */
  revoke_stamp: {
    gain: 0.5,
    priority: 2,
    maxVoices: 3,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.001, d: 0.08, s: 0, r: 0.03 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: 110,
        glide: 0.7,
        glideSec: 0.06,
        env: { a: 0.001, d: 0.12, s: 0, r: 0.05 },
        gain: 0.5,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2500, q: 1 },
        env: { a: 0.001, d: 0.03, s: 0, r: 0.01 },
        gain: 0.2,
      },
      {
        wave: 'sawtooth',
        at: 0.12,
        freq: 440,
        glide: 0.25,
        glideSec: 0.5,
        filter: { type: 'lowpass', freq: 1200 },
        env: { a: 0.01, d: 0.5, s: 0, r: 0.08 },
        gain: 0.1,
      },
    ],
  },
  /** Bricks takes a unit on at the Gap (Blocked `on`): a heavy shoulder check, a low thud. */
  bricks_brace: {
    gain: 0.34,
    priority: 1,
    minGapMs: 300,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 350 },
        env: { a: 0.002, d: 0.12, s: 0, r: 0.05 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        freq: 90,
        glide: 0.7,
        glideSec: 0.1,
        env: { a: 0.002, d: 0.15, s: 0, r: 0.05 },
        gain: 0.55,
      },
    ],
  },
  /**
   * The door hum (A3M3's SEAL, `door_hum` in architecture.md's arrangements; app/forcedInput.ts
   * strikes it every 3 s while the SEAL waits): Bricks humming "Everglow Bright" low over the
   * radio, slow, the song he always hated; Pebble humming along an octave and more above, a beat
   * late; the radio's hiss under them. Exactly 3 s, so struck again it runs on phrase after
   * phrase. Under speech like every moment; the SEAL's press cuts it dead (FORCED_INPUT_SOUNDS).
   */
  door_hum: {
    gain: 0.3,
    priority: 1,
    minGapMs: 2000,
    maxVoices: 2,
    layers: [
      {
        wave: 'sine',
        freq: DOOR_HZ,
        steps: DOOR_STEPS,
        vibrato: { hz: 4, cents: 10 },
        env: { a: 0.15, d: 0.2, s: 0.85, hold: 2.35, r: 0.3 },
        gain: 0.5,
      },
      {
        // The octave: what small speakers hear of a low voice.
        wave: 'triangle',
        freq: DOOR_HZ * 2,
        steps: DOOR_STEPS,
        vibrato: { hz: 4, cents: 10 },
        filter: { type: 'lowpass', freq: 1200 },
        env: { a: 0.15, d: 0.2, s: 0.8, hold: 2.35, r: 0.3 },
        gain: 0.35,
      },
      {
        // Pebble, over the radio, along.
        wave: 'sine',
        at: 0.08,
        freq: DOOR_HZ * 4,
        steps: DOOR_STEPS,
        vibrato: { hz: 5.5, cents: 16 },
        env: { a: 0.2, d: 0.2, s: 0.8, hold: 2.2, r: 0.3 },
        gain: 0.22,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2200, q: 1 },
        env: { a: 0.2, d: 0.2, s: 0.8, hold: 2.3, r: 0.3 },
        gain: 0.06,
      },
    ],
  },
  /**
   * The SEAL is pressed (ForcedInputResolved `seal`): the blast door slams, a deep boom and a
   * long metal clang, and the seal hisses shut. The hum stops under it; what follows is silence.
   */
  door_seal: {
    gain: 0.79, // +4 dB over 0.5 (D143 R17: it has to land over the battle)
    priority: 2,
    maxVoices: 1,
    duck: 0.3,
    layers: [
      {
        wave: 'sine',
        freq: 55,
        glide: 0.6,
        glideSec: 0.6,
        env: { a: 0.002, d: 0.9, s: 0, r: 0.4 },
        gain: 0.55,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 300 },
        env: { a: 0.002, d: 0.5, s: 0, r: 0.2 },
        gain: 0.35,
      },
      {
        wave: 'square',
        freq: 220,
        filter: { type: 'bandpass', freq: 1800, q: 6 },
        env: { a: 0.001, d: 0.6, s: 0, r: 0.4 },
        gain: 0.12,
      },
      {
        wave: 'noise',
        at: 0.3,
        freq: 440,
        filter: { type: 'highpass', freq: 3000 },
        env: { a: 0.05, d: 0.9, s: 0, r: 0.5 },
        gain: 0.12,
      },
    ],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
