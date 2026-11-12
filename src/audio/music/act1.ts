// Act I music (the Long Afternoon: bright and bouncy, art-direction §3), all built on "Everglow
// Bright" (story/bible.md §8): the six-note phrase "Ev-er-glow, Ev-er-glow" is G–C–E, F–D–C, and
// the couplet answers "brighter every day" (E–F–G–A–G) and "clearing the way" (D–E–D–C).
// Eight bars over C | F | Am | G | C | F | G | C, so every loop resolves home and wraps cleanly.
import type { Song } from '../types.ts';
import { CHOIR_LINE_BRIGHT } from './act3.ts';
import { KIT } from './instruments.ts';

/** The couplet melody in 8ths (the lead of both themes): the PA's "Everglow Bright". */
export const COUPLET =
  'G4 C5 E5 - - - . . | F5 D5 C5 - - - . . | E5 F5 G5 A5 G5 - E5 - | D5 - B4 - G4 - . . |' +
  'G4 C5 E5 - - - . . | F5 D5 C5 - - - A4 C5 | D5 E5 D5 C5 B4 - D5 - | C5 - - - . . . .';

/** Bouncing octave bass in 8ths. */
const BOUNCE_BASS =
  'C2 C3 C2 C3 C2 C3 G2 C3 | F2 F3 F2 F3 F2 F3 C3 F3 | A2 A3 A2 A3 A2 A3 E3 A3 | G2 G3 G2 G3 B2 - D3 - |' +
  'C2 C3 C2 C3 C2 C3 G2 C3 | F2 F3 F2 F3 F2 F3 C3 F3 | G2 G3 G2 G3 G2 G3 D3 G3 | C2 C3 C2 C3 G2 - B2 -';

/** Offbeat stabs, two chord tones per bar. */
const stabs = (tones: readonly string[]): string =>
  tones.map((t) => `. ${t} . ${t} . ${t} . ${t}`).join(' | ');

const STAB_HI = stabs(['G4', 'A4', 'A4', 'G4', 'G4', 'A4', 'G4', 'G4']);
const STAB_LO = stabs(['E4', 'F4', 'E4', 'D4', 'E4', 'F4', 'D4', 'E4']);

const BEAT = 'k . h . s . h . k . k h s . h h';
const FILL = 'k . h . s . h . k . s . s s s s';

/** The Act I battle loop: base (bass and stabs), then drums in waves, then the lead (W6–W7). */
export const ACT1_BATTLE: Song = {
  id: 'act1_battle',
  bpm: 140,
  bars: 8,
  loop: true,
  tracks: [
    { layer: 'base', instrument: 'bass', stepsPerToken: 2, gain: 0.8, pattern: BOUNCE_BASS },
    { layer: 'base', instrument: 'stab', stepsPerToken: 2, gain: 0.5, pattern: STAB_HI },
    { layer: 'base', instrument: 'stab', stepsPerToken: 2, gain: 0.45, pattern: STAB_LO },
    {
      layer: 'drums',
      instrument: 'kick',
      kit: KIT,
      stepsPerToken: 1,
      gain: 0.9,
      pattern: [BEAT, BEAT, BEAT, FILL, BEAT, BEAT, BEAT, FILL].join(' | '),
    },
    { layer: 'lead', instrument: 'lead', stepsPerToken: 2, gain: 0.6, pattern: COUPLET },
    // The Hum Choir's harmony line, while a Choir stands (T650).
    ...CHOIR_LINE_BRIGHT,
  ],
};

/** Held chord tones in quarters (the title's calm bed). */
export const PAD_LO =
  'E4 - - - | F4 - - - | E4 - - - | D4 - - - | E4 - - - | F4 - - - | D4 - - - | E4 - - -';
export const PAD_HI =
  'G4 - - - | A4 - - - | A4 - - - | G4 - - - | G4 - - - | A4 - - - | B4 - - - | G4 - - -';
export const WALK_BASS =
  'C3 - G2 - | F2 - C3 - | A2 - E3 - | G2 - D3 - | C3 - G2 - | F2 - C3 - | G2 - D3 - | C3 - G2 -';

/** The title theme: the same tune, slower and softer, on held chords (no drums). */
export const TITLE_THEME: Song = {
  id: 'title',
  bpm: 108,
  bars: 8,
  loop: true,
  tracks: [
    { layer: 'base', instrument: 'bass', stepsPerToken: 4, gain: 0.6, pattern: WALK_BASS },
    { layer: 'base', instrument: 'pad', stepsPerToken: 4, gain: 0.6, pattern: PAD_LO },
    { layer: 'base', instrument: 'pad', stepsPerToken: 4, gain: 0.5, pattern: PAD_HI },
    { layer: 'lead', instrument: 'lead', stepsPerToken: 2, gain: 0.5, pattern: COUPLET },
  ],
};
