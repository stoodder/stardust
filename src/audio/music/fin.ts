// The finale's music (T850; story/campaign/finale.md § FIN, story/bible.md § 8). The campaign's
// motif, "Everglow Bright", the colony's corporate jingle, comes round for the last time: the
// melody is the jingle in tune, note for note, and what changes is what sings it and what it is
// sung over.
// - **The Long Walk** (Phase 1, `fin_walk`): Act III's silence-forward bed, slower, as a
//   procession: a low drone over Am | F | C | G | Am | F | Dm | G, the singers' footsteps while a
//   wave walks, and the procession humming "Ev-er-glow" far off in bars 1–2 and 5–6 (its level
//   is the Voices still singing: the director's `lead`). Where a Hum Choir stands it answers with
//   the couplet's second half, "brighter every day" and "clearing the way".
// - **The hymn** (Phase 2, `choir_hymn`): the choir sings the whole couplet at the mouth of the
//   Halls as a funeral hymn, 66 BPM, a bell tolling. The tune is the jingle, in tune; the harmony
//   under it is minor (Em, Am, Dm; a falling lament bass D–C–B–A under "clearing the way") and
//   every loop ends on A minor under the melody's home note: never home. Pebble leads (`lead`);
//   the choir behind her (`choir`) swells with the Voices still singing; Pebble's "clearing the
//   way!" rings out over it in bar 7 (the good part).
// - **Dawn** (Phase 3 and the epilogue, `dawn_major`): the same couplet in C major over Act I's
//   own changes, C | F | Am | G, sung by everyone, the gold of glass an octave over it. The
//   jingle the player heard after every cleared wave in Act I, home at last. It plays from Dawn's
//   light in the battle, and again from the epilogue's counter flip under the credits and the
//   final image (app/ending.ts `ENDING_MUSIC`). `dawn_sung` is one pass of its first phrase and
//   last line, as the Dawn scene says "Everyone sings it."
// - **The song's end** (`fin_win`, the finale's win): "clear-ing the way", the last line, landing
//   home on a full C major chord.
// - **Sung lines** (storyCues.ts LINE_CUES): Pebble's hum at the memorial (`memorial_hum`: Bricks's
//   half phrase, low, unfinished), her six notes at the Halls with the choir joining on the last
//   (`halls_hum`), and her six notes for Thrum's echo, whose voice answers a beat behind in tenths
//   that land on C major, not A minor (`echo_hum`: at rest).
// - **The post-game title** (`title_dawn`): the title's couplet on glass over its own chords, the
//   home motif hummed in the gaps: the two tunes of the campaign side by side.
// This file loads with the finale's chunk (app/acts/fin.ts; music/index.ts `registerMusic`).
import type { Song } from '../types.ts';
import { CHOIR_PHRASE, rests } from './act3.ts';
import { COUPLET, PAD_HI, PAD_LO, WALK_BASS } from './act1.ts';
import { HOME_MOTIF } from './cuesAct2.ts';

