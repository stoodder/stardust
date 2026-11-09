// `window.__sd`: test hooks for smoke tests and agents (docs/tech/conventions.md § Browser smoke tests).
// Installed only when the URL has `?test=1`. They read state and issue the same commands a player
// could, through the same paths (app/commands.ts and the host loop).
import type { IdSpace } from '../content/types.ts';
import type { Sim } from '../sim/index.ts';
import type { Host } from './host.ts';
import type {
  AudioHooks,
  ClientPoint,
  HookCommand,
  HookState,
  PerfSample,
  ScreenId,
  Speed,
  TestHooks,
} from './testHookTypes.ts';

declare global {
  interface Window {
    __sd?: TestHooks;
  }
}

/** The running battle, as the hooks see it. */
export interface HookBattle {
  readonly host: Host<IdSpace>;
  /** Game-pixel position of a tile's center. */
  tileCenter(col: number, row: number, out: { x: number; y: number }): void;
}

/** What the hooks need from the rest of the app. */
export interface HookEnv {
  readonly ready: Promise<void>;
  /** The running battle, or null. */
  battle(): HookBattle | null;
  issue(cmd: HookCommand): void;
  /** Plays a named build on the running battle (throws outside one, or for an unknown build). */
  autoplay(build: string): void;
  setSpeed(speed: Speed): void;
  goto(screen: ScreenId): Promise<void>;
  /** Shows a finished map's Results now, skipping the rest of the results delay (if one waits). */
  flushResults(): void;
  /** Mean CPU time of recent frames, in ms. */
  frameMs(): number;
  /** The game canvas, to map game pixels to client coordinates. */
  canvas(): HTMLCanvasElement | null;
  /** The internal resolution's width (640), to find the canvas scale. */
  readonly viewWidth: number;
  /** The audio hooks (app/audio.ts). */
  readonly audio: AudioHooks;
}

const SPEEDS: ReadonlySet<number> = new Set([0, 1, 2]);

/** The sim's state as the hooks expose it (plain string ids). */
function stateOf(sim: Sim<IdSpace>): HookState {
  return sim.state;
}

/** Builds the hook object over the app. */
export function createTestHooks(env: HookEnv): TestHooks {
  return {
    ready: env.ready,
    state: () => {
      const b = env.battle();
      return b === null ? null : stateOf(b.host.sim);
    },
    enqueue: (cmd) => {
      env.issue(cmd);
    },
    setSpeed: (speed: Speed) => {
      if (!SPEEDS.has(speed)) throw new Error(`__sd.setSpeed: invalid speed ${String(speed)}`);
      env.setSpeed(speed);
    },
    autoplay: (build: string) => {
      env.autoplay(build);
    },
    fastForward: (ticks: number) => {
      if (!Number.isInteger(ticks) || ticks < 0) {
        throw new Error(`__sd.fastForward: ticks must be a non-negative integer, got ${ticks}`);
      }
      const b = env.battle();
      if (b === null) return;
      b.host.fastForward(ticks);
      // Fast-forwarded time is test time: a map that just ended shows its Results now.
      env.flushResults();
    },
    tileToClient: (x: number, y: number): ClientPoint | null => {
      const b = env.battle();
      const canvas = env.canvas();
      if (b === null || canvas === null) return null;
      const p = { x: 0, y: 0 };
      b.tileCenter(x, y, p);
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / env.viewWidth;
      // The center of the game pixel at p, so a click lands inside the tile's mask.
      return { x: rect.left + (p.x + 0.5) * scale, y: rect.top + (p.y + 0.5) * scale };
    },
    goto: (screen: ScreenId) => env.goto(screen),
    audio: env.audio,
    perf: (): PerfSample => {
      const b = env.battle();
      const s = b?.host.sim.state;
      return {
        frameMs: env.frameMs(),
        simMsPerTick: b?.host.simMsPerTick() ?? 0,
        enemies: s?.enemies.live ?? 0,
        towers: s?.towers.live ?? 0,
        projectiles: s?.projectiles.live ?? 0,
        // No particles until the VFX tasks add them.
        particles: 0,
      };
    },
  };
}

/** Exposes the hooks on `window.__sd`. */
export function installTestHooks(hooks: TestHooks): void {
  window.__sd = hooks;
}
