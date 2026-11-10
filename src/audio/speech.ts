// Speech sounds (pure; story-runtime.md § Dialogue in play): a line's blip as it starts, from its
// speaker's `blip` in content/dialogue/speakers.ts, and the typewriter's per-character tick,
// pitched per speaker and thinned out so it reads as a patter, not a buzz. app/audio.ts plays them
// (the comms panel, scenes, and barks all type through ui/dialogue/LineText.tsx's `setTypeTick`).
import { SPEAKERS } from '../content/dialogue/speakers.ts';
import type { SpeakerId } from '../content/dialogue/types.ts';
import type { SpeakerBlipId } from './sfx/blips.ts';
import type { SfxId } from './sfx/index.ts';

/** The fewest ms between two typewriter ticks (the typewriter types a character every 25 ms). */
export const TYPE_TICK_GAP_MS = 55;
/** Ticks wait this long after a line's blip, so the blip is heard on its own (ms). */
export const TYPE_TICK_AFTER_BLIP_MS = 160;

/**
 * Each voiced speaker's typewriter tick, in semitones over `type_tick` (story/characters.md): high
 * and bright for QUILL, Sterling, and Pebble; low for Bricks, Thrum, and Bramble.
 */
export const TYPE_TICK_PITCH: Readonly<Record<VoicedSpeaker, number>> = {
  player: 0,
  quill: 5,
  bricks: -7,
  goldie: 2,
  kip: 3,
  sterling: 7,
  zibzab: -3,
  vesthara: 9,
  pebble: 12,
  thrum: -10,
  chitterbloom: -12,
  prim: 0,
  gerald: 4,
  pa: -2,
};

/** A speaker with a voice blip (the rest type silently: forms, captions, the Hollow, system). */
export type VoicedSpeaker = {
  [S in SpeakerId]: (typeof SPEAKERS)[S]['blip'] extends null ? never : S;
}[SpeakerId];

/** Whether `speaker` has a voice (and so a typewriter tick). */
export function isVoiced(speaker: SpeakerId): speaker is VoicedSpeaker {
  return Object.hasOwn(TYPE_TICK_PITCH, speaker);
}

/** The blip a line by `speaker` starts with, or null for a silent speaker. */
export function blipFor(speaker: SpeakerId): SfxId | null {
  const def: { readonly blip: SpeakerBlipId | null } = SPEAKERS[speaker];
  return def.blip;
}

/** A tick to play: the sound and its pitch (semitones). */
export interface TypeTick {
  readonly id: 'type_tick';
  readonly pitch: number;
}

export interface TypeTicker {
  /** A line's blip played at `nowMs` (ticks hold off for a moment). */
  blipped(nowMs: number): void;
  /** Ticks hold off until `untilMs` (a sung line's cue plays alone; audio/storyCues.ts). */
  quietUntil(untilMs: number): void;
  /** The typewriter typed a character of `speaker`'s line at `nowMs`: the tick to play, or null. */
  tick(speaker: SpeakerId, nowMs: number): TypeTick | null;
}

/** The typewriter's tick gate: per-speaker pitch, at most one tick per TYPE_TICK_GAP_MS. */
export function createTypeTicker(): TypeTicker {
  let last = -Infinity;
  let holdUntil = -Infinity;
  return {
    blipped(nowMs) {
      holdUntil = Math.max(holdUntil, nowMs + TYPE_TICK_AFTER_BLIP_MS);
    },
    quietUntil(untilMs) {
      holdUntil = Math.max(holdUntil, untilMs);
    },
    tick(speaker, nowMs) {
      if (!isVoiced(speaker)) return null;
      if (nowMs < holdUntil || nowMs - last < TYPE_TICK_GAP_MS) return null;
      last = nowMs;
      return { id: 'type_tick', pitch: TYPE_TICK_PITCH[speaker] };
    },
  };
}
