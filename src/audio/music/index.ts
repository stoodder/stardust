// The music registry: looping themes and one-shot cues, by id (architecture.md § Audio). Which one
// plays is the director's call (director.ts), never hard-coded per map.
import type { Act } from '../../content/types.ts';
import type { Song } from '../types.ts';
import { ACT1_BATTLE, TITLE_THEME } from './act1.ts';
import { BOSS_STING, BRIGHT_STING, LOSE_STING, WIN_JINGLE } from './cues.ts';

export { ALL_INSTRUMENTS, DRUMS, INSTRUMENTS, KIT } from './instruments.ts';

/** Looping themes. */
export const THEMES = { title: TITLE_THEME, act1_battle: ACT1_BATTLE } as const satisfies Readonly<
  Record<string, Song>
>;
export type ThemeId = keyof typeof THEMES;

/** One-shot cues (stings and jingles). */
export const CUES = {
  bright_sting: BRIGHT_STING,
  win: WIN_JINGLE,
  lose: LOSE_STING,
  boss_sting: BOSS_STING,
} as const satisfies Readonly<Record<string, Song>>;
export type CueId = keyof typeof CUES;

/** The battle theme for each act (Acts II–III and the finale add theirs as they're built). */
export const BATTLE_THEME: Readonly<Partial<Record<Act, ThemeId>>> = { 1: 'act1_battle' };

/** The wave-clear cue for each act; Act III has none (the jingle stops playing; core-loop §6.7). */
export const WAVE_CLEAR_CUE: Readonly<Partial<Record<Act, CueId | null>>> = {
  1: 'bright_sting',
  3: null,
};

export function isCueId(id: string): id is CueId {
  return Object.hasOwn(CUES, id);
}

export function isThemeId(id: string): id is ThemeId {
  return Object.hasOwn(THEMES, id);
}
