// Act III, part two's music (T750; A3M4–A3M6). Still silence-forward (the jingle has stopped; a
// win plays nothing), but each map's bed carries its story:
// - **The shelters** (A3M4, `act3_shelters`): Act III's bed, slower and lower, with Bricks's hum
//   in bars 5–6 starting the six notes in his register (G2–C3–E3) and stopping there. Nobody
//   finishes the phrase, unless a Hum Choir stands: the Choir's line starts with him and sings
//   the rest. His silences on the radio are truly silent: the music falls away under them
//   (storyCues.ts SILENCE_HUSHES).
// - **The vats at night** (A3M5, `act3_vats`): "The vats hum. Same six notes, all day." The
//   machine hums Everglow's jingle low and relentless, in its own key, over Act III's A minor;
//   a heartbeat and a piston tick drive it. The first map that feels like hitting back.
// - **The domes** (A3M6): Act III's own bed; its story is two cues. `domes_open`, as the first
//   refugee is let into Dome 1, is Act III's first warm cadence: the six notes' end, F–D–C,
//   landing home over IV–V–I in C major (Act I's sting stopped a step short of home; this one
//   arrives). `waykeeper`, as the callsign plate turns: the home motif lifting out of A minor
//   into C major, and the jingle's first notes on glass, rising.
// And two endings: `pa_frantic`, Shareholder Value's PA stuttering its chime up a semitone at a
// time as the platform is driven off; `gmaw_beaten`, the Gathering Maw at rest (it ends with no
// BossEnded): the Hollow's two wrong voices, in tune at last, finishing the phrase.
import type { Song } from '../types.ts';
import { CHOIR_PHRASE, CHOIR_TENTHS, octaveUp, REST, rests } from './act3.ts';
import { HOME_MOTIF } from './cuesAct2.ts';

/** The home motif on glass, an octave up, over two bars (the lead in the final waves). */
const motifBars = (): string => {
  const [h1, h2, h3, h4] = HOME_MOTIF.map(octaveUp);
  return `${h1} - - - ${h2} - ${h3} - | ${h4} - - - - - . .`;
};

/** The heartbeat (Act III's drums layer): a lub-dub every half bar, for `bars` bars. */
const heart = (bars: number, lub: boolean): string =>
  Array.from({ length: bars }, () =>
    lub ? 'b . . . . . . . b . . . . . . .' : '. . b . . . . . . . b . . . . .',
  ).join(' | ');

/**
 * A3M4 *Empty Slot*: Act III's harmony (Am | F | C | G | Am | F | Dm | E), slower, the drone
 * lower and longer, the far glass note in bars 3 and 7; Bricks's hum in bars 5–6, half a phrase.
 */
export const ACT3_SHELTERS: Song = {
  id: 'act3_shelters',
  bpm: 66,
  bars: 8,
  loop: true,
  tracks: [
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.55,
      pattern:
        'A2 - - - - - - . | F2 - - - - - - . | C3 - - - - - - . | G2 - - - - - - . |' +
        'A2 - - - - - - . | F2 - - - - - - . | D3 - - - - - - . | E2 - - - - - - .',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.25,
      pattern:
        '. . . . C4 - - . | . . . . A3 - - . | . . . . E4 - - . | . . . . D4 - - . |' +
        `${REST} | ${REST} | . . . . F3 - - . | . . . . G#3 - - .`,
    },
    {
      layer: 'base',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.2,
      pattern: `${rests(2)} | . . . . . . E5 - | ${rests(3)} | . . . . . . A4 - | ${REST}`,
    },
    // Bricks: "Ev-er-glow" in his register, the door hum's G2, and then nothing.
    {
      layer: 'base',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.32,
      pattern: `${rests(4)} | G2 C3 E3 - - - . . | ${rests(3)}`,
    },
    {
      layer: 'drums',
      instrument: 'heart',
      kit: { b: 'heart' },
      stepsPerToken: 1,
      gain: 0.45,
      pattern: heart(8, true),
    },
    {
      layer: 'drums',
      instrument: 'heart',
      kit: { b: 'heart' },
      stepsPerToken: 1,
      gain: 0.25,
      pattern: heart(8, false),
    },
    {
      layer: 'lead',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.38,
      pattern: `${rests(2)} | ${motifBars()} | ${rests(2)} | ${motifBars()}`,
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.55,
      pattern: `${CHOIR_PHRASE} | ${rests(2)} | ${CHOIR_PHRASE} | ${rests(2)}`,
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.4,
      pattern: `${CHOIR_TENTHS} | ${rests(2)} | ${CHOIR_TENTHS} | ${rests(2)}`,
    },
  ],
};

/** The vats' six notes, low, as a machine hums them: two bars, the phrase and a breath. */
const VATS_HUM = 'G2 . C3 . E3 - F3 . | D3 . C3 - - - . .';

/**
 * A3M5 *Unsung*, Second Harvest at night: Am | Am | F | E under the vats' hum of the six notes
 * (the bass voice, low and buzzing), a heartbeat and a quiet piston tick on the offbeats, the far
 * glass, the home motif in the final waves and the Choir's line where a Choir stands.
 */
