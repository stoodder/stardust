// `window.__sd`: test hooks for smoke tests and agents (docs/tech/conventions.md § Browser smoke tests).
// Installed only when the URL has `?test=1`.
import type { ClientPoint, PerfSample, ScreenId, Speed, TestHooks } from './testHookTypes.ts';

declare global {
  interface Window {
    __sd?: TestHooks;
  }
}

/** What the hooks need from the rest of the app. Grows as the host (T112) lands. */
export interface HookEnv {
  readonly ready: Promise<void>;
  setSpeed(speed: Speed): void;
  goto(screen: ScreenId): void;
  /** Mean CPU time of recent frames, in ms. */
  frameMs(): number;
}

const SPEEDS: ReadonlySet<number> = new Set([0, 1, 2]);

/** Builds the hook object over the app's current capabilities. */
export function createTestHooks(env: HookEnv): TestHooks {
  return {
    ready: env.ready,
    state: () => null,
    enqueue: () => {},
    setSpeed: (speed: Speed) => {
      if (!SPEEDS.has(speed)) throw new Error(`__sd.setSpeed: invalid speed ${String(speed)}`);
      env.setSpeed(speed);
    },
    autoplay: () => {},
    fastForward: (ticks: number) => {
      if (!Number.isInteger(ticks) || ticks < 0) {
        throw new Error(`__sd.fastForward: ticks must be a non-negative integer, got ${ticks}`);
      }
    },
    tileToClient: (): ClientPoint | null => null,
    goto: (screen: ScreenId) => {
      env.goto(screen);
    },
    perf: (): PerfSample => ({
      frameMs: env.frameMs(),
      simMsPerTick: 0,
      enemies: 0,
      towers: 0,
      projectiles: 0,
      particles: 0,
    }),
  };
}

/** Exposes the hooks on `window.__sd`. */
export function installTestHooks(hooks: TestHooks): void {
  window.__sd = hooks;
}
