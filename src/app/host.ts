// The host loop (architecture.md § Game speed, pause, and the host loop): turns real frame time
// into fixed 60 Hz sim ticks at the current speed, applies commands while paused, and drains and
// dispatches the sim's events once per frame. The sim knows nothing about speed or frames.
import type { IdSpace, LiveIds } from '../content/types.ts';
import { createBus, type Bus } from '../shared/bus.ts';
import { TICK_HZ } from '../shared/time.ts';
import type { Command, Sim, SimEvent } from '../sim/index.ts';
import type { Speed } from './testHookTypes.ts';

/** Real milliseconds per tick at 1×. */
export const TICK_MS = 1000 / TICK_HZ;
/** Catch-up cap per frame, per 1× of speed: a long stall drops its backlog instead of spiraling. */
export const MAX_STEPS_PER_FRAME = 4;
/** Frame deltas above this (a background tab, a debugger pause) are clamped. */
export const MAX_FRAME_DELTA_MS = 250;
/** Smoothing for the sim-time-per-tick average (exponential, per frame that stepped). */
const PERF_SMOOTHING = 0.1;

export interface Host<K extends IdSpace = LiveIds> {
  readonly sim: Sim<K>;
  /** Drained sim events, dispatched by type once per frame (and once per fastForward). */
  readonly bus: Bus<SimEvent<K>>;
  readonly speed: Speed;
  setSpeed(speed: Speed): void;
  /** Queues a command for the next tick (or for applyPending while paused). */
  enqueue(cmd: Command<K>): void;
  /** Advances by one rendered frame of `deltaMs` real time. Returns the ticks stepped. */
  frame(deltaMs: number): number;
  /** Steps `ticks` ticks now with no frame cap or speed, then dispatches the events once. */
  fastForward(ticks: number): void;
  /** Runs `listener` after every frame's (and fastForward's) dispatch. Returns its `off`. */
  onAfterFrame(listener: () => void): () => void;
  /** Mean wall time per sim tick over recent frames, in ms. */
  simMsPerTick(): number;
}

export interface HostOptions {
  /** A millisecond clock for the sim-time measurement (default `performance.now`). */
  readonly now?: () => number;
  readonly speed?: Speed;
}

/** Wraps a sim in a host loop. */
export function createHost<K extends IdSpace>(sim: Sim<K>, opts: HostOptions = {}): Host<K> {
  const now = opts.now ?? (() => performance.now());
  const bus = createBus<SimEvent<K>>();
  const afterFrame: (() => void)[] = [];
  const events: SimEvent<K>[] = [];
  let speed: Speed = opts.speed ?? 1;
  let acc = 0;
  let msPerTick = 0;

  const dispatch = (): void => {
    events.length = 0;
    sim.drainEvents(events);
    for (let i = 0; i < events.length; i++) bus.emit(events[i]!); // i < length
    events.length = 0;
    for (let i = 0; i < afterFrame.length; i++) afterFrame[i]!(); // i < length
  };

  const runSteps = (n: number): void => {
    if (n === 0) return;
    const t0 = now();
    for (let i = 0; i < n; i++) sim.step();
    const per = (now() - t0) / n;
    msPerTick = msPerTick === 0 ? per : msPerTick + (per - msPerTick) * PERF_SMOOTHING;
  };

  return {
    sim,
    bus,
    get speed() {
      return speed;
    },
    setSpeed(next) {
      speed = next;
      // Paused time doesn't bank: resuming starts from an empty accumulator.
      if (next === 0) acc = 0;
    },
    enqueue(cmd) {
      sim.enqueue(cmd);
    },
    frame(deltaMs) {
      const delta = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
      const cap = MAX_STEPS_PER_FRAME * Math.max(speed, 1);
      acc += Math.min(delta, MAX_FRAME_DELTA_MS) * speed;
      let steps = 0;
      while (acc >= TICK_MS && steps < cap) {
        acc -= TICK_MS;
        steps++;
      }
      if (steps === cap) acc = 0;
      runSteps(steps);
      // Build, upgrade, and sell land while paused (core-loop §2.5) without advancing time.
      if (speed === 0) sim.applyPending();
      dispatch();
      return steps;
    },
    fastForward(ticks) {
      if (!Number.isInteger(ticks) || ticks < 0) {
        throw new RangeError(`fastForward: ticks must be a non-negative integer, got ${ticks}`);
      }
      runSteps(ticks);
      if (ticks === 0) sim.applyPending();
      dispatch();
    },
    onAfterFrame(listener) {
      afterFrame.push(listener);
      return () => {
        const i = afterFrame.indexOf(listener);
        if (i >= 0) afterFrame.splice(i, 1);
      };
    },
    simMsPerTick() {
      return msPerTick;
    },
  };
}