/** `pattern` with every note moved `octaves` octaves (`G4` → `G3` at −1). */
const shift = (pattern: string, octaves: number): string =>
  pattern.replace(/([A-G][#b]?)(\d)/g, (_, n: string, o: string) => `${n}${Number(o) + octaves}`);

/** A bar of quarter rests. */
const QREST = '. . . .';
const qrests = (n: number): string => Array.from({ length: n }, () => QREST).join(' | ');

/** One drum hit at the top of each bar (16ths), for `bars` bars, on `beats` (0-based 16ths). */
const hits = (bars: number, beats: readonly number[], letter = 'b'): string =>
  Array.from({ length: bars }, () =>
    Array.from({ length: 16 }, (_, i) => (beats.includes(i) ? letter : '.')).join(' '),
  ).join(' | ');

// ── Phase 1: the Long Walk ────────────────────────────────────────────────────────────────────

/**
 * The procession's hum (the `lead` layer): "Ev-er-glow, Ev-er-glow" low, over its tenths, in
 * bars 1–2 and 5–6 (8ths).
 */
const WALK_HUM = shift(CHOIR_PHRASE, -1);
const WALK_TENTHS = 'E3 A3 C4 - - - . . | D4 B3 A3 - - - - -';

/**
 * Phase 1's bed: eight bars at 66 BPM over Am | F | C | G | Am | F | Dm | G.
 * - **base:** the drone, a colour tone halfway into each bar, a far glass note in bars 3 and 7.
 * - **drums:** the procession's footsteps, a soft step on every beat, while a wave walks.
 * - **lead:** the procession humming the six notes (bars 1–2, 5–6), at the Voices' level.
 * - **choir** (a Hum Choir stands): the couplet's answer, "brighter every day" (bar 3) and
 *   "clearing the way" (bar 7), over its thirds.
 */
export const FIN_WALK: Song = {
  id: 'fin_walk',
  bpm: 66,
  bars: 8,
  loop: true,
  tracks: [
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.5,
      pattern:
        'A2 - - - - - - . | F2 - - - - - - . | C3 - - - - - - . | G2 - - - - - - . |' +
        'A2 - - - - - - . | F2 - - - - - - . | D3 - - - - - - . | G2 - - - - - - .',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 2,
      gain: 0.25,
      pattern:
        '. . . . C4 - - . | . . . . A3 - - . | . . . . E4 - - . | . . . . D4 - - . |' +
        '. . . . C4 - - . | . . . . A3 - - . | . . . . F3 - - . | . . . . B3 - - .',
    },
    {
      layer: 'base',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.2,
      pattern: `${rests(2)} | . . . . . . G5 - | ${rests(3)} | . . . . . . A4 - | ${rests(1)}`,
    },
    {
      layer: 'drums',
      instrument: 'heart',
      kit: { b: 'heart' },
      stepsPerToken: 1,
      gain: 0.3,
      pattern: hits(8, [0, 4, 8, 12]),
    },
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.45,
      pattern: `${WALK_HUM} | ${rests(2)} | ${WALK_HUM} | ${rests(2)}`,
    },
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.3,
      pattern: `${WALK_TENTHS} | ${rests(2)} | ${WALK_TENTHS} | ${rests(2)}`,
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.45,
      pattern: `${rests(2)} | E4 F4 G4 A4 G4 - - - | ${rests(3)} | D4 E4 D4 C4 - - - - | ${rests(1)}`,
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.32,
      pattern: `${rests(2)} | C4 D4 E4 F4 E4 - - - | ${rests(3)} | A3 C4 B3 A3 - - - - | ${rests(1)}`,
    },
  ],
};

// ── Phase 2: the hymn ─────────────────────────────────────────────────────────────────────────

/** The couplet as the hymn sings it, one syllable a beat (quarters): the jingle, in tune. */
const HYMN_MELODY =
  'G4 C5 E5 - | F5 D5 C5 - | E5 F5 G5 A5 | G5 - - - | G4 C5 E5 - | F5 D5 C5 - | D5 E5 D5 C5 | C5 - - .';
/** The alto under it (Em–Am | Dm–G–Am | Am–Dm–Em–F | Em–G | … | Dm–Am–G–F | Am). */
const HYMN_ALTO =
  'E4 A4 C5 - | A4 B4 A4 - | C5 D5 E5 F5 | E5 - D5 - | E4 A4 C5 - | A4 B4 A4 - | A4 A4 G4 A4 | E4 - - .';
const HYMN_TENOR =
  'B3 E4 E4 - | D4 D4 E4 - | A3 A3 B3 C4 | B3 - B3 - | B3 E4 E4 - | D4 D4 E4 - | F4 E4 D4 C4 | A3 - - .';
/** The bass: the lament's fall D–C–B–A under "clearing the way", landing on A, never home. */
const HYMN_BASS =
  'E2 A2 - - | D3 B2 A2 - | A2 D3 E3 F3 | E3 - G2 - | E2 A2 - - | D3 B2 A2 - | D3 C3 B2 A2 | A2 - - -';

