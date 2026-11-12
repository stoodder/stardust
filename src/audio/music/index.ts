// The music registry: looping themes and one-shot cues, by id (architecture.md § Audio). Which one
// plays is the director's call (director.ts), never hard-coded per map. Act I's to Act III's are
// always registered; the finale's (music/fin.ts) arrive with its chunk (app/acts/fin.ts,
// `registerMusic`; architecture.md § 5, *Bundle*), so `THEMES` and `CUES` are updated in place.
// `ThemeId` and `CueId` name every theme and cue, registered or not: one whose chunk hasn't loaded
// plays nothing (`loadedTheme`, `loadedCue`).
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
import { C2_RETURNED, C2_SOLD, HOME_HUM, PA_SHIFT, PA_SHIFT_MINOR } from './cuesAct2.ts';
import type { FIN_CUES, FIN_THEMES } from './fin.ts';

export { ALL_INSTRUMENTS, DRUMS, INSTRUMENTS, KIT } from './instruments.ts';
export { HOME_MOTIF } from './cuesAct2.ts';

/** The looping themes always registered. */
const CORE_THEMES = {
  title: TITLE_THEME,
  act1_battle: ACT1_BATTLE,
  act2_battle: ACT2_BATTLE,
  act3_battle: ACT3_BATTLE,
  act3_shelters: ACT3_SHELTERS,
  act3_vats: ACT3_VATS,
} as const satisfies Readonly<Record<string, Song>>;

/** The one-shot cues (stings and jingles) always registered. */
const CORE_CUES = {
  bright_sting: BRIGHT_STING,
  bright_minor: BRIGHT_MINOR,
  minor_sting: MINOR_STING,
  win: WIN_JINGLE,
  lose: LOSE_STING,
  boss_sting: BOSS_STING,
  witch_sting: WITCH_STING,
  pa_shift: PA_SHIFT,
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

/** Every theme and cue, registered or not, with its literal shape. */
type AllThemes = typeof CORE_THEMES & typeof FIN_THEMES;
type AllCues = typeof CORE_CUES & typeof FIN_CUES;
/** A looping theme's id (registered or not yet: its chunk may still be loading). */
export type ThemeId = keyof AllThemes;
/** A one-shot cue's id (registered or not yet). */
export type CueId = keyof AllCues;

/** The music groups a chunk registers (`registerMusic`), in registry order after the core's. */
export const MUSIC_GROUPS = ['fin'] as const;
export type MusicGroup = (typeof MUSIC_GROUPS)[number];
/** A chunk's music: its themes and its cues. */
export interface MusicSet {
  readonly themes?: Readonly<Record<string, Song>>;
  readonly cues?: Readonly<Record<string, Song>>;
}

const groups = new Map<MusicGroup, MusicSet>();
const themes: Record<string, Song> = {};
const cues: Record<string, Song> = {};

/**
 * Every registered theme, by id: the core's always, a chunk's once it has loaded. Typed as every
 * theme; read one that may not be registered with `loadedTheme`.
 */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- typed as every theme; read one whose chunk may not be in with `loadedTheme`
export const THEMES: Readonly<AllThemes> = themes as AllThemes;
/** Every registered cue, by id (as THEMES; `loadedCue`). */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- typed as every cue; read one whose chunk may not be in with `loadedCue`
export const CUES: Readonly<AllCues> = cues as AllCues;

/** Rebuilds the registries in order: the core, then each group. */
function rebuild(): void {
  for (const id of Object.keys(themes)) delete themes[id];
  for (const id of Object.keys(cues)) delete cues[id];
  Object.assign(themes, CORE_THEMES);
  Object.assign(cues, CORE_CUES);
  for (const g of MUSIC_GROUPS) {
    Object.assign(themes, groups.get(g)?.themes ?? {});
    Object.assign(cues, groups.get(g)?.cues ?? {});
  }
}
rebuild();

/** Registers a chunk's music groups (again: replaces them). */
export function registerMusic(add: Readonly<Partial<Record<MusicGroup, MusicSet>>>): void {
  for (const g of MUSIC_GROUPS) {
    const set = add[g];
    if (set !== undefined) groups.set(g, set);
  }
  rebuild();
}

/** A theme by id, or undefined while its chunk hasn't loaded (it plays nothing). */
export function loadedTheme(id: ThemeId): Song | undefined {
  return Object.hasOwn(themes, id) ? themes[id] : undefined;
}

/** A cue by id, or undefined while its chunk hasn't loaded (it plays nothing). */
export function loadedCue(id: CueId): Song | undefined {
  return Object.hasOwn(cues, id) ? cues[id] : undefined;
}

/**
 * The battle theme for each act (the finale's is its Phase 1 bed, the Long Walk; a map outside
 * these, a post-game mode's, plays Act I's).
 */
export const BATTLE_THEME: Readonly<Partial<Record<Act, ThemeId>>> = {
  1: 'act1_battle',
  2: 'act2_battle',
  3: 'act3_battle',
  finale: 'fin_walk',
};

/**
 * An act whose battle changes its music with the map's script phase (`state.phase`; T850): the
 * finale's Long Walk (Phase 1), the choir's hymn at the mouth of the Halls (Phase 2, the Unsung),
 * and Dawn (Phase 3). Read by the director ahead of MAP_THEME and BATTLE_THEME.
 */
export const PHASE_THEME: Readonly<Partial<Record<Act, Readonly<Record<number, ThemeId>>>>> = {
  finale: { 2: 'choir_hymn', 3: 'dawn_major' },
};

/**
 * A map whose battle has its own bed over its act's (T750; music/act3b.ts): A3M4's shelters,
 * where Bricks's hum stops halfway, and A3M5's vats at night humming the six notes. Read by the
 * director (`BattleMood.map`) ahead of BATTLE_THEME.
 */
export const MAP_THEME: Readonly<Partial<Record<string, ThemeId>>> = {
  a3_m04: 'act3_shelters',
  a3_m05: 'act3_vats',
  // The challenge maps play the battle theme of the act their layout comes from (D154 addendum);
  // Endless (end_m01) keeps Act I's, on purpose: the first shift, revisited at dawn.
  ch_m01: 'act3_battle',
  ch_m02: 'act2_battle',
  ch_m03: 'act2_battle',
};

/**
 * The loss cue by the map's jingle dial (the act's arrangement of the song): the sad trombone
 * while the jingle still plays; with no jingle (Act III) and in the finale's song, the song's last
 * notes hummed, unfinished (`lose_hush`), never a laugh ("The song isn't done.").
 */
export const LOSE_CUE: Readonly<Record<JingleVariant, CueId>> = {
  bright: 'lose',
  minor_bridges: 'lose',
  minor: 'lose',
  none: 'lose_hush',
  song: 'lose_hush',
};

/**
 * The win cue by the jingle dial, where the map's `winJingle` dial plays one: the PERIMETER
 * SECURED! fanfare, except the finale's, which is the song's last line landing home (`fin_win`).
 */
export const WIN_CUE: Readonly<Record<JingleVariant, CueId>> = {
  bright: 'win',
  minor_bridges: 'win',
  minor: 'win',
  none: 'win',
  song: 'fin_win',
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

/** Whether `id` names a registered cue. */
export function isCueId(id: string): id is CueId {
  return Object.hasOwn(cues, id);
}

/** Whether `id` names a registered theme. */
export function isThemeId(id: string): id is ThemeId {
  return Object.hasOwn(themes, id);
}
