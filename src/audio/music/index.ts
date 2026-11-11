// The music registry: looping themes and one-shot cues, by id (architecture.md § Audio). Which one
// plays is the director's call (director.ts), never hard-coded per map.
import type { JingleVariant } from '../../content/presentation.ts';
import type { Act } from '../../content/types.ts';
import type { Song } from '../types.ts';
import { ACT1_BATTLE, TITLE_THEME } from './act1.ts';
import { ACT2_BATTLE } from './act2.ts';
import { ACT3_BATTLE, LEAVING_HUM, LEAVING_HUM_ALONG, LEAVING_HUM_TWO, LOSE_HUSH } from './act3.ts';
import {
  ACT3_SHELTERS,
  ACT3_VATS,
  DOMES_OPEN,
  GMAW_BEATEN,
  PA_FRANTIC,
  WAYKEEPER,
} from './act3b.ts';
import {
  BOSS_STING,
  BRIGHT_MINOR,
  BRIGHT_STING,
  LOSE_STING,
  MINOR_STING,
  WIN_JINGLE,
  WITCH_STING,
} from './cues.ts';
import { C2_RETURNED, C2_SOLD, HOME_HUM, PA_SHIFT_MINOR } from './cuesAct2.ts';

export { ALL_INSTRUMENTS, DRUMS, INSTRUMENTS, KIT } from './instruments.ts';
export { HOME_MOTIF } from './cuesAct2.ts';

/** Looping themes. */
export const THEMES = {
  title: TITLE_THEME,
  act1_battle: ACT1_BATTLE,
  act2_battle: ACT2_BATTLE,
  act3_battle: ACT3_BATTLE,
  act3_shelters: ACT3_SHELTERS,
  act3_vats: ACT3_VATS,
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
  pa_shift_minor: PA_SHIFT_MINOR,
  home_hum: HOME_HUM,
  c2_sold: C2_SOLD,
  c2_returned: C2_RETURNED,
  leaving_hum: LEAVING_HUM,
  leaving_hum_two: LEAVING_HUM_TWO,
  leaving_hum_along: LEAVING_HUM_ALONG,
  lose_hush: LOSE_HUSH,
  domes_open: DOMES_OPEN,
  waykeeper: WAYKEEPER,
  pa_frantic: PA_FRANTIC,
  gmaw_beaten: GMAW_BEATEN,
} as const satisfies Readonly<Record<string, Song>>;
export type CueId = keyof typeof CUES;

/** The battle theme for each act (the finale adds its own as it's built; until then Act I's). */
export const BATTLE_THEME: Readonly<Partial<Record<Act, ThemeId>>> = {
  1: 'act1_battle',
  2: 'act2_battle',
  3: 'act3_battle',
};

/**
 * A map whose battle has its own bed over its act's (T750; music/act3b.ts): A3M4's shelters,
 * where Bricks's hum stops halfway, and A3M5's vats at night humming the six notes. Read by the
 * director (`BattleMood.map`) ahead of BATTLE_THEME.
 */
export const MAP_THEME: Readonly<Partial<Record<string, ThemeId>>> = {
  a3_m04: 'act3_shelters',
  a3_m05: 'act3_vats',
};

/**
 * The loss cue by the map's jingle dial (the act's arrangement of the song): the sad trombone
 * while the jingle still plays; with no jingle (Act III) the song's last notes hummed, unfinished
 * (`lose_hush`), never a laugh.
 */
export const LOSE_CUE: Readonly<Record<JingleVariant, CueId>> = {
  bright: 'lose',
  minor_bridges: 'lose',
  minor: 'lose',
  none: 'lose_hush',
  song: 'lose',
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