/**
 * Phase 2's hymn: the couplet at 66 BPM, eight bars, sung over minor harmony.
 * - **base:** the bass voice, and a bell tolling on bars 1, 3, 5, and 7.
 * - **drums:** a slow heartbeat, one lub-dub a bar, while the add waves walk.
 * - **lead:** Pebble, the melody; and "clearing the way!" rung out over it in bar 7.
 * - **choir:** the choir behind her, the melody an octave down and the alto and tenor: its level
 *   is the Voices still singing (director.ts), so the hymn swells and thins with them.
 */
export const CHOIR_HYMN: Song = {
  id: 'choir_hymn',
  bpm: 66,
  bars: 8,
  loop: true,
  tracks: [
    { layer: 'base', instrument: 'pad', stepsPerToken: 4, gain: 0.5, pattern: HYMN_BASS },
    {
      layer: 'base',
      instrument: 'glass',
      stepsPerToken: 4,
      gain: 0.18,
      pattern: 'A3 . . . | . . . . | A3 . . . | . . . . | A3 . . . | . . . . | A3 . . . | . . . .',
    },
    {
      layer: 'drums',
      instrument: 'heart',
      kit: { b: 'heart' },
      stepsPerToken: 1,
      gain: 0.4,
      pattern: hits(8, [0, 3]),
    },
    { layer: 'lead', instrument: 'hum', stepsPerToken: 4, gain: 0.62, pattern: HYMN_MELODY },
    {
      layer: 'lead',
      instrument: 'chime',
      stepsPerToken: 4,
      gain: 0.22,
      pattern: `${qrests(6)} | D5 E5 D5 C5 | ${QREST}`,
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 4,
      gain: 0.32,
      pattern: shift(HYMN_MELODY, -1),
    },
    { layer: 'choir', instrument: 'hum', stepsPerToken: 4, gain: 0.34, pattern: HYMN_ALTO },
    { layer: 'choir', instrument: 'hum', stepsPerToken: 4, gain: 0.3, pattern: HYMN_TENOR },
  ],
};

// ── Phase 3: Dawn ─────────────────────────────────────────────────────────────────────────────

/** Dawn's harmony under the couplet (quarters): the chord tones Act I's title held. */
const DAWN_UPPER = PAD_HI;
const DAWN_LOWER = PAD_LO;

/**
 * Dawn: the couplet in C major at 76 BPM over Act I's changes (C | F | Am | G | C | F | G | C),
 * sung by everyone (the melody hummed, the gold of glass an octave over it), the chords held by
 * the choir, Act I's walking bass under them, Pebble's "clearing the way!" in bar 7, and a soft
 * pulse on the drums layer (the epilogue's hold brings every layer up).
 */
export const DAWN_MAJOR: Song = {
  id: 'dawn_major',
  bpm: 76,
  bars: 8,
  loop: true,
  tracks: [
    { layer: 'base', instrument: 'pad', stepsPerToken: 4, gain: 0.5, pattern: WALK_BASS },
    { layer: 'base', instrument: 'hum', stepsPerToken: 4, gain: 0.3, pattern: DAWN_LOWER },
    {
      layer: 'drums',
      instrument: 'kick',
      kit: { k: 'kick', h: 'hat' },
      stepsPerToken: 1,
      gain: 0.3,
      pattern: hits(8, [0, 8], 'k'),
    },
    { layer: 'lead', instrument: 'hum', stepsPerToken: 2, gain: 0.62, pattern: COUPLET },
    {
      layer: 'lead',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.2,
      pattern: shift(COUPLET, 1),
    },
    {
      layer: 'lead',
      instrument: 'chime',
      stepsPerToken: 2,
      gain: 0.2,
      pattern: `${rests(6)} | D5 E5 D5 C5 B4 - D5 - | ${rests(1)}`,
    },
    { layer: 'choir', instrument: 'hum', stepsPerToken: 4, gain: 0.34, pattern: DAWN_UPPER },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.3,
      pattern: shift(COUPLET, -1),
    },
  ],
};

