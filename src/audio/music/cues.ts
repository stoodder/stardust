// One-shot music cues: the wave-clear sting, the win jingle, the loss sting, and the boss sting. The
// wave-clear sting is the first "Everglow Bright" arrangement (`bright_sting`, architecture.md §
// Audio); the later acts' arrangements join this file as their acts are built.
import type { Song } from '../types.ts';
import { KIT } from './instruments.ts';

/** Act I's wave-clear sting: the six notes, "Ev-er-glow, Ev-er-glow!", bright and corporate. */
export const BRIGHT_STING: Song = {
  id: 'bright_sting',
  bpm: 150,
  bars: 2,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'chime',
      stepsPerToken: 2,
      gain: 0.7,
      pattern: 'G5 C6 E6 - F6 D6 C6 - | - - . . . . . .',
    },
    {
      layer: 'base',
      instrument: 'bass',
      stepsPerToken: 2,
      gain: 0.6,
      pattern: 'C3 - - - F2 - C3 - | - - . . . . . .',
    },
  ],
};

/** The win jingle (PERIMETER SECURED!): the phrase, then up to a held high C, with a drum hit. */
export const WIN_JINGLE: Song = {
  id: 'win',
  bpm: 160,
  bars: 3,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'lead',
      stepsPerToken: 2,
      gain: 0.65,
      pattern: 'G4 C5 E5 - F5 D5 C5 - | E5 G5 C6 - - - - - | - - - . . . . .',
    },
    {
      layer: 'lead',
      instrument: 'brass',
      stepsPerToken: 2,
      gain: 0.45,
      pattern: 'E4 G4 C5 - D5 B4 G4 - | C5 E5 G5 - - - - - | - - - . . . . .',
    },
    {
      layer: 'base',
      instrument: 'bass',
      stepsPerToken: 2,
      gain: 0.7,
      pattern: 'C3 - C3 - G2 - G2 - | C3 - G2 - C2 - - - | - - . . . . . .',
    },
    {
      layer: 'drums',
      instrument: 'kick',
      kit: KIT,
      stepsPerToken: 1,
      gain: 0.8,
      pattern:
        'k . . . s . . . k . . . s . s s | k . . . . . . . o . . . . . . . | . . . . . . . . . . . . . . . .',
    },
  ],
};

/**
 * The loss sting (MINOR OPERATIONAL HICCUP): a comic sad trombone, four sagging notes. Funny,
 * never scolding (story/style-guide.md §2, Act I).
 */
export const LOSE_STING: Song = {
  id: 'lose',
  bpm: 112,
  bars: 2,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'wah',
      stepsPerToken: 4,
      gain: 0.7,
      pattern: 'G4 F#4 F4 E4 | - - . .',
    },
    {
      layer: 'base',
      instrument: 'bass',
      stepsPerToken: 4,
      gain: 0.6,
      pattern: 'G2 F#2 F2 E2 | - - . .',
    },
  ],
};

/**
 * The boss sting (Chitterbloom driven off, BossEnded; T314): "Everglow Bright" as a brass fanfare,
 * triumphant, but it climbs and stops a step short of home, on a held D over the dominant: Act I's
 * held breath before the Quiet Wave (act1.md § A1M5: "triumph, then a held breath").
 */
export const BOSS_STING: Song = {
  id: 'boss_sting',
  bpm: 150,
  bars: 3,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'brass',
      stepsPerToken: 2,
      gain: 0.55,
      pattern: 'G4 C5 E5 - F5 D5 C5 E5 | G5 - - - F5 - D5 - | - - - - - . . .',
    },
    {
      layer: 'lead',
      instrument: 'chime',
      stepsPerToken: 2,
      gain: 0.35,
      pattern: 'G5 C6 E6 - F6 D6 C6 E6 | G6 - - - F6 - D6 - | - - . . . . . .',
    },
    {
      layer: 'base',
      instrument: 'bass',
      stepsPerToken: 2,
      gain: 0.6,
      pattern: 'C3 - C3 - F2 - F2 - | E2 - - - G2 - - - | G2 - - - - . . .',
    },
    {
      layer: 'drums',
      instrument: 'kick',
      kit: KIT,
      stepsPerToken: 1,
      gain: 0.7,
      pattern:
        'k . . . s . . . k . . . s . s s | k . . . . . . . s s s s s s s s | o . . . . . . . . . . . . . . .',
    },
  ],
};
