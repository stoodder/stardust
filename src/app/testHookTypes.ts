// The shape of `window.__sd` (docs/tech/conventions.md § Browser smoke tests).
// DOM-free on purpose: the smoke specs (tsconfig.node.json) import these types too.
import type { IdSpace } from '../content/types.ts';
import type { DeepReadonly } from '../shared/types.ts';
import type { Command, SimState } from '../sim/index.ts';

/** Battle state as the hooks expose it: plain string ids (works for any content set). */
export type HookState = DeepReadonly<SimState>;
export type HookCommand = Command<IdSpace>;

/**
 * Screens `goto` can jump to. `results` shows the last finished run's results (it rejects if no
 * run has ended yet).
 */
export type ScreenId = 'title' | 'battle' | 'results';

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
   * the events once. `fastForward(0)` applies pending commands without advancing time.
   */
  fastForward(ticks: number): void;
  /** Client (CSS pixel) coordinates of tile (x, y)'s center, or `null` outside a battle. */
  tileToClient(x: number, y: number): ClientPoint | null;
  /** Jumps to a screen. Resolves once it has rendered (`battle`: its first frame). */
  goto(screen: ScreenId): Promise<void>;
  /**
   * Test-only, not a player action: ends the running battle as if the sim had emitted `MapWon` or
   * `MapLost`, with its stats as they stand, and shows the results screen. Rejects outside a
   * battle. Lets smoke flows reach both results screens without playing a map out.
   */
  forceOutcome(outcome: RunOutcome): Promise<void>;
  /** Recent frame and sim timings and live entity counts. */
  perf(): PerfSample;
}

/** Boot parameters read from the URL (`?test=1&seed=…&map=…&skipIntro=1`). */
export interface BootParams {
  readonly test: boolean;
  readonly seed: number | null;
  readonly map: string | null;
  readonly skipIntro: boolean;
}
