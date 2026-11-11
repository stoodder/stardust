// The audio engine: the synth's lifecycle in the browser. The AudioContext is created lazily on
// the first user gesture (browser autoplay policy) and is a no-op without WebAudio (tests,
// headless runs). Until then it only remembers what the music should be, so the right theme starts
// the moment sound unlocks. A 25 ms timer keeps the music scheduled ahead of the audio clock.
import type { CueId, ThemeId } from './music/index.ts';
import type { SfxId } from './sfx/index.ts';
import { DEFAULT_VOLUMES, Synth, type PlayOptions, type Volumes } from './synth.ts';
import type { MusicLayer } from './types.ts';

/** How often the scheduler runs (ms). */
export const PUMP_MS = 25;

/** The engine's state, for the test hooks and the HUD. */
export interface AudioStatus {
  /** WebAudio exists and audio isn't turned off. */
  readonly enabled: boolean;
  /** The context exists (a user gesture unlocked it). */
  readonly unlocked: boolean;
  /** The context's state (`running`, `suspended`, `closed`), or null before unlock. */
  readonly state: string | null;
  readonly muted: boolean;
  /** The theme playing, or null. */
  readonly theme: string | null;
  /** The playing theme's layer levels, or null. */
  readonly layers: Readonly<Record<MusicLayer, number>> | null;
  /** Sound effect instances sounding now. */
  readonly voices: number;
  /** Sounds started since unlock, by id (`cue:<id>` for music cues). */
  readonly played: Readonly<Record<string, number>>;
}

export interface AudioEngine {
  /** Creates (or resumes) the AudioContext. Call it from a user gesture. */
  unlock(): void;
  play(id: SfxId, opts?: PlayOptions): boolean;
  cue(id: CueId): void;
  /** Cuts every instance of sound effect `id` short (a loop the story ends; Synth.stop). */
  stop(id: SfxId): void;
  /** Fades out every playing instance of cue `id` (a sung line taking over; Synth.stopCue). */
  stopCue(id: CueId): void;
  /** The music to play; remembered until unlock. */
  setMusic(
    theme: ThemeId | null,
    layers: Readonly<Record<MusicLayer, number>>,
    level?: number,
  ): void;
  /**
   * Holds the music ducked to `level` under `key` (the radio, the Hollow), or releases it (null);
   * `fadeSec` sets how long that hold's dip and return take (Synth.holdDuck).
   */
  holdDuck(key: string, level: number | null, fadeSec?: number): void;
  /** Holds the low-priority sound effects ducked under `key` (a spoken line, R10), or releases. */
  holdSfxDuck(key: string, level: number | null): void;
  /** A line starts: the low-priority sound effects dip briefly under it (Synth.dipUnderSpeech). */
  dipUnderSpeech(): void;
  setVolumes(v: Volumes): void;
  /** Pauses the audio clock (a hidden tab) or resumes it. */
  setSuspended(suspended: boolean): void;
  status(): AudioStatus;
}

/** Makes the browser's AudioContext, or null without WebAudio. */
export type ContextFactory = () => AudioContext | null;

/** The browser's factory. */
export const browserContext: ContextFactory = () =>
  typeof AudioContext === 'undefined' ? null : new AudioContext({ latencyHint: 'interactive' });

/** An engine that never makes a sound (audio off, or no WebAudio). */
export function silentEngine(muted = false): AudioEngine {
  return {
    unlock() {},
    play: () => false,
    cue() {},
    stop() {},
    stopCue() {},
    setMusic() {},
    holdDuck() {},
    holdSfxDuck() {},
    dipUnderSpeech() {},
    setVolumes() {},
    setSuspended() {},
    status: () => ({
      enabled: false,
      unlocked: false,
      state: null,
      muted,
      theme: null,
      layers: null,
      voices: 0,
      played: {},
    }),
  };
}

/** Creates the engine. `factory` returning null (no WebAudio) leaves it silent. */
export function createAudioEngine(factory: ContextFactory = browserContext): AudioEngine {
  let ctx: AudioContext | null = null;
  let synth: Synth | null = null;
  let failed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let volumes: Volumes = DEFAULT_VOLUMES;
  let music: {
    theme: ThemeId | null;
    layers: Readonly<Record<MusicLayer, number>>;
    level: number;
  } = { theme: null, layers: { base: 0, drums: 0, lead: 0, choir: 0 }, level: 1 };
  const held = new Map<string, { level: number; fadeSec?: number }>();
  const sfxHeld = new Map<string, number>();

  const startTimer = (): void => {
    if (timer !== null || synth === null) return;
    const s = synth;
    timer = setInterval(() => s.pump(), PUMP_MS);
  };
  const stopTimer = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };

  return {
    unlock() {
      if (failed) return;
      if (ctx === null) {
        try {
          ctx = factory();
        } catch {
          ctx = null;
        }
        if (ctx === null) {
          failed = true;
          return;
        }
        synth = new Synth(ctx);
        synth.setVolumes(volumes);
        for (const [key, h] of held) synth.holdDuck(key, h.level, h.fadeSec);
        for (const [key, level] of sfxHeld) synth.holdSfxDuck(key, level);
        synth.setTheme(music.theme, music.layers, music.level);
        startTimer();
      }
      if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    },
    play(id, opts) {
      if (synth === null || ctx?.state !== 'running') return false;
      return synth.play(id, opts);
    },
    cue(id) {
      if (synth === null || ctx?.state !== 'running') return;
      synth.cue(id);
    },
    stop(id) {
      synth?.stop(id);
    },
    stopCue(id) {
      synth?.stopCue(id);
    },
    setMusic(theme, layers, level = 1) {
      music = { theme, layers, level };
      synth?.setTheme(theme, layers, level);
    },
    holdDuck(key, level, fadeSec) {
      if (level === null) held.delete(key);
      else held.set(key, fadeSec === undefined ? { level } : { level, fadeSec });
      synth?.holdDuck(key, level, fadeSec);
    },
    holdSfxDuck(key, level) {
      if (level === null) sfxHeld.delete(key);
      else sfxHeld.set(key, level);
      synth?.holdSfxDuck(key, level);
    },
    dipUnderSpeech() {
      if (ctx?.state === 'running') synth?.dipUnderSpeech();
    },
    setVolumes(v) {
      volumes = v;
      synth?.setVolumes(v);
    },
    setSuspended(suspended) {
      if (ctx === null) return;
      if (suspended) {
        stopTimer();
        if (ctx.state === 'running') void ctx.suspend().catch(() => {});
      } else {
        startTimer();
        if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      }
    },
    status() {
      return {
        enabled: !failed,
        unlocked: ctx !== null,
        state: ctx?.state ?? null,
        muted: volumes.muted,
        theme: synth?.theme ?? null,
        layers: synth?.layerLevels ?? null,
        voices: synth?.voices() ?? 0,
        played: Object.fromEntries(synth?.played ?? []),
      };
    },
  };
}
