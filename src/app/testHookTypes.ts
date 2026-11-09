// The shape of `window.__sd` (docs/tech/conventions.md § Browser smoke tests).
// DOM-free on purpose: the smoke specs (tsconfig.node.json) import these types too.
import type { IdSpace } from '../content/types.ts';
import type { SaveData } from '../meta/saveData.ts';
import type { DeepReadonly } from '../shared/types.ts';
import type { Command, SimState } from '../sim/index.ts';

/** Battle state as the hooks expose it: plain string ids (works for any content set). */
export type HookState = DeepReadonly<SimState>;
export type HookCommand = Command<IdSpace>;

/**
 * Screens `goto` can jump to. `results` shows the last finished run's results (it rejects if no
 * run has ended yet); `intake` (character creation, T306) a loaded save or a held new game; `campaign` (the Shift board) needs a loaded save, `base` an open base, and
 * `loadout` a loaded save (it opens for the URL's `?map=`, else the default map, whether or not
 * the skip rule would show it).
 */
export type ScreenId =
  'title' | 'intake' | 'campaign' | 'base' | 'settings' | 'loadout' | 'battle' | 'results';

/** How a finished run ended. */
export type RunOutcome = 'won' | 'lost';

/** Game speed: paused, 1×, or 2×. */
export type Speed = 0 | 1 | 2;

export interface ClientPoint {
  readonly x: number;
  readonly y: number;
}

export interface PerfSample {
  /** Mean CPU time of recent frames (Phaser's step through render), in ms. */
  readonly frameMs: number;
  /** Mean sim time per tick, in ms (0 outside a battle). */
  readonly simMsPerTick: number;
  readonly enemies: number;
  readonly towers: number;
  readonly projectiles: number;
  readonly particles: number;
}

/**
 * Test hooks, exposed only when the URL has `?test=1`. They read state and issue the same
 * commands a player could. Hooks marked "stub" are no-ops until the task named in their doc.
 */
export interface TestHooks {
  /** Resolves after boot (the first scene has rendered and the UI is mounted). */
  readonly ready: Promise<void>;
  /** The live, read-only sim state of the current battle, or `null` outside one. */
  state(): HookState | null;
  /** Issues a `Command` exactly as the UI would (it applies on the next tick). No-op outside a battle. */
  enqueue(cmd: HookCommand): void;
  /** Sets game speed; during a battle it drives the host loop. */
  setSpeed(speed: Speed): void;
  /**
   * Plays a named build from the map's `builds.ts` through the host from now on: `'par'`,
   * `'none'`, `'alwaysCallEarly'`, or an alt build's name. Each step is issued before the tick it's
   * due on (the balance harness's executor), at any speed or under `fastForward`, until the battle
   * ends. Closes the briefing. Throws outside a battle or for an unknown build.
   */
  autoplay(build: string): void;
  /**
   * Steps the sim `ticks` times synchronously (ignoring speed, even while paused), then dispatches
   * the events once. `fastForward(0)` applies pending commands without advancing time. If the map
   * has ended (now or earlier), its Results show at once, skipping the 1.5 s results delay.
   */
  fastForward(ticks: number): void;
  /** Client (CSS pixel) coordinates of tile (x, y)'s center, or `null` outside a battle. */
  tileToClient(x: number, y: number): ClientPoint | null;
  /** Jumps to a screen. Resolves once it has rendered (`battle`: its first frame). */
  goto(screen: ScreenId): Promise<void>;
  /** Recent frame and sim timings and live entity counts. */
  perf(): PerfSample;
  /** The audio (T205): its state, and offline renders of its sounds for the level checks. */
  readonly audio: AudioHooks;
  /** A copy of the campaign save in play (T209), or `null` (the Title, or a `?map=` battle). */
  save(): SaveData | null;
  /** Dialogue (T302b): plays scenes and barks by id, and reads what shows. */
  readonly dialogue: DialogueHooks;
  /**
   * Shows a made-up finished run's Results (T316; app/resultsFixture.ts), with the map's flow: a
   * win's before-Results scenes, then the card, whose dismissal plays the after-Results scenes
   * (scenes play only with `&dialogue=1`). It reads the save in play but never writes it. From a
   * menu, not a battle (it throws during one). Resolves once the card shows.
   */
  results(fixture: ResultsFixture): Promise<void>;
}

