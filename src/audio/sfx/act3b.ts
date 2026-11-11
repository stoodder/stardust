// Act III, part two (T750; A3M4–A3M6): the jammers, the Shareholder's platform, the Gathering
// Maw's split and merge, the towers the warren gave you, and the story's small sounds. Everglow
// Security sounds like office equipment that has learned to hurt you: the Auditor's ring is an
// adding machine ratcheting up, a jammed tower crackles and powers down, and System Reboot is a
// CRT going dark and booting with a chime. The Silencer (Hollow) creeps in as static that sinks.
// "Shareholder Value" is hydraulics, a hangar door, a targeting lens and Sterling's PA sparkle;
// its jettison is clanks, a hiss and a panicking beep. The Gathering Maw is three wrong voices
// that strain apart, tear, and slide back together. Gloop spits and splats; a Sproing leaper
// boings. The bearers each hum one note of the six as they come home, in tune; Gerald's delivery
// ends in a bell; Pebble's knock-knock knocks on a dome door.
import type { SfxRecipe, ToneLayer } from '../types.ts';

/** A short tick or click (`at` s in): a triangle at `freq` with a few ms of body. */
const click = (freq: number, at: number, gain: number, d = 0.02): ToneLayer => ({
  wave: 'triangle',
  at,
  freq,
  env: { a: 0.001, d, s: 0, r: 0.01 },
  gain,
});

/** A knock on a dome's door (`at` s in): a dull wooden thud with a low body. */
const knock = (at: number): readonly ToneLayer[] => [
  {
    wave: 'noise',
    at,
    freq: 440,
    filter: { type: 'lowpass', freq: 900 },
    env: { a: 0.001, d: 0.05, s: 0, r: 0.02 },
    gain: 0.5,
  },
  {
    wave: 'sine',
    at,
    freq: 190,
    glide: 0.7,
    glideSec: 0.06,
    env: { a: 0.001, d: 0.08, s: 0, r: 0.03 },
    gain: 0.5,
  },
];

