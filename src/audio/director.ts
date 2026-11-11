// The music director (pure): which theme plays and how loud each layer is, from what's on screen
// and how the battle is going. Layers add as a battle intensifies (architecture.md § Audio):
// the base always, drums while a wave is on the field, and the lead for the final waves or when
// the core is in trouble; the Hum Choir's harmony line whenever a Choir stands. The synth
// crossfades to whatever this returns.
import type { Act } from '../content/types.ts';
import { BATTLE_THEME, MAP_THEME, type ThemeId } from './music/index.ts';
import type { MusicLayer } from './types.ts';

/** Integrity at or below this sounds the alarm and brings in the lead (art-direction §9: red at 5). */
export const LOW_INTEGRITY = 5;
/** The lead joins for this many final waves (W6–W7 of a 7-wave map). */
export const LEAD_FINAL_WAVES = 2;
/** The music's level while the game is paused (it keeps playing, quieter). */
export const PAUSED_LEVEL = 0.5;

/** What the screen shows, for the music (the router's screens). */
export type MusicScreen = 'title' | 'battle' | 'results' | null;

/** A battle's state, as the music reads it. */
export interface BattleMood {
  readonly act: Act;
  /** The last wave started (0 in the setup phase). */
  readonly wave: number;
  readonly waveCount: number;
  /** Enemies are on the field or still spawning. */
  readonly waveActive: boolean;
  readonly integrity: number;
  readonly outcome: 'playing' | 'won' | 'lost';
  readonly paused: boolean;
  /** A tower projecting a Hum Choir aura stands (fieldSounds' `choirLive`): its harmony line. */
  readonly choir?: boolean;
  /** The map's id: a map with its own bed (MAP_THEME: A3M4's shelters, A3M5's vats) plays it. */
  readonly map?: string;
}

export type LayerLevels = Readonly<Record<MusicLayer, number>>;

/** What the music should do now. */
export interface MusicIntent {
  readonly theme: ThemeId | null;
  readonly layers: LayerLevels;
  /** The theme's overall level (0–1). */
  readonly level: number;
}

const SILENT: LayerLevels = { base: 0, drums: 0, lead: 0, choir: 0 };
const TITLE_LAYERS: LayerLevels = { base: 1, drums: 0, lead: 1, choir: 0 };

/** The music for a battle in `mood`. A finished map is silent: its win or loss cue plays alone. */
export function battleMusic(mood: BattleMood): MusicIntent {
  const own = mood.map !== undefined && Object.hasOwn(MAP_THEME, mood.map) ? MAP_THEME[mood.map] : undefined;
  const theme = own ?? BATTLE_THEME[mood.act] ?? BATTLE_THEME[1] ?? null;
  if (mood.outcome !== 'playing') return { theme, layers: SILENT, level: 0 };
  const finalWaves = mood.wave > 0 && mood.wave > mood.waveCount - LEAD_FINAL_WAVES;
  const lowIntegrity = mood.wave > 0 && mood.integrity <= LOW_INTEGRITY;
  return {
    theme,
    layers: {
      base: 1,
      drums: mood.waveActive ? 1 : 0,
      lead: finalWaves || lowIntegrity ? 1 : 0,
      choir: mood.choir === true ? 1 : 0,
    },
    level: mood.paused ? PAUSED_LEVEL : 1,
  };
}

/** The music for a screen without a battle (the title theme; Results stays quiet after its cue). */
export function screenMusic(screen: MusicScreen): MusicIntent {
  if (screen === 'title') return { theme: 'title', layers: TITLE_LAYERS, level: 1 };
  return { theme: null, layers: SILENT, level: 0 };
}

/**
 * The countdown tick for a change in the whole seconds left before a wave: each of the last three
 * seconds ticks, and the last tick is pitched up a fifth. Null when nothing should tick.
 */
export function countdownTick(prev: number | null, secs: number | null): { pitch: number } | null {
  if (secs === null || secs === prev || secs > 3 || secs < 1) return null;
  return { pitch: secs === 1 ? 7 : 0 };
}

/** Whether integrity just fell to the alarm line (it sounds once per crossing). */
export function crossedLowIntegrity(prev: number, next: number): boolean {
  return prev > LOW_INTEGRITY && next <= LOW_INTEGRITY && next > 0;
}
