// createSim(): the sim's public handle (architecture.md § Sim public API). The host enqueues
// commands, steps fixed 60 Hz ticks, and drains events; render reads `state` and never writes.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace, LiveIds } from '../content/types.ts';
import type { DeepReadonly } from '../shared/types.ts';
import type { Command } from './commands.ts';
import { copyCommand } from './commands.ts';
import { validateConfig, type SimConfig } from './config.ts';
import { challengeConfig } from './rules.ts';
import type { SimEvent } from './events.ts';
import { applyRunModifiers } from './economy.ts';
import { gateRefugeeGroups } from './escort.ts';
import { initChoir } from './choir.ts';
import { hashState } from './hashState.ts';
import { createState, type SimState } from './state.ts';
import { applyCommands } from './systems/applyCommands.ts';
import { createScratch, runTick, type TickContext } from './tick.ts';

export interface Sim<K extends IdSpace = LiveIds> {
  /** The live state, read-only. It's the same object every tick: read it, don't keep copies. */
  readonly state: DeepReadonly<SimState<K>>;
  readonly config: SimConfig<K>;
  readonly map: CompiledMapDef<K>;
  /** Queues a command (copied) to apply at the start of the next tick, or at applyPending(). */
  enqueue(cmd: Command<K>): void;
  /** Runs one 60 Hz tick. Does nothing once the map is won or lost. */
  step(): void;
  /**
   * Applies queued commands now, without advancing time or running any other system (builds and
   * upgrades while paused). Identical to applying them at the start of the next tick.
   */
  applyPending(): void;
  /** Appends every event since the last drain to `out` (the caller clears it) and empties the buffer. */
  drainEvents(out: SimEvent<K>[]): void;
  /** A stable 64-bit digest (16 hex) of all sim state, RNG streams included. */
  hash(): string;
}

/** Creates a sim at tick 0, in the map's setup phase. Throws a RangeError on an invalid config. */
export function createSim<K extends IdSpace = LiveIds>(input: SimConfig<K>): Sim<K> {
  // A challenge map's rules join the config first (sim/rules.ts; T862): `config` is the run's own.
  const cfg = challengeConfig(input);
  // The sim runs on string ids internally; the id space K only types the API's edges.
  const wide: SimConfig<IdSpace> = cfg;
  const map = validateConfig(wide);
  const state = createState(map, cfg.seed);
  applyRunModifiers(state, map, wide.modifiers);
  gateRefugeeGroups(state, map, wide.scriptFlags);
  initChoir(state, map, wide.scriptFlags); // the finale's choir (T804)
  const ctx: TickContext = { content: wide.content, map, config: wide, scratch: createScratch() };

  // Validated boundary: every id in the queue, the log, and the events came from K's content or
  // from a Command<K>, so the string-typed internal state is a SimState<K>. (Two casts because TS
  // can't relate DeepReadonly over a generic K; both arrays live as long as the sim.)
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- validated boundary (above)
  const view = state as unknown as DeepReadonly<SimState<K>>;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- validated boundary (above)
  const events = state.events as unknown as SimEvent<K>[];

  return {
    state: view,
    config: cfg,
    map: cfg.content.maps[cfg.mapId],
    enqueue(cmd) {
      state.pending.push(copyCommand<IdSpace>(cmd));
    },
    step() {
      if (state.outcome !== 'playing') return;
      runTick(state, ctx);
    },
    applyPending() {
      applyCommands(state, ctx);
    },
    drainEvents(out) {
      for (let i = 0; i < events.length; i++) out.push(events[i]!); // i < length
      events.length = 0;
    },
    hash() {
      return hashState(state);
    },
  };
}
