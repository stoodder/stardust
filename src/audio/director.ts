// The music director (pure): which theme plays and how loud each layer is, from what's on screen
// and how the battle is going. Layers add as a battle intensifies (architecture.md § Audio):
// the base always, drums while a wave is on the field, and the lead for the final waves or when
// the core is in trouble; the Hum Choir's harmony line whenever a Choir stands. On a choir map
// (the finale) the singers are the music: the procession's hum (Phase 1) and the choir behind
// Pebble in the hymn (Phase 2) sound at the Voices still singing, and the theme follows the
// script phase (PHASE_THEME). The synth crossfades to whatever this returns.
import type { Act } from '../content/types.ts';
import { BATTLE_THEME, MAP_THEME, PHASE_THEME, type ThemeId } from './music/index.ts';
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
  /** The map's script phase (`state.phase`; the finale's 2 and 3 change its music: PHASE_THEME). */
  readonly phase?: number;
  /**
   * On a choir map, the share of its singers still singing (Voices ÷ the choir, 0–1); absent
   * without a choir.
   */
  readonly voices?: number;
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
/** The post-game title's layers: its `choir` is the home motif hummed in the gaps (music/fin.ts). */
const TITLE_DAWN_LAYERS: LayerLevels = { base: 1, drums: 0, lead: 1, choir: 1 };

/** The singers' level with none left singing (the choir's layer never falls silent: Pebble sings). */
export const VOICES_FLOOR = 0.2;
/** The singers' level moves in steps this size (a hush moves it; it doesn't flicker). */
export const VOICES_STEP = 0.05;

/** The singers' layer level for `share` of the choir singing (VOICES_FLOOR to 1, in steps). */
export function voicesLevel(share: number): number {
  const v = Math.min(1, Math.max(0, share));
  const level = VOICES_FLOOR + (1 - VOICES_FLOOR) * v;
  return Math.round(Math.round(level / VOICES_STEP) * VOICES_STEP * 1000) / 1000;
}

/** The music for a battle in `mood`. A finished map is silent: its win or loss cue plays alone. */
export function battleMusic(mood: BattleMood): MusicIntent {
  const phased = PHASE_THEME[mood.act]?.[mood.phase ?? 0];
  const own =
    mood.map !== undefined && Object.hasOwn(MAP_THEME, mood.map) ? MAP_THEME[mood.map] : undefined;
  const theme = phased ?? own ?? BATTLE_THEME[mood.act] ?? BATTLE_THEME[1] ?? null;
  if (mood.outcome !== 'playing') return { theme, layers: SILENT, level: 0 };
  const finalWaves = mood.wave > 0 && mood.wave > mood.waveCount - LEAD_FINAL_WAVES;
  const lowIntegrity = mood.wave > 0 && mood.integrity <= LOW_INTEGRITY;
  const tower = mood.choir === true ? 1 : 0;
  const level = mood.paused ? PAUSED_LEVEL : 1;
  const drums = mood.waveActive ? 1 : 0;
  if (mood.voices !== undefined) {
    // A choir map: the singers carry the music. Phase 1, the procession hums at the Voices'
    // level (the lead) and a Hum Choir answers it; Phase 2, Pebble leads the hymn and the choir
    // behind her swells and thins with the Voices; Dawn, everyone sings.
    const singers = voicesLevel(mood.voices);
    const phase = mood.phase ?? 0;
    const layers =
      phase >= 3
        ? { base: 1, drums, lead: 1, choir: 1 }
        : phase >= 2
          ? { base: 1, drums, lead: 1, choir: singers }
          : { base: 1, drums, lead: singers, choir: tower };
    return { theme, layers, level };
  }
  return {
    theme,
    layers: { base: 1, drums, lead: finalWaves || lowIntegrity ? 1 : 0, choir: tower },
    level,
  };
}

/**
 * The music for a screen without a battle (the title theme; Results stays quiet after its cue).
 * After the finale (`postGame`), the title is the post-game's, `title_dawn`, its home motif up.
 */
export function screenMusic(screen: MusicScreen, postGame = false): MusicIntent {
  if (screen === 'title' && postGame) {
    return { theme: 'title_dawn', layers: TITLE_DAWN_LAYERS, level: 1 };
  }
  if (screen === 'title') return { theme: 'title', layers: TITLE_LAYERS, level: 1 };
  return { theme: null, layers: SILENT, level: 0 };
}

/**
 * The prelude's music (T1001; act1.md § Prelude · Arrival): the title theme (it has a base and a
 * lead, no drums), its layers by shot, 1–7. The ad plays it whole; on the freighter the lead sits
 * back; at the viewport the base holds alone, through the silence; from the descent the layers come
 * back, and stay up for Dome Row and the delivery, so the intake's title theme picks up unbroken.
 */
export const PRELUDE_LAYERS: readonly LayerLevels[] = [
  { base: 1, drums: 0, lead: 1, choir: 0 },
  { base: 1, drums: 0, lead: 0.4, choir: 0 },
  { base: 1, drums: 0, lead: 0, choir: 0 },
  { base: 1, drums: 0, lead: 1, choir: 0 },
  { base: 1, drums: 0, lead: 1, choir: 0 },
  { base: 1, drums: 0, lead: 1, choir: 0 },
  { base: 1, drums: 0, lead: 1, choir: 0 },
];

/** The music under the prelude's shot `shot` (1–7; clamped): the title theme at PRELUDE_LAYERS. */
export function preludeMusic(shot: number): MusicIntent {
  const i = Math.min(PRELUDE_LAYERS.length - 1, Math.max(0, Math.floor(shot) - 1));
  return { theme: 'title', layers: PRELUDE_LAYERS[i]!, level: 1 }; // i in range
}

/** The music the epilogue holds from the counter's flip to its end (app/ending.ts). */
export function heldMusic(theme: ThemeId): MusicIntent {
  return { theme, layers: { base: 1, drums: 1, lead: 1, choir: 1 }, level: 1 };
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
