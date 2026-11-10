// Act II music (the Long Dusk: adventurous, then uneasy; story/bible.md §6), still built on
// "Everglow Bright" (§8: "the same with minor-key bridges"). The battle loop keeps Act I's couplet
// as its lead, but the harmony borrows from the minor: bar 3 bends "brighter every day" over F
// minor, bar 6 sags "Ev-er-glow" over A-flat, and the loop ends on the leading tone instead of
// home, so every pass leans forward into the next. Eight bars over
// C | F | Fm | G | C | Ab | Fm | G, driving eighths in the bass where Act I bounced octaves.
import type { Song } from '../types.ts';
import { KIT } from './instruments.ts';

/** The couplet with minor bridges (the lead): bars 1–2 and 5 as Act I sang them. */
const COUPLET_MINOR =
  'G4 C5 E5 - - - . . | F5 D5 C5 - - - . . | Eb5 F5 G5 Ab5 G5 - Eb5 - | D5 - B4 - G4 - . . |' +
  'G4 C5 E5 - - - . . | F5 Eb5 C5 - - - Ab4 C5 | D5 Eb5 D5 C5 B4 - D5 - | C5 - - - B4 - - -';

/** Driving root eighths with a lift on the off-beat octave. */
const DRIVE_BASS =
  'C2 C2 C3 C2 C2 C2 G2 C2 | F2 F2 F3 F2 F2 F2 C3 F2 | F2 F2 F3 F2 Ab2 - C3 - | G2 G2 G3 G2 G2 G2 D3 B2 |' +
  'C2 C2 C3 C2 C2 C2 G2 C2 | Ab2 Ab2 Ab3 Ab2 Ab2 Ab2 Eb3 Ab2 | F2 F2 F3 F2 Ab2 - C3 - | G2 G2 G3 G2 B2 - D3 -';

/** Offbeat stabs, two chord tones per bar. */
const stabs = (tones: readonly string[]): string =>
  tones.map((t) => `. ${t} . ${t} . ${t} . ${t}`).join(' | ');

const STAB_HI = stabs(['G4', 'A4', 'Ab4', 'G4', 'G4', 'Ab4', 'Ab4', 'B4']);
const STAB_LO = stabs(['E4', 'F4', 'F4', 'D4', 'E4', 'Eb4', 'F4', 'D4']);

const BEAT = 'k . h . s . h k k . h . s . h h';
const FILL = 'k . h k s . h k k . s . s s o .';

/** The Act II battle loop: base (bass and stabs), drums in waves, the lead for the final waves. */
export const ACT2_BATTLE: Song = {
  id: 'act2_battle',
  bpm: 132,
  bars: 8,
  loop: true,
  tracks: [
    { layer: 'base', instrument: 'bass', stepsPerToken: 2, gain: 0.8, pattern: DRIVE_BASS },
    { layer: 'base', instrument: 'stab', stepsPerToken: 2, gain: 0.45, pattern: STAB_HI },
    { layer: 'base', instrument: 'stab', stepsPerToken: 2, gain: 0.4, pattern: STAB_LO },
    {
      layer: 'drums',
      instrument: 'kick',
      kit: KIT,
      stepsPerToken: 1,
      gain: 0.85,
      pattern: [BEAT, BEAT, BEAT, FILL, BEAT, BEAT, BEAT, FILL].join(' | '),
    },
    { layer: 'lead', instrument: 'lead', stepsPerToken: 2, gain: 0.55, pattern: COUPLET_MINOR },
  ],
};