export const ACT3_VATS: Song = {
  id: 'act3_vats',
  bpm: 84,
  bars: 8,
  loop: true,
  tracks: [
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.5,
      pattern:
        'A2 - - - - - - . | A2 - - - - - - . | F2 - - - - - - . | E2 - - - - - - . |' +
        'A2 - - - - - - . | A2 - - - - - - . | F2 - - - - - - . | E2 - - - - - - .',
    },
    {
      layer: 'base',
      instrument: 'bass',
      stepsPerToken: 2,
      gain: 0.3,
      pattern: `${VATS_HUM} | ${VATS_HUM} | ${VATS_HUM} | ${VATS_HUM}`,
    },
    {
      layer: 'base',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.2,
      pattern: `${rests(3)} | . . . . . . B4 - | ${rests(3)} | . . . . . . E5 -`,
    },
    {
      layer: 'drums',
      instrument: 'heart',
      kit: { b: 'heart' },
      stepsPerToken: 1,
      gain: 0.5,
      pattern: heart(8, true),
    },
    {
      layer: 'drums',
      instrument: 'heart',
      kit: { b: 'heart' },
      stepsPerToken: 1,
      gain: 0.3,
      pattern: heart(8, false),
    },
    {
      layer: 'drums',
      instrument: 'hat',
      kit: { h: 'hat' },
      stepsPerToken: 1,
      gain: 0.12,
      pattern: Array.from({ length: 8 }, () => '. . h . . . h . . . h . . . h .').join(' | '),
    },
    {
      layer: 'lead',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.4,
      pattern: `${rests(2)} | ${motifBars()} | ${rests(2)} | ${motifBars()}`,
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.5,
      pattern: `${CHOIR_PHRASE} | ${rests(2)} | ${CHOIR_PHRASE} | ${rests(2)}`,
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.35,
      pattern: `${CHOIR_TENTHS} | ${rests(2)} | ${CHOIR_TENTHS} | ${rests(2)}`,
    },
  ],
};

/**
 * The domes open (A3M6, the first refugee let into Dome 1): Act III's first warm cadence. The six
 * notes' last three, F–D–C, hummed over IV–V–I in C major, landing home on a held C major chord
 * with its third on glass above.
 */
export const DOMES_OPEN: Song = {
  id: 'domes_open',
  bpm: 100,
  bars: 2,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 4,
      gain: 0.7,
      pattern: 'F4 - D4 - | C4 - - -',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 4,
      gain: 0.45,
      pattern: 'F2 - G2 - | C3 - - -',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 4,
      gain: 0.3,
      pattern: 'A3 - B3 - | E3 - - -',
    },
    {
      layer: 'lead',
      instrument: 'glass',
      stepsPerToken: 4,
      gain: 0.35,
      pattern: '. . . . | E5 - - -',
    },
  ],
};

/**
 * Waykeeper (A3M6's debrief, as the callsign plate turns): the home motif, A–C–D, lifting to E
 * instead of falling home, over F; then the jingle's first notes climbing on glass over C major,
 * the name given and the song turned toward home.
 */
export const WAYKEEPER: Song = {
  id: 'waykeeper',
  bpm: 100,
  bars: 2,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.65,
      pattern: 'A4 - C5 D5 E5 - - - | . . . . . . . .',
    },
    {
      layer: 'lead',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.4,
      pattern: '. . . . . . . . | G4 C5 E5 G5 - - - .',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 4,
      gain: 0.45,
      pattern: 'F2 - - - | C3 - - -',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 4,
      gain: 0.3,
      pattern: 'A3 - - - | E4 - - -',
    },
  ],
};

/**
 * "Shareholder Value" driven off (its `endCue`): the platform's PA stuttering its three-note
 * chime, each go a semitone higher and faster to panic, then one high note left hanging, the slap
 * echo a 16th behind. Sterling's mood, on a loudspeaker.
 */
export const PA_FRANTIC: Song = {
  id: 'pa_frantic',
  bpm: 150,
  bars: 2,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'pa',
      stepsPerToken: 1,
      gain: 0.6,
      pattern:
        'G4 C5 E5 . Ab4 Db5 F5 . A4 D5 F#5 . Bb4 Eb5 G5 . | B4 E5 G#5 C6 - - . . . . . . . . . .',
    },
    {
      layer: 'lead',
      instrument: 'pa',
      stepsPerToken: 1,
      gain: 0.18,
      pattern:
        '. G4 C5 E5 . Ab4 Db5 F5 . A4 D5 F#5 . Bb4 Eb5 G5 | . B4 E5 G#5 C6 - - . . . . . . . . .',
    },
  ],
};

/**
 * The Gathering Maw at rest (its merged body's death; it has no BossEnded): the Hollow's two
 * voices, which hum the jingle wrong, finish its phrase in tune, F–D–C an octave apart, over a
 * low A falling to F.
 */
export const GMAW_BEATEN: Song = {
  id: 'gmaw_beaten',
  bpm: 60,
  bars: 1,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.55,
      pattern: 'F4 - D4 - C4 - - -',
    },
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.45,
      pattern: 'F3 - D3 - C3 - - -',
    },
    { layer: 'base', instrument: 'pad', stepsPerToken: 2, gain: 0.4, pattern: 'A2 - - - F2 - - -' },
  ],
};
