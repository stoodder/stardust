// The audio module's public face (architecture.md § Audio): app/audio.ts binds it to the game.
export {
  createAudioEngine,
  silentEngine,
  type AudioEngine,
  type AudioStatus,
  type ContextFactory,
} from './engine.ts';
export {
  battleMusic,
  countdownTick,
  crossedLowIntegrity,
  screenMusic,
  type BattleMood,
  type MusicIntent,
  type MusicScreen,
} from './director.ts';
export {
  ABILITY_SOUNDS,
  createEventSounds,
  SOUND_EVENT_TYPES,
  type EnemyLookup,
  type SoundCall,
} from './eventSounds.ts';
export { createFieldSounds, type FieldSounds, type FieldState } from './fieldSounds.ts';
export { blipFor, createTypeTicker, type TypeTicker } from './speech.ts';
export { CUES, THEMES, isCueId, isThemeId, type CueId, type ThemeId } from './music/index.ts';
export { SFX_IDS, isSfxId, type SfxId } from './sfx/index.ts';
export { DEFAULT_VOLUMES, type Volumes } from './synth.ts';
export type { RenderLevels } from './offline.ts';
export type { Levels } from './analyze.ts';
