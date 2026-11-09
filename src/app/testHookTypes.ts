// The shape of `window.__sd` (docs/tech/conventions.md § Browser smoke tests).
// DOM-free on purpose: the smoke specs (tsconfig.node.json) import these types too.

/** Screens `goto` can jump to. Grows as screens land (T112, T115). */
export type ScreenId = 'title';

/** Game speed: paused, 1×, or 2×. */
export type Speed = 0 | 1 | 2;

export interface ClientPoint {
  readonly x: number;
  readonly y: number;
}

export interface PerfSample {
  /** Mean CPU time of recent frames, in ms. */
  readonly frameMs: number;
  /** Mean sim time per tick, in ms (0 until the sim exists). */
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
  /** The read-only sim state. Stub: `null` until a sim exists (T102/T112). */
  state(): unknown;
  /** Issues a `Command` exactly as the UI would. Stub: no-op until T112. */
  enqueue(cmd: unknown): void;
  /** Sets game speed. Stored now; drives the host loop from T112. */
  setSpeed(speed: Speed): void;
  /** Runs a named build from the map's `builds.ts` through the host. Stub: no-op until T107. */
  autoplay(build: string): void;
  /** Steps the sim `ticks` times synchronously, then dispatches events once. Stub: no-op until T112. */
  fastForward(ticks: number): void;
  /** Client coordinates of a tile's center. Stub: `null` until T112 (needs `render/iso.ts`). */
  tileToClient(x: number, y: number): ClientPoint | null;
  /** Jumps to a screen. */
  goto(screen: ScreenId): void;
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