export const ACT3B_SFX = {
  // ── Jamming ──────────────────────────────────────────────────────────────────────────────────
  /**
   * The Silencer's tendril tell (JamTell `tendril`; its 2 s): static creeping in and sinking, a
   * low tone falling under it, a thin high line fading out as the quiet reaches the tower.
   */
  jam_tendril: {
    gain: 0.3,
    priority: 2,
    minGapMs: 300,
    maxVoices: 2,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 1400, freqEnd: 300, q: 3 },
        env: { a: 1.5, d: 0.2, s: 0.4, r: 0.15 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        freq: 98,
        glide: 0.75,
        glideSec: 1.8,
        env: { a: 0.6, d: 1.1, s: 0.2, r: 0.15 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        freq: 2489,
        glide: 0.5,
        glideSec: 1.7,
        vibrato: { hz: 3, cents: 30 },
        env: { a: 0.3, d: 1.4, s: 0, r: 0.1 },
        gain: 0.1,
      },
    ],
  },
  /**
   * The Auditor's ring tell (JamTell `ring`; its 2 s): an adding machine ratcheting faster and
   * faster (a buzz train climbing in rate), a ring tone swelling under it, and the total's
   * ka-chunk as the ring lands.
   */
  jam_ring: {
    gain: 0.3,
    priority: 2,
    minGapMs: 300,
    maxVoices: 2,
    layers: [
      {
        wave: 'sawtooth',
        freq: 22,
        glide: 2.2,
        glideSec: 1.8,
        filter: { type: 'bandpass', freq: 2500, q: 4 },
        env: { a: 0.05, d: 1.7, s: 0.8, r: 0.05 },
        gain: 0.6,
      },
      {
        wave: 'sine',
        freq: 660,
        glide: 1.5,
        glideSec: 1.8,
        vibrato: { hz: 6, cents: 12 },
        env: { a: 1.6, d: 0.2, s: 0.5, r: 0.1 },
        gain: 0.3,
      },
      {
        wave: 'noise',
        at: 1.85,
        freq: 440,
        filter: { type: 'bandpass', freq: 1200, q: 2 },
        env: { a: 0.001, d: 0.06, s: 0, r: 0.02 },
        gain: 0.45,
      },
      click(1318.5, 1.92, 0.4, 0.05),
    ],
  },
  /**
   * A tower jammed (TowerJammed): a burst of static and the tower powering down, a thump under it.
   * Rate-limited, so a ring catching four towers is one crackle.
   */
  jammed: {
    gain: 0.32,
    priority: 2,
    minGapMs: 100,
    maxVoices: 2,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 2500, q: 1 },
        env: { a: 0.002, d: 0.35, s: 0, r: 0.05 },
        gain: 0.45,
      },
      {
        wave: 'square',
        freq: 440,
        glide: 0.25,
        glideSec: 0.25,
        filter: { type: 'lowpass', freq: 1500 },
        env: { a: 0.002, d: 0.25, s: 0, r: 0.04 },
        gain: 0.2,
      },
      {
        wave: 'sine',
        freq: 110,
        glide: 0.7,
        glideSec: 0.1,
        env: { a: 0.002, d: 0.12, s: 0, r: 0.04 },
        gain: 0.4,
      },
    ],
  },
  /**
   * The Jammed static (a loop while any tower is jammed, JAM_SOUNDS `static`): faint crackles, one
   * voice however many towers sit dark.
   */
  jam_static: {
    gain: 0.12,
    priority: 0,
    minGapMs: 500,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 3000 },
        env: { a: 0.002, d: 0.04, s: 0, r: 0.01 },
        gain: 0.5,
      },
      {
        wave: 'noise',
        at: 0.13,
        freq: 440,
        filter: { type: 'bandpass', freq: 4500, q: 2 },
        env: { a: 0.002, d: 0.03, s: 0, r: 0.01 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        at: 0.31,
        freq: 440,
        filter: { type: 'highpass', freq: 2200 },
        env: { a: 0.002, d: 0.06, s: 0, r: 0.02 },
        gain: 0.4,
      },
    ],
  },
  /** A jam ends (TowerUnjammed): a small power-on blip, the tower back on the line. */
  jam_clear: {
    gain: 0.18,
    priority: 1,
    minGapMs: 150,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 523.25,
        glide: 1.5,
        glideSec: 0.08,
        env: { a: 0.004, d: 0.1, s: 0, r: 0.04 },
        gain: 0.5,
      },
      click(2093, 0.09, 0.3),
    ],
  },
  /**
   * System Reboot (its cast; from a folder marked "Do Not."): a CRT going dark, the whump of the
   * power cycling, then the boot arpeggio up a C major chord and a held chime: everything back
   * on, all at once.
   */
  reboot: {
    gain: 0.42,
    priority: 2,
    maxVoices: 1,
    duck: 0.6,
    layers: [
      {
        wave: 'sine',
        freq: 1760,
        glide: 0.2,
        glideSec: 0.3,
        env: { a: 0.002, d: 0.3, s: 0, r: 0.04 },
        gain: 0.35,
      },
      {
        wave: 'noise',
        at: 0.28,
        freq: 440,
        filter: { type: 'lowpass', freq: 200, freqEnd: 1800 },
        env: { a: 0.02, d: 0.2, s: 0, r: 0.05 },
        gain: 0.45,
      },
      {
        wave: 'pulse25',
        at: 0.45,
        freq: 523.25,
        steps: [
          [0.08, 1.26],
          [0.16, 1.4983],
          [0.24, 2],
        ],
        filter: { type: 'lowpass', freq: 3000 },
        env: { a: 0.003, d: 0.1, s: 0.6, hold: 0.2, r: 0.06 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        at: 0.75,
        freq: 1046.5,
        vibrato: { hz: 5, cents: 6 },
        env: { a: 0.003, d: 0.6, s: 0.2, hold: 0.1, r: 0.3 },
        gain: 0.4,
      },
    ],
  },

  // ── "Shareholder Value" ──────────────────────────────────────────────────────────────────────
  /**
   * The platform arrives (BossPhase 1): a hydraulic stomp and its hiss, then Sterling's sparkle on
   * the platform's PA, a bright major arpeggio (C–E–G) a little too cheerful.
   */
  sv_arrive: {
    gain: 0.4,
    priority: 2,
    maxVoices: 1,
    duck: 0.6,
    layers: [
      {
        wave: 'sine',
        freq: 55,
        glide: 0.6,
        glideSec: 0.4,
        env: { a: 0.002, d: 0.5, s: 0, r: 0.2 },
        gain: 0.55,
      },
      {
        wave: 'noise',
        at: 0.05,
        freq: 440,
        filter: { type: 'highpass', freq: 2500 },
        env: { a: 0.01, d: 0.4, s: 0, r: 0.1 },
        gain: 0.2,
      },
      {
        wave: 'pulse25',
        at: 0.35,
        freq: 1046.5,
        steps: [
          [0.1, 1.26],
          [0.2, 1.4983],
        ],
        filter: { type: 'bandpass', freq: 1800, q: 1.2 },
        env: { a: 0.003, d: 0.1, s: 0.7, hold: 0.25, r: 0.15 },
        gain: 0.3,
      },
    ],
  },
  /**
   * The hangar door opening (the hangar's launch tell, its last 1.5 s): a motor grinding up and a
   * warning beep, two tones, as the door slides.
   */
  sv_hangar: {
    gain: 0.26,
    priority: 2,
    minGapMs: 400,
    maxVoices: 1,
    layers: [
      {
        wave: 'sawtooth',
        freq: 80,
        glide: 1.6,
        glideSec: 1.3,
        filter: { type: 'lowpass', freq: 600 },
        env: { a: 0.1, d: 1.2, s: 0.5, r: 0.1 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 800, q: 2 },
        env: { a: 0.2, d: 1.1, s: 0.3, r: 0.1 },
        gain: 0.25,
      },
      {
        wave: 'pulse25',
        freq: 987.77,
        steps: [
          [0.25, 0.8909],
          [0.5, 1],
          [0.75, 0.8909],
          [1, 1],
          [1.25, 0.8909],
        ],
        filter: { type: 'lowpass', freq: 2500 },
        env: { a: 0.005, d: 0.1, s: 0.6, hold: 1.2, r: 0.05 },
        gain: 0.18,
      },
    ],
  },
  /** The hangar launches its drones: two quick whooshes and a servo blip. */
  sv_launch: {
    gain: 0.24,
    priority: 1,
    minGapMs: 300,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 500, freqEnd: 3000, q: 2 },
        env: { a: 0.02, d: 0.15, s: 0, r: 0.05 },
        gain: 0.5,
      },
      {
        wave: 'noise',
        at: 0.18,
        freq: 440,
        filter: { type: 'bandpass', freq: 600, freqEnd: 3500, q: 2 },
        env: { a: 0.02, d: 0.15, s: 0, r: 0.05 },
        gain: 0.5,
      },
      click(1568, 0.36, 0.3),
    ],
  },
  /**
   * Phase 2 (BossPhase 2: Hostile Takeover arms): the targeting lens unfolds on its servos, then
   * the PA's corporate two-tone, "bing-bong", falling.
   */
  sv_takeover: {
    gain: 0.34,
    priority: 2,
    maxVoices: 1,
    duck: 0.65,
    layers: [
      {
        wave: 'square',
        freq: 200,
        glide: 2,
        glideSec: 0.3,
        filter: { type: 'lowpass', freq: 900 },
        env: { a: 0.01, d: 0.3, s: 0, r: 0.05 },
        gain: 0.35,
      },
      click(2637, 0.33, 0.4),
      {
        wave: 'sine',
        at: 0.45,
        freq: 1318.5,
        env: { a: 0.003, d: 0.25, s: 0.4, hold: 0.05, r: 0.15 },
        gain: 0.4,
      },
      {
        wave: 'sine',
        at: 0.75,
        freq: 1046.5,
        env: { a: 0.003, d: 0.35, s: 0.3, hold: 0.05, r: 0.25 },
        gain: 0.4,
      },
    ],
  },
  /**
   * Hostile Takeover's laser (TakeoverTell; its 3 s): a charging whine climbing two octaves and
   * swelling, a targeting buzz over it, and the zap as it locks. A Stasis or Unnerved interrupt
   * cuts it dead (JAM_SOUNDS `stops`).
   */
  takeover_laser: {
    gain: 0.3,
    priority: 2,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 300,
        glide: 4,
        glideSec: 2.7,
        env: { a: 2.5, d: 0.05, s: 1, r: 0.2 },
        gain: 0.5,
      },
      {
        wave: 'pulse25',
        freq: 600,
        glide: 4,
        glideSec: 2.7,
        filter: { type: 'lowpass', freq: 1500, freqEnd: 6000 },
        env: { a: 2.5, d: 0.05, s: 1, r: 0.2 },
        gain: 0.2,
      },
      {
        wave: 'sine',
        at: 0.8,
        freq: 2400,
        vibrato: { hz: 12, cents: 30 },
        env: { a: 1.4, d: 0.3, s: 0.5, r: 0.2 },
        gain: 0.12,
      },
      {
        wave: 'square',
        at: 2.72,
        freq: 1760,
        glide: 0.5,
        glideSec: 0.12,
        filter: { type: 'lowpass', freq: 4000 },
        env: { a: 0.001, d: 0.15, s: 0, r: 0.05 },
        gain: 0.3,
      },
    ],
  },
  /**
   * The platform jettisons its plating (Jettisoned): two clanks as the plates let go, the hiss of
   * the bolts, and a panicking beep-boop alarm.
   */
  jettison: {
    gain: 0.38,
    priority: 2,
    maxVoices: 1,
    duck: 0.7,
    layers: [
      {
        wave: 'square',
        freq: 330,
        filter: { type: 'bandpass', freq: 2200, q: 5 },
        env: { a: 0.001, d: 0.15, s: 0, r: 0.08 },
        gain: 0.35,
      },
      {
        wave: 'square',
        at: 0.12,
        freq: 294,
        filter: { type: 'bandpass', freq: 2000, q: 5 },
        env: { a: 0.001, d: 0.15, s: 0, r: 0.08 },
        gain: 0.35,
      },
      {
        wave: 'noise',
        at: 0.08,
        freq: 440,
        filter: { type: 'highpass', freq: 3500 },
        env: { a: 0.02, d: 0.7, s: 0, r: 0.2 },
        gain: 0.25,
      },
      {
        wave: 'pulse25',
        at: 0.35,
        freq: 1568,
        steps: [
          [0.1, 1.26],
          [0.2, 1],
          [0.3, 1.26],
          [0.4, 1],
        ],
        filter: { type: 'lowpass', freq: 3000 },
        env: { a: 0.003, d: 0.1, s: 0.7, hold: 0.35, r: 0.05 },
        gain: 0.2,
      },
    ],
  },
  /**
   * A plate lands (TileOpened: the crash site): a heavy thud, the crunch, and a metal ring.
   * Staggered when several land together (PLATE_SOUNDS).
   */
  plate_crash: {
    gain: 0.36,
    priority: 2,
    minGapMs: 80,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'sine',
        freq: 70,
        glide: 0.5,
        glideSec: 0.25,
        env: { a: 0.002, d: 0.35, s: 0, r: 0.1 },
        gain: 0.55,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 700 },
        env: { a: 0.002, d: 0.2, s: 0, r: 0.08 },
        gain: 0.35,
      },
      {
        wave: 'square',
        at: 0.01,
        freq: 523.25,
        filter: { type: 'bandpass', freq: 2500, q: 6 },
        env: { a: 0.001, d: 0.3, s: 0, r: 0.15 },
        gain: 0.15,
      },
    ],
  },
  /**
   * Driven off (BossEnded `driveOff`): the engines whining away and a comic falling beep, the
   * platform limping home. Then the PA's frantic stutter (the `pa_frantic` cue).
   */
  sv_retreat: {
    gain: 0.32,
    priority: 2,
    maxVoices: 1,
    layers: [
      {
        wave: 'sawtooth',
        freq: 220,
        glide: 0.4,
        glideSec: 1.4,
        filter: { type: 'lowpass', freq: 1200 },
        env: { a: 0.02, d: 1.3, s: 0, r: 0.2 },
        gain: 0.35,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 600, q: 1.5 },
        env: { a: 0.02, d: 1.2, s: 0, r: 0.2 },
        gain: 0.25,
      },
      {
        wave: 'pulse25',
        at: 0.2,
        freq: 784,
        steps: [
          [0.15, 0.75],
          [0.3, 0.5],
        ],
        filter: { type: 'lowpass', freq: 2500 },
        env: { a: 0.003, d: 0.1, s: 0.6, hold: 0.3, r: 0.08 },
        gain: 0.25,
      },
    ],
  },

  // ── The Gathering Maw ────────────────────────────────────────────────────────────────────────
  /**
   * The Gathering Maw arrives (BossPhase 1): three wrong voices swelling together, a breath under
   * them. The Hollow's chord, and far too big.
   */
  gmaw_arrive: {
    gain: 0.42,
    priority: 2,
    maxVoices: 1,
    duck: 0.55,
    layers: [
      {
        wave: 'sine',
        freq: 55,
        env: { a: 0.6, d: 1.2, s: 0, r: 0.4 },
        gain: 0.4,
      },
      {
        wave: 'triangle',
        freq: 55 * 1.03,
        vibrato: { hz: 1.5, cents: 20 },
        env: { a: 0.6, d: 1.2, s: 0, r: 0.4 },
        gain: 0.3,
      },
      {
        wave: 'triangle',
        freq: 82.41 * 0.98,
        env: { a: 0.7, d: 1.1, s: 0, r: 0.4 },
        gain: 0.25,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 400, freqEnd: 1500, q: 2 },
        env: { a: 0.6, d: 0.8, s: 0, r: 0.3 },
        gain: 0.25,
      },
    ],
  },
  /**
   * Phase 2 (BossPhase 2: the split's telegraph): two voices straining apart, one up and one down,
   * beating harder, and a creak.
   */
  gmaw_strain: {
    gain: 0.3,
    priority: 2,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 110,
        glide: 1.06,
        glideSec: 1.3,
        env: { a: 0.5, d: 0.9, s: 0.3, r: 0.15 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: 110,
        glide: 0.94,
        glideSec: 1.3,
        env: { a: 0.5, d: 0.9, s: 0.3, r: 0.15 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        at: 0.3,
        freq: 440,
        filter: { type: 'bandpass', freq: 500, q: 5 },
        env: { a: 0.3, d: 0.8, s: 0, r: 0.1 },
        gain: 0.3,
      },
    ],
  },
  /** The split (BossSplit): a wet tear, and three voices falling away from each other. */
  gmaw_split: {
    gain: 0.38,
    priority: 2,
    maxVoices: 1,
    duck: 0.7,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 300, freqEnd: 3000, q: 1.5 },
        env: { a: 0.005, d: 0.3, s: 0, r: 0.1 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        at: 0.02,
        freq: 98,
        glide: 0.7,
        glideSec: 0.7,
        env: { a: 0.005, d: 0.8, s: 0, r: 0.2 },
        gain: 0.35,
      },
      {
        wave: 'triangle',
        at: 0.05,
        freq: 116.54,
        glide: 0.75,
        glideSec: 0.7,
        env: { a: 0.005, d: 0.8, s: 0, r: 0.2 },
        gain: 0.25,
      },
      {
        wave: 'triangle',
        at: 0.08,
        freq: 146.83 * 1.015,
        glide: 0.8,
        glideSec: 0.7,
        env: { a: 0.005, d: 0.8, s: 0, r: 0.2 },
        gain: 0.2,
      },
    ],
  },
  /**
   * The merge (BossMerged): the three voices sliding together into one low tone, and the thump as
   * it closes.
   */
  gmaw_merge: {
    gain: 0.4,
    priority: 2,
    maxVoices: 1,
    duck: 0.6,
    layers: [
      {
        wave: 'sine',
        freq: 82.41 * 1.2,
        glide: 1 / 1.2,
        glideSec: 0.9,
        env: { a: 0.3, d: 0.8, s: 0.2, r: 0.2 },
        gain: 0.3,
      },
      {
        wave: 'triangle',
        freq: 82.41 * 0.83,
        glide: 1 / 0.83,
        glideSec: 0.9,
        env: { a: 0.3, d: 0.8, s: 0.2, r: 0.2 },
        gain: 0.3,
      },
      {
        wave: 'sine',
        freq: 82.41,
        env: { a: 0.3, d: 1, s: 0.2, r: 0.3 },
        gain: 0.25,
      },
      {
        wave: 'sine',
        at: 0.95,
        freq: 49,
        glide: 0.5,
        glideSec: 0.3,
        env: { a: 0.002, d: 0.4, s: 0, r: 0.15 },
        gain: 0.5,
      },
    ],
  },

  // ── The warren's towers ──────────────────────────────────────────────────────────────────────
  /** A Sproing leaper bonks an enemy (LeaperBonk): a spring's boing, wobbling, and a small thump. */
  leaper_boing: {
    gain: 0.22,
    priority: 1,
    minGapMs: 90,
    maxVoices: 2,
    jitter: 1.5,
    layers: [
      {
        wave: 'triangle',
        freq: 196,
        glide: 2.5,
        glideSec: 0.12,
        vibrato: { hz: 18, cents: 60 },
        env: { a: 0.002, d: 0.22, s: 0, r: 0.05 },
        gain: 0.55,
      },
      {
        wave: 'sine',
        freq: 110,
        glide: 0.7,
        glideSec: 0.05,
        env: { a: 0.001, d: 0.06, s: 0, r: 0.02 },
        gain: 0.4,
      },
    ],
  },
  /** A bonk Pins a flyer to the ground (FlyerGrounded): a dull thud as it lands. */
  grounded_thud: {
    gain: 0.22,
    priority: 1,
    minGapMs: 120,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 98,
        glide: 0.6,
        glideSec: 0.1,
        env: { a: 0.002, d: 0.14, s: 0, r: 0.04 },
        gain: 0.55,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 500 },
        env: { a: 0.002, d: 0.08, s: 0, r: 0.03 },
        gain: 0.35,
      },
    ],
  },
  /** The Gloop Spitter's glob (its shot): a wet "ptoo" and a falling blorp. */
  gloop_spit: {
    gain: 0.22,
    priority: 1,
    minGapMs: 60,
    maxVoices: 3,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 900, q: 2 },
        env: { a: 0.002, d: 0.06, s: 0, r: 0.02 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: 330,
        glide: 0.5,
        glideSec: 0.12,
        env: { a: 0.003, d: 0.13, s: 0, r: 0.03 },
        gain: 0.5,
      },
    ],
  },
  /** The glob lands: a wet splat. */
  gloop_splat: {
    gain: 0.24,
    priority: 1,
    minGapMs: 80,
    maxVoices: 2,
    jitter: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 700 },
        env: { a: 0.002, d: 0.18, s: 0, r: 0.05 },
        gain: 0.45,
      },
      {
        wave: 'sine',
        freq: 160,
        glide: 0.6,
        glideSec: 0.15,
        env: { a: 0.002, d: 0.16, s: 0, r: 0.04 },
        gain: 0.45,
      },
    ],
  },
  /** Big Glorp's puddle spreads (PuddleSpawned): an acid sizzle, faint; one voice. */
  puddle_hiss: {
    gain: 0.14,
    priority: 1,
    minGapMs: 400,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 2500 },
        env: { a: 0.05, d: 0.5, s: 0, r: 0.1 },
        gain: 0.45,
      },
      {
        wave: 'noise',
        at: 0.05,
        freq: 440,
        filter: { type: 'bandpass', freq: 5000, q: 4 },
        env: { a: 0.02, d: 0.4, s: 0, r: 0.1 },
        gain: 0.3,
      },
    ],
  },

  // ── Everglow Security on the field (loops) ───────────────────────────────────────────────────
  /** A Liability-Class Enforcer walking (a loop): a heavy hydraulic step, the servo grunting. */
  liability_stomp: {
    gain: 0.2,
    priority: 0,
    minGapMs: 600,
    maxVoices: 1,
    jitter: 0.3,
    layers: [
      {
        wave: 'sine',
        freq: 60,
        glide: 0.7,
        glideSec: 0.15,
        env: { a: 0.002, d: 0.18, s: 0, r: 0.05 },
        gain: 0.55,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'lowpass', freq: 250 },
        env: { a: 0.002, d: 0.1, s: 0, r: 0.04 },
        gain: 0.35,
      },
      {
        wave: 'square',
        at: 0.05,
        freq: 120,
        glide: 1.4,
        glideSec: 0.08,
        filter: { type: 'lowpass', freq: 500 },
        env: { a: 0.004, d: 0.09, s: 0, r: 0.03 },
        gain: 0.25,
      },
    ],
  },
  /** An Asset Recovery Gunship in the air (a loop): its rotor's chop, one voice for the flight. */
  gunship_rotor: {
    gain: 0.14,
    priority: 0,
    minGapMs: 200,
    maxVoices: 1,
    layers: [
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'bandpass', freq: 400, q: 1.5 },
        env: { a: 0.005, d: 0.06, s: 0, r: 0.02 },
        gain: 0.5,
      },
      {
        wave: 'sine',
        freq: 70,
        env: { a: 0.003, d: 0.05, s: 0, r: 0.02 },
        gain: 0.4,
      },
    ],
  },
  /**
   * A hidden Black Budget Operative (its cloak's sound, ENEMY_CLOAK_SOUNDS, in place of the
   * footsteps): active camouflage shimmering, two high tones beating, faint.
   */
  bb_shimmer: {
    gain: 0.1,
    priority: 0,
    minGapMs: 400,
    maxVoices: 1,
    layers: [
      {
        wave: 'triangle',
        freq: 2093,
        vibrato: { hz: 9, cents: 40 },
        env: { a: 0.1, d: 0.3, s: 0, r: 0.05 },
        gain: 0.45,
      },
      {
        wave: 'triangle',
        freq: 2093 * 1.0059,
        env: { a: 0.1, d: 0.3, s: 0, r: 0.05 },
        gain: 0.4,
      },
      {
        wave: 'noise',
        freq: 440,
        filter: { type: 'highpass', freq: 6000 },
        env: { a: 0.05, d: 0.25, s: 0, r: 0.05 },
        gain: 0.2,
      },
    ],
  },
  /**
   * A Maintenance Associate on the field (a loop): its repair aura's hum and a small rising chime,
   * so the healer can be found by ear.
   */
  associate_hum: {
    gain: 0.14,
    priority: 0,
    minGapMs: 1000,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 233.08,
        vibrato: { hz: 5, cents: 8 },
        env: { a: 0.2, d: 0.4, s: 0, r: 0.1 },
        gain: 0.5,
      },
      {
        wave: 'triangle',
        at: 0.3,
        freq: 932.33,
        glide: 1.5,
        glideSec: 0.15,
        env: { a: 0.005, d: 0.2, s: 0, r: 0.08 },
        gain: 0.3,
      },
    ],
  },

  // ── The story ────────────────────────────────────────────────────────────────────────────────
  /**
   * A bearer home (BearerHome): one hummed note of the six, in tune, a struck glass partial over
   * it. Each one home sings the next note (BEARER_SOUNDS), so a group carried home sings the
   * phrase the vats hummed all day, right this time.
   */
  bearer_note: {
    gain: 0.3,
    priority: 2,
    maxVoices: 3,
    layers: [
      {
        wave: 'sine',
        freq: 392,
        vibrato: { hz: 4.5, cents: 10 },
        env: { a: 0.06, d: 0.2, s: 0.7, hold: 0.35, r: 0.4 },
        gain: 0.55,
      },
      {
        wave: 'triangle',
        freq: 784,
        env: { a: 0.06, d: 0.3, s: 0.3, hold: 0.2, r: 0.3 },
        gain: 0.12,
      },
      {
        wave: 'sine',
        freq: 1176,
        env: { a: 0.002, d: 0.5, s: 0, r: 0.2 },
        gain: 0.15,
      },
    ],
  },
  /**
   * Gerald's delivery (A3M4: he leaves having delivered the Sergeant's mail; NeutralExited there):
   * his whistle's first note, the soft thup of an envelope dropped in its slot, and a bell.
   */
  mail_delivered: {
    gain: 0.3,
    priority: 2,
    maxVoices: 1,
    layers: [
      {
        wave: 'sine',
        freq: 1046.5,
        glide: 1.5,
        glideSec: 0.12,
        vibrato: { hz: 7, cents: 15 },
        env: { a: 0.02, d: 0.1, s: 0.7, hold: 0.08, r: 0.06 },
        gain: 0.4,
      },
      {
        wave: 'noise',
        at: 0.32,
        freq: 440,
        filter: { type: 'bandpass', freq: 1200, q: 1.5 },
        env: { a: 0.003, d: 0.05, s: 0, r: 0.02 },
        gain: 0.4,
      },
      {
        wave: 'sine',
        at: 0.45,
        freq: 1568,
        env: { a: 0.002, d: 0.6, s: 0.2, hold: 0.1, r: 0.4 },
        gain: 0.4,
      },
      {
        wave: 'sine',
        at: 0.6,
        freq: 2093,
        env: { a: 0.002, d: 0.6, s: 0.1, hold: 0.05, r: 0.5 },
        gain: 0.3,
      },
    ],
  },
  /**
   * Pebble's "Knock knock!" (A3M6 w02, LINE_SFX): two knocks on a dome's door, heard as a line
   * (priority 3, like a blip); her squeak, the blip, follows.
   */
  knock_knock: {
    gain: 0.36,
    priority: 3,
    maxVoices: 1,
    layers: [...knock(0), ...knock(0.2)],
  },
} as const satisfies Readonly<Record<string, SfxRecipe>>;