/** A finished run for `results` (T316). */
export interface ResultsFixture {
  /** A campaign map id (registered or not: an unregistered one pays nothing and has no medals). */
  readonly map: string;
  readonly outcome: RunOutcome;
  /** This run's Pests Processed. Default 120. */
  readonly pests?: number;
  /** The Quiet Wave (`quiet_wave` group) units that spawned and leaked, for C1's `thisRun`. */
  readonly quietWave?: { readonly spawned: number; readonly leaked: number };
  /** Scenes in place of the map's flow, by id (registered or dev, `ui/dialogue/dev.ts`). */
  readonly flow?: { readonly before?: readonly string[]; readonly after?: readonly string[] };
}

export interface DialogueHooks {
  /**
   * Plays a scene by id: a registered one, or a dev scene (`ui/dialogue/dev.ts`). One that holds
   * input opens now (in a battle it pauses the sim); a comms scene queues on the panel.
   */
  play(id: string): void;
  /** Plays a bark by id (registered or dev) on the panel, as a map script cue would. In a battle. */
  bark(id: string): void;
  /** The scene holding input and the comms panel's line text, or null for each. */
  shown(): { readonly scene: string | null; readonly comms: string | null };
}

/** Peak, RMS, and audible length of a render (`src/audio/analyze.ts`). */
export interface LevelSample {
  readonly peak: number;
  readonly rms: number;
  readonly peakDb: number;
  readonly rmsDb: number;
  readonly durationSec: number;
  readonly clipped: number;
}

/** A render's levels through the master chain (`out`) and before the limiter (`raw`). */
export interface RenderSample {
  readonly out: LevelSample;
  readonly raw: LevelSample;
}

/** The audio's live state (`src/audio/engine.ts` AudioStatus). */
export interface AudioSample {
  readonly enabled: boolean;
  readonly unlocked: boolean;
  readonly state: string | null;
  readonly muted: boolean;
  readonly theme: string | null;
  readonly layers: Readonly<Record<'base' | 'drums' | 'lead', number>> | null;
  readonly voices: number;
  readonly played: Readonly<Record<string, number>>;
}

export interface AudioHooks {
  status(): AudioSample;
  /** Every sound effect, cue, and theme id. */
  ids(): {
    readonly sfx: readonly string[];
    readonly cues: readonly string[];
    readonly themes: readonly string[];
  };
  /** Renders a sound effect (`sfx:<id>`), cue (`cue:<id>`), theme (`theme:<id>`), or `storm` offline. */
  render(what: string): Promise<RenderSample>;
}

/** Boot parameters read from the URL (`?test=1&seed=…&map=…&skipIntro=1&dialogue=1&audio=1&save=…`). */
export interface BootParams {
  readonly test: boolean;
  /**
   * Whether dialogue plays: the comms panel's radio and barks, and in-battle scenes (T302b; D026's
   * radio rule). On for players; `?test=1` turns it off so screenshots stay clear (the briefing
   * still shows, whole), and `&dialogue=1` (or M2's `&radio=1`) turns it back on.
   */
  readonly dialogue: boolean;
  /**
   * Whether audio plays (T205). On for players; `?test=1` turns it off (no AudioContext), and
   * `&audio=1` turns it back on for the specs that assert it.
   */
  readonly audio: boolean;
  readonly seed: number | null;
  readonly map: string | null;
  readonly skipIntro: boolean;
  /**
   * Whether the intake (character creation, T306) runs on New game and for a save with no
   * profile. On for players; `?test=1` turns it off (a new game starts with no profile, as a v1
   * save plays), and `&intake=1` turns it back on for the specs that assert it.
   */
  readonly intake: boolean;
  /**
   * A dev save to play (`meta/__fixtures__/devSaves.ts`), in an in-memory scratch slot with its
   * `devUnlocks`. Read only with `?test=1` (D031); null otherwise.
   */
  readonly save: string | null;
}
