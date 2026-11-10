// Act II's story cues (T550): the PA's shift change in minor that closes the act (A2M6's stinger),
// C2's two stings on the Results card, and Pebble's four-note hum, the home motif. Story moments
// play them (audio/storyCues.ts), never a wave clear.
import type { Song } from '../types.ts';

/**
 * Pebble's hum (act2.md § A2M6, `base_a2_whistle`: "Hm. Hm-hm. Hmmm."): the Skitterkin's family
 * hum, the home motif. Four notes in A minor's pentatonic, the relative minor of the jingle's C,
 * so it can sit under or answer "Everglow Bright" in Act III and the finale: one, a step up two,
 * and back home, held. Not the jingle, and never bent out of tune (the Hollow's hum is). Written
 * once here: later arrangements take these notes, not a copy of them.
 */
export const HOME_MOTIF = ['A3', 'C4', 'D4', 'A3'] as const;

const [H1, H2, H3, H4] = HOME_MOTIF;

/**
 * The home motif as Pebble hums it (a cue, played as her line shows): "Hm." a quarter, "Hm-hm."
 * two eighths, "Hmmm." held, on the `hum` voice, alone and unhurried.
 */
export const HOME_HUM: Song = {
  id: 'home_hum',
  bpm: 100,
  bars: 2,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.75,
      pattern: `${H1} - ${H2} ${H3} ${H4} - - - | - - . . . . . .`,
    },
  ],
};

/**
 * The PA's shift change in minor (act2.md § A2M6, the stinger: "The jingle plays once, over the
 * dark. In minor."): the six notes on the colony's tinny PA, slow, the third flattened, then the
 * couplet's last words sinking an octave ("clearing the way") and stopping on the low tonic, with
 * the PA's own slap echo off the empty domes an eighth behind, over a dark low drone. Not the
 * wave-clear sting: nobody is cheering, and the shift changes anyway.
 */
export const PA_SHIFT_MINOR: Song = {
  id: 'pa_shift_minor',
  bpm: 100,
  bars: 2,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'pa',
      stepsPerToken: 2,
      gain: 0.7,
      pattern: 'G4 C5 Eb5 - F5 D5 C5 - | Eb4 - D4 - C4 - - .',
    },
    {
      layer: 'lead',
      instrument: 'pa',
      stepsPerToken: 2,
      gain: 0.22,
      pattern: '. G4 C5 Eb5 - F5 D5 C5 | - Eb4 - D4 - C4 - .',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.5,
      pattern: 'C3 - - - Ab2 - - - | F2 - - - C2 - - .',
    },
  ],
};

/**
 * C2, sold at market (A2M4's Results, Zibzab's Price): Zibzab's coin twice, then the harmony
 * drops into minor and stops on the dominant, unresolved. A shrug, never a judgement (style-guide
 * §2: never scold the player).
 */
export const C2_SOLD: Song = {
  id: 'c2_sold',
  bpm: 120,
  bars: 2,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'chime',
      stepsPerToken: 2,
      gain: 0.45,
      pattern: 'E6 C7 . . . . . . | . . . . . . . .',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.55,
      pattern: '. . C4 - - - Ab3 - | G3 - - - - . . .',
    },
    {
      layer: 'base',
      instrument: 'bass',
      stepsPerToken: 2,
      gain: 0.45,
      pattern: '. . C3 - - - F2 - | G2 - - - - . . .',
    },
  ],
};

/**
 * C2, carried home (A2M4's Results): the home motif on glass, an octave up and soft, over F major
 * settling to A, the stardust sung home. Its first hearing in the campaign; Pebble hums it in A2M6, and
 * the player who carried it home has heard it before.
 */
export const C2_RETURNED: Song = {
  id: 'c2_returned',
  bpm: 100,
  bars: 2,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.5,
      pattern: 'A4 - C5 D5 A4 - - - | - - . . . . . .',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.45,
      pattern: 'C4 - - - - - - - | E4 - - - . . . .',
    },
    {
      layer: 'base',
      instrument: 'bass',
      stepsPerToken: 2,
      gain: 0.4,
      pattern: 'F2 - - - - - - - | A2 - - - . . . .',
    },
  ],
};
