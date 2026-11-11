// Act III's music (T650; the Long Night, story/bible.md § Act III: "The Quiet" names the Hollow's
// silence and the jingle that stops playing). Silence-forward: the battle bed is mostly space, a
// low drone and a far glass note or two, a heartbeat under it while a wave walks, and in the last
// waves the Skitterkin's home motif on glass; no wave-clear sting, and a win plays nothing
// (eventSounds.ts, the `winJingle` dial). What is sung is "Everglow Bright" itself, slow, the
// six notes the player heard after every cleared wave: Pebble's Leaving Song (A3M1), Old Thrum
// humming with her, the player humming along, and the Hum Choir's harmony line wherever a Choir
// stands. Under the melody the harmony moves in tenths and lands on A, the home motif's key: the
// Skitterkin's own key under Everglow's tune.
import type { Song, Track } from '../types.ts';
import { HOME_MOTIF } from './cuesAct2.ts';

/** "Ev-er-glow, Ev-er-glow" in 8ths over two bars, held at the end of each half (Pebble's octave). */
export const LEAVING_PHRASE = 'G4 C5 E5 - - - . . | F5 D5 C5 - - - - -';
/**
 * The phrase's harmony in tenths below (Thrum's, and the Choir's lower voice an octave up):
 * E–A–C, D–B–A, so "Ev-er-glow" lands on A minor, the home motif's key.
 */
const TENTHS_LOW = 'E3 A3 C4 - - - . . | D4 B3 A3 - - - - -';
/** The phrase an octave down (the player's voice, humming along). */
const PHRASE_LOW = 'G3 C4 E4 - - - . . | F4 D4 C4 - - - - -';
/** Bars of rest (8ths). */
const REST = '. . . . . . . .';
const rests = (n: number): string => Array.from({ length: n }, () => REST).join(' | ');

/** `note` an octave up (`A3` → `A4`). */
const octaveUp = (note: string): string => note.replace(/\d$/, (d) => String(Number(d) + 1));

/**
 * The Hum Choir's harmony line in a bright theme (Act I's and Act II's battle loops, whose bars 1–2
 * sit over C | F): "Everglow Bright" hummed an octave under the lead's couplet, over a lower voice
 * in thirds and fourths, then six bars of rest. A Choir built on a replayed map carries the motif
 * there too (design/towers.md § Hum Choir).
 */
export const CHOIR_LINE_BRIGHT: readonly Track[] = [
  {
    layer: 'choir',
    instrument: 'hum',
    stepsPerToken: 2,
    gain: 0.5,
    pattern: `${PHRASE_LOW.replace(' - - - - -', ' - - - . .')} | ${rests(6)}`,
  },
  {
    layer: 'choir',
    instrument: 'hum',
    stepsPerToken: 2,
    gain: 0.35,
    pattern: `E3 G3 C4 - - - . . | C4 A3 A3 - - - . . | ${rests(6)}`,
  },
];

/** The bed's tempo: slow, about a resting breath's pace. */
const ACT3_BPM = 72;

/**
 * The Act III battle loop, eight bars over Am | F | C | G | Am | F | Dm | E:
 * - **base:** a low drone held for most of each bar, then a rest; a soft colour tone halfway in;
 *   and one far glass note in bars 3 and 7, a star in the dark.
 * - **drums:** no drums: a heartbeat, a lub-dub every half bar, while a wave walks.
 * - **lead** (the last two waves, or integrity low): the home motif on glass, in bars 3–4 and 7–8.
 * - **choir** (a Hum Choir stands): "Everglow Bright" hummed in bars 1–2 and 5–6, the melody over
 *   its tenths.
 */
