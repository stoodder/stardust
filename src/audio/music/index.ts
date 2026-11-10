// The music registry: looping themes and one-shot cues, by id (architecture.md § Audio). Which one
// plays is the director's call (director.ts), never hard-coded per map.
import type { JingleVariant } from '../../content/presentation.ts';
import type { Act } from '../../content/types.ts';
import type { Song } from '../types.ts';
import { ACT1_BATTLE, TITLE_THEME } from './act1.ts';
import { ACT2_BATTLE } from './act2.ts';
import {
  BOSS_STING,
  BRIGHT_MINOR,
  BRIGHT_STING,
  LOSE_STING,
  MINOR_STING,
  WIN_JINGLE,
  WITCH_STING,
} from './cues.ts';

export { ALL_INSTRUMENTS, DRUMS, INSTRUMENTS, KIT } from './instruments.ts';

/** Looping themes. */
export const THEMES = {
  title: TITLE_THEME,
  act1_battle: ACT1_BATTLE,
  act2_battle: ACT2_BATTLE,
} as const satisfies Readonly<Record<string, Song>>;
export type ThemeId = keyof typeof THEMES;

/** One-shot cues (stings and jingles). */
export const CUES = {
  bright_sting: BRIGHT_STING,
  bright_minor: BRIGHT_MINOR,
  minor_sting: MINOR_STING,
  win: WIN_JINGLE,
  lose: LOSE_STING,
  boss_sting: BOSS_STING,
  witch_sting: WITCH_STING,
} as const satisfies Readonly<Record<string, Song>>;
export type CueId = keyof typeof CUES;

/** The battle theme for each act (Act III and the finale add theirs as they're built). */
export const BATTLE_THEME: Readonly<Partial<Record<Act, ThemeId>>> = {
  1: 'act1_battle',
  2: 'act2_battle',
};

/**
 * The wave-clear cue for each jingle variant, the map's presentation dial (core-loop.md § 6.7;
 * story/presentation.ts picks it, the director never reads the act): Act I's bright sting; Act
 * II's sting with minor bridges, then A2M4–A2M6's minor arrangement (never Act I's bright sting,
 * which would cheer; D126); Act III has none (the jingle stops playing); the finale's song is
 * architecture.md § Audio's, not a wave-clear cue.
 */
export const WAVE_CLEAR_CUE: Readonly<Record<JingleVariant, CueId | null>> = {
  bright: 'bright_sting',
  minor_bridges: 'bright_minor',
  minor: 'minor_sting',
  none: null,
  song: null,
};

export function isCueId(id: string): id is CueId {
  return Object.hasOwn(CUES, id);
}

export function isThemeId(id: string): id is ThemeId {
  return Object.hasOwn(THEMES, id);
}