/**
 * "The jingle comes round again, in a major key. Everyone sings it." (the Dawn scene, a sung line):
 * one pass of the phrase and the last line, home, at Dawn's tempo.
 */
export const DAWN_SUNG: Song = {
  id: 'dawn_sung',
  bpm: 76,
  bars: 4,
  loop: false,
  tracks: [
    {
      layer: 'lead',
      instrument: 'hum',
      stepsPerToken: 2,
      gain: 0.62,
      pattern: 'G4 C5 E5 - - - . . | F5 D5 C5 - - - . . | D5 E5 D5 C5 B4 - D5 - | C5 - - - - - - -',
    },
    {
      layer: 'lead',
      instrument: 'glass',
      stepsPerToken: 2,
      gain: 0.2,
      pattern: 'G5 C6 E6 - - - . . | F6 D6 C6 - - - . . | D6 E6 D6 C6 B5 - D6 - | C6 - - - - - - -',
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 4,
      gain: 0.34,
      pattern: 'E4 - - - | F4 - - - | F4 - - - | E4 - - -',
    },
    {
      layer: 'choir',
      instrument: 'hum',
      stepsPerToken: 4,
      gain: 0.3,
      pattern: 'C4 - - - | A3 - - - | B3 - - - | C4 - - -',
    },
    {
      layer: 'base',
      instrument: 'pad',
      stepsPerToken: 4,
      gain: 0.5,
      pattern: 'C3 - G2 - | F2 - C3 - | G2 - D3 - | C3 - - -',
    },
  ],
};

/**
 * The finale's win (MapWon; eventTablesFin.ts): the song's last line, "clear-ing the way", over
 * Dm | C | G, landing home on a full C major chord with the gold of glass over it.
 */
export const FIN_WIN: Song = {
  id: 'fin_win',
  bpm: 66,
  bars: 3,
  loop: false,
  tracks: [
    { layer: 'lead', instrument: 'hum', stepsPerToken: 4, gain: 0.66, pattern: 'D5 E5 D5 - | C5 - - - | - - . .' },
    { layer: 'lead', instrument: 'glass', stepsPerToken: 4, gain: 0.26, pattern: '. . . . | G5 C6 E6 - | - - . .' },
    { layer: 'choir', instrument: 'hum', stepsPerToken: 4, gain: 0.36, pattern: 'A4 G4 B4 - | G4 - - - | - - . .' },
    { layer: 'choir', instrument: 'hum', stepsPerToken: 4, gain: 0.32, pattern: 'F4 E4 F4 - | E4 - - - | - - . .' },
    { layer: 'base', instrument: 'pad', stepsPerToken: 4, gain: 0.5, pattern: 'D3 C3 G2 - | C3 - - - | - - . .' },
  ],
};

// ── Sung lines ─────────────────────────────────────────────────────────────────────────────────

/** The six notes in Pebble's octave, one slow bar (8ths): the Leaving Song's bar. */
const PEBBLE_SIX = 'G4 C5 E5 - F5 D5 C5 -';

/**
 * Pebble at the memorial, "(hum, low) That's Bricks's. That's yours.": Bricks's half phrase,
 * "Ev-er-glow", low in her voice, and nothing after it (A3M4's shelters stopped there too).
 */
export const MEMORIAL_HUM: Song = {
  id: 'memorial_hum',
  bpm: 60,
  bars: 1,
  loop: false,
  tracks: [{ layer: 'lead', instrument: 'hum', stepsPerToken: 2, gain: 0.7, pattern: 'G3 C4 E4 - - - . .' }],
};

/**
 * Pebble at the mouth of the Halls, "(hum, six notes, loud)": the six notes alone, and on the last
 * the choir comes in under her, held, before the hymn begins.
 */
