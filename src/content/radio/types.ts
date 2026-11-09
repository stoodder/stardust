// The M1 radio ticker's data (D026): a map's between-wave radio lines, barks, and debrief from its
// act file, verbatim, keyed to the sim events that play them. This is not the dialogue system
// (T302): no portraits, choices, flags, or conditions; each line plays at most once per battle.
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
 * - `enemyKilled`: the battle's first `EnemyDied` of `enemy`, whoever the killer
 *   (design/core-loop.md §6.3's `enemy_killed` bark; A1M2's Brood Hauler barks).
 * - `enemyLeaked`: the battle's first `EnemyLeaked` of `enemy` (D059; A1M2's first Hauler leak).
 *   It plays after `firstLeak` when one leak is both.
 * - `bankNudge`: once per battle, on a `CountdownStarted` (wave 2 on) with at least
 *   `BANK_NUDGE_CREDITS` banked (D059): a gentle nudge to spend, never a scold.
 * - `mapWon` / `mapLost`: the map's debrief. These never play on the ticker: the results card
 *   shows them, with their name plates, after a win or a loss (D028).
 */
export type RadioTrigger =
  | 'firstLeak'
  | 'countdown'
  | 'unlock'
  | 'waveStart'
  | 'waveCleared'
  | 'perfectWave'
  | 'enemyKilled'
  | 'enemyLeaked'
  | 'bankNudge'
  | 'mapWon'
  | 'mapLost';

/** Credits banked at a countdown's start that play the `bankNudge` line (D059). */
export const BANK_NUDGE_CREDITS = 250;

/** Speakers the M1 radio can show (story/style-guide.md §5.1 ids). */
export type RadioSpeaker = 'quill' | 'bricks' | 'goldie' | 'kip';

export interface RadioLine {
  readonly on: RadioTrigger;
  /** The wave the trigger names (`countdown`, `waveStart`, `waveCleared`; the first for `perfectWave`). */
  readonly wave?: number;
  /** The tower an `unlock` names. */
  readonly tower?: string;
  /** The enemy an `enemyKilled` or `enemyLeaked` names. */
  readonly enemy?: string;
  readonly speaker: RadioSpeaker;
  /**
   * What the playfield points at while the line shows (D059): `firstTower` pings the battle's
   * first-built tower still standing (Bricks's "That one's Denise." on A1M2).
   */
  readonly point?: 'firstTower';
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
 * Bricks's Everglow-orange security kit, Goldie's green overalls, Kip's gold #1 trophy pin.
 */
export const SPEAKERS: Readonly<Record<RadioSpeaker, SpeakerLook>> = {
  quill: { name: 'QUILL', color: 'teal.4' },
  bricks: { name: 'Bricks', color: 'orange.4' },
  goldie: { name: 'Goldie', color: 'green.4' },
  kip: { name: 'Kip', color: 'gold.3' },
};