export const ACT3_BATTLE: Song = {
  id: 'act3_battle',
  bpm: ACT3_BPM,
  bars: 8,
  loop: true,
  tracks: [
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.55,
      pattern:
        'A2 - - - - - . . | F2 - - - - - . . | C3 - - - - - . . | G2 - - - - - . . |' +
        'A2 - - - - - . . | F2 - - - - - . . | D3 - - - - - . . | E2 - - - - - - .',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.3,
      pattern:
        '. . . . C4 - - . | . . . . A3 - - . | . . . . E4 - - . | . . . . D4 - - . |' +
        '. . . . C4 - - . | . . . . A3 - - . | . . . . F3 - - . | . . . . G#3 - - .',
    },
    {
      layer: 'base',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.22,
      pattern: `${rests(2)} | . . . . . . E5 - | ${rests(3)} | . . . . . . A4 - | ${REST}`,
    },
    {
      layer: 'drums',
      instrument: 'heart',
      kit: { b: 'heart' },
      stepsPerToken: 1,
      gain: 0.5,
      pattern: Array.from({ length: 8 }, () => 'b . . . . . . . b . . . . . . .').join(' | '),
    },
    {
      layer: 'drums',
      instrument: 'heart',
      kit: { b: 'heart' },
      stepsPerToken: 1,
      gain: 0.3,
      pattern: Array.from({ length: 8 }, () => '. . b . . . . . . . b . . . . .').join(' | '),
    },
    {
      layer: 'lead',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.4,
      pattern: (() => {
        const [h1, h2, h3, h4] = HOME_MOTIF.map(octaveUp);
        const motif = `${h1} - - - ${h2} - ${h3} - | ${h4} - - - - - . .`;
        return `${rests(2)} | ${motif} | ${rests(2)} | ${motif}`;
      })(),
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.55,
      pattern: `${LEAVING_PHRASE} | ${rests(2)} | ${LEAVING_PHRASE} | ${rests(2)}`,
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.4,
      pattern: (() => {
        const tenths = 'E4 A4 C5 - - - . . | D5 B4 A4 - - - - -';
        return `${tenths} | ${rests(2)} | ${tenths} | ${rests(2)}`;
      })(),
    },
  ],
};

/**
 * The Leaving Song (act3.md § A3M1, `a3_m01_scene_song`: Pebble, "(hum, six notes)"): "Everglow
 * Bright", slow, hummed by one small voice, alone. Nothing under it: the melody the player has
 * heard after every cleared wave, and what it was.
 */
export const LEAVING_HUM: Song = {
  id: 'leaving_hum',
  bpm: ACT3_BPM,
  bars: 3,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.9,
      pattern: `${LEAVING_PHRASE} | ${REST}`,
    },
  ],
};

/**
 * Old Thrum hums with her (spared only; her line follows Pebble's and takes over from it): the
 * phrase again from the top, Pebble's voice over Thrum's low one in tenths, landing on A.
 */
export const LEAVING_HUM_TWO: Song = {
  id: 'leaving_hum_two',
  bpm: ACT3_BPM,
  bars: 3,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.7,
      pattern: `${LEAVING_PHRASE} | ${REST}`,
    },
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.85,
      pattern: `${TENTHS_LOW} | ${REST}`,
    },
  ],
};

/**
 * The player hums along (the Leaving Song's "(hum along)"): a human voice an octave under
 * Pebble's, and Pebble with it, from the top.
 */
export const LEAVING_HUM_ALONG: Song = {
  id: 'leaving_hum_along',
  bpm: ACT3_BPM,
  bars: 3,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.8,
      pattern: `${PHRASE_LOW} | ${REST}`,
    },
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.55,
      pattern: `${LEAVING_PHRASE} | ${REST}`,
    },
  ],
};

/**
 * Act III's loss (the `none` jingle's; never the sad trombone, which would laugh): the song's last
 * three notes hummed, falling, and stopping on the leading tone over a low A, unfinished.
 */
export const LOSE_HUSH: Song = {
  id: 'lose_hush',
  bpm: ACT3_BPM,
  bars: 2,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.75,
      pattern: 'F4 - D4 - C4 - - - | B3 - - - - - . .',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.45,
      pattern: 'A2 - - - - - - - | E2 - - - - - . .',
    },
  ],
};