export const HALLS_HUM: Song = {
  id: 'halls_hum',
  bpm: 60,
  bars: 2,
  loop: false,
  tracks: [
    { layer: 'lead', instrument: 'hum', stepsPerToken: 2, gain: 0.85, pattern: `${PEBBLE_SIX} | - - - - . . . .` },
    { layer: 'choir', instrument: 'hum', stepsPerToken: 2, gain: 0.32, pattern: '. . . . . . E4 - | - - - - - - . .' },
    { layer: 'choir', instrument: 'hum', stepsPerToken: 2, gain: 0.32, pattern: '. . . . . . A3 - | - - - - - - . .' },
    { layer: 'base', instrument: 'pad', stepsPerToken: 2, gain: 0.35, pattern: '. . . . . . A2 - | - - - - - - . .' },
  ],
};

/**
 * Thrum's echo reaches the song, "Grandmother. (hum, six notes) She heard.": Pebble's six notes,
 * her grandmother's low voice a beat behind in the tenths she sang in A3M1, but landing on C, not
 * A: at rest, and the gold of glass over it.
 */
export const ECHO_HUM: Song = {
  id: 'echo_hum',
  bpm: 60,
  bars: 2,
  loop: false,
  tracks: [
    { layer: 'lead', instrument: 'hum', stepsPerToken: 2, gain: 0.7, pattern: `${PEBBLE_SIX} | - - . . . . . .` },
    { layer: 'lead', instrument: 'hum', stepsPerToken: 2, gain: 0.42, pattern: '. E3 A3 C4 - D4 B3 C4 | - - - - . . . .' },
    { layer: 'lead', instrument: 'glass', stepsPerToken: 2, gain: 0.24, pattern: '. . . . . . . . | E5 G5 C6 - - - . .' },
  ],
};

// ── The post-game title ───────────────────────────────────────────────────────────────────────

/**
 * The home motif hummed across bars 4–5 ("Hm. Hm-hm. Hmmm."), under the couplet's held "day" and
 * the phrase's return (8ths).
 */
const TITLE_MOTIF = (() => {
  const [h1, h2, h3, h4] = HOME_MOTIF;
  return `${rests(3)} | ${h1} - - - ${h2} - ${h3} - | ${h4} - - - - - . . | ${rests(3)}`;
})();

/**
 * The title after the finale (the post-game; app/audio.ts): the title's couplet on glass, slower,
 * over its own chords and walking bass, and the Skitterkin's home motif hummed in the gaps (the
 * `choir` layer, which the post-game title brings up): the colony's song and theirs, together.
 */
export const TITLE_DAWN: Song = {
  id: 'title_dawn',
  bpm: 92,
  bars: 8,
  loop: true,
  tracks: [
    { layer: 'base', instrument: 'bass', stepsPerToken: 4, gain: 0.5, pattern: WALK_BASS },
    { layer: 'base', instrument: 'pad', stepsPerToken: 4, gain: 0.5, pattern: PAD_LO },
    { layer: 'base', instrument: 'pad', stepsPerToken: 4, gain: 0.42, pattern: PAD_HI },
    { layer: 'lead', instrument: 'glass', stepsPerToken: 2, gain: 0.5, pattern: COUPLET },
    { layer: 'choir', instrument: 'hum', stepsPerToken: 2, gain: 0.4, pattern: TITLE_MOTIF },
  ],
};

/** The finale's themes, registered with its chunk (music/index.ts `registerMusic`). */
export const FIN_THEMES = {
  fin_walk: FIN_WALK,
  choir_hymn: CHOIR_HYMN,
  dawn_major: DAWN_MAJOR,
  title_dawn: TITLE_DAWN,
} as const satisfies Readonly<Record<string, Song>>;

/** The finale's cues, registered with its chunk. */
export const FIN_CUES = {
  dawn_sung: DAWN_SUNG,
  fin_win: FIN_WIN,
  memorial_hum: MEMORIAL_HUM,
  halls_hum: HALLS_HUM,
  echo_hum: ECHO_HUM,
} as const satisfies Readonly<Record<string, Song>>;
