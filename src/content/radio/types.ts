// The M1 radio ticker's data (D026): a map's between-wave radio lines and barks from its act file,
// verbatim, keyed to the sim events that play them. This is not the dialogue system (T302): no
// portraits, choices, flags, or conditions; each line plays at most once per battle.
import type { ColorName } from '../palettes/master.ts';

/**
 * What plays a line:
 * - `firstLeak`: the battle's first `EnemyLeaked`.
 * - `countdown`: `CountdownStarted` for `wave` (the build phase before it; story/style-guide.md
 *   §5.3's `w<NN>` radio slot).
 * - `unlock`: `TowerClassUnlocked` for `tower`.
 * - `waveStart`: `WaveStarted` for `wave`.
 * - `waveCleared`: `WaveCleared` for `wave`.
 * - `perfectWave`: the first wave from `wave` on that resolves with no leaks.
 * - `mapWon` / `mapLost`: the map ends (the results screen covers the HUD, so M1 maps leave
 *   these empty).
 */
export type RadioTrigger =
  | 'firstLeak'
  | 'countdown'
  | 'unlock'
  | 'waveStart'
  | 'waveCleared'
  | 'perfectWave'
  | 'mapWon'
  | 'mapLost';

/** Speakers the M1 radio can show (story/style-guide.md §5.1 ids). */
export type RadioSpeaker = 'quill' | 'bricks' | 'goldie';

export interface RadioLine {
  readonly on: RadioTrigger;
  /** The wave the trigger names (`countdown`, `waveStart`, `waveCleared`; the first for `perfectWave`). */
  readonly wave?: number;
  /** The tower an `unlock` names. */
  readonly tower?: string;
  readonly speaker: RadioSpeaker;
  /** Verbatim from the map's act file (story/campaign/act<N>.md). */
  readonly text: string;
}

export interface SpeakerLook {
  /** The name plate. */
  readonly name: string;
  /** The name plate's color (a master palette name). */
  readonly color: ColorName;
}

/**
 * Name plates. Colors follow each character's look (story/characters.md): QUILL's teal screen,
 * Bricks's Everglow-orange security kit, Goldie's green overalls.
 */
export const SPEAKERS: Readonly<Record<RadioSpeaker, SpeakerLook>> = {
  quill: { name: 'QUILL', color: 'teal.4' },
  bricks: { name: 'Bricks', color: 'orange.4' },
  goldie: { name: 'Goldie', color: 'green.4' },
};
