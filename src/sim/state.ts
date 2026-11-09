// SimState: everything that changes during a run, as plain data. hash() walks all of it except
// the output buffers (HASH_EXCLUDED), so two runs that agree on hash() agree on every field.
// Immutable inputs (content, the map, the config) live in the TickContext instead (tick.ts).
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { createRng, forkRng, type Rng } from '../shared/rng.ts';
import type { Command, CommandLogEntry } from './commands.ts';
import {
  ALLY_BLANK,
  ENEMY_BLANK,
  PROJECTILE_BLANK,
  TOWER_BLANK,
  ZONE_BLANK,
  type Ally,
  type Enemy,
  type Projectile,
  type Tower,
  type Zone,
} from './entities.ts';
import type { SimEvent } from './events.ts';
import { createPool, type Pool } from './pool.ts';

/** Initial pool sizes, from the design's peak live counts (pools grow past them if needed). */
export const POOL_CAPACITY = {
  towers: 48,
  enemies: 256,
  projectiles: 256,
  zones: 32,
  allies: 16,
} as const;

/**
 * One RNG stream per system that may roll, forked from the run's seed under the system's name. A
 * system uses only its own stream, so adding a roll anywhere never shifts another system's results.
 */
export interface SimRngs {
  waves: Rng;
  triggers: Rng;
  status: Rng;
  abilities: Rng;
  movement: Rng;
  towers: Rng;
  projectiles: Rng;
}

/**
 * Per-run stats (integers). M1 has the run stats conditions read (`RunStat` in content/types.ts)
 * and the Pests Processed count; the other story stats arrive with their tasks (T206, T202).
 */
export interface SimStats {
  /** Pests Processed this run: Skitterkin enemies killed by towers or abilities. */
  skitterkinKilled: number;
  integrityLost: number;
  towersBuilt: number;
  /** Gross credits paid for builds and upgrades (refunds don't reduce it). */
  creditsSpent: number;
  abilityUses: number;
}

export type Outcome = 'playing' | 'won' | 'lost';

/**
 * K types the ids in the command queue, the log, and the events (the sim's API edge); inside the
 * sim everything is SimState<IdSpace>, with plain string ids.
 */
export interface SimState<K extends IdSpace = IdSpace> {
  /** Ticks completed. During a step, the number of the tick being run (the first tick is 0). */
  tick: number;
  /** The next entity uid to hand out; one counter for every pool, so uids are unique run-wide. */
  nextUid: number;
  outcome: Outcome;
  credits: number;
  /** Core integrity (the meter on Defend maps). */
  integrity: number;
  /** The last wave started (1-based); 0 during the setup phase. Wave state grows with T105b. */
  wave: number;
  /** Loadout towers not yet unlocked (towerUnlockWave), in unlock order. */
  lockedTowers: string[];
  /** Row-major, one per map tile: the slot of the tower standing there, or −1. */
  towerAtTile: number[];
  towers: Pool<Tower>;
  enemies: Pool<Enemy>;
  projectiles: Pool<Projectile>;
  zones: Pool<Zone>;
  allies: Pool<Ally>;
  rng: SimRngs;
  stats: SimStats;
  /** Commands enqueued and not yet applied (FIFO). */
  pending: Command<K>[];
  /** Output, not state: every command applied so far, with its tick. Not hashed. */
  commandLog: CommandLogEntry<K>[];
  /** Output, not state: events since the last drainEvents(). Not hashed. */
  events: SimEvent<K>[];
}

/** Top-level SimState keys that hash() skips: output buffers, which never feed back into play. */
export const HASH_EXCLUDED: ReadonlySet<string> = new Set<keyof SimState>(['commandLog', 'events']);

/** The state at tick 0, before any command: the map's setup phase. */
export function createState(map: CompiledMapDef<IdSpace>, seed: number): SimState {
  const root = createRng(seed);
  const rng: SimRngs = {
    waves: forkRng(root, 'waves'),
    triggers: forkRng(root, 'triggers'),
    status: forkRng(root, 'status'),
    abilities: forkRng(root, 'abilities'),
    movement: forkRng(root, 'movement'),
    towers: forkRng(root, 'towers'),
    projectiles: forkRng(root, 'projectiles'),
  };
  return {
    tick: 0,
    nextUid: 1,
    outcome: 'playing',
    credits: map.startCredits,
    integrity: map.coreIntegrity,
    wave: 0,
    lockedTowers: [...map.lockedTowersAtStart],
    towerAtTile: Array.from({ length: map.cols * map.rows }, () => -1),
    towers: createPool(TOWER_BLANK, POOL_CAPACITY.towers),
    enemies: createPool(ENEMY_BLANK, POOL_CAPACITY.enemies),
    projectiles: createPool(PROJECTILE_BLANK, POOL_CAPACITY.projectiles),
    zones: createPool(ZONE_BLANK, POOL_CAPACITY.zones),
    allies: createPool(ALLY_BLANK, POOL_CAPACITY.allies),
    rng,
    stats: {
      skitterkinKilled: 0,
      integrityLost: 0,
      towersBuilt: 0,
      creditsSpent: 0,
      abilityUses: 0,
    },
    pending: [],
    commandLog: [],
    events: [],
  };
}

/** Hands out the next uid. */
export function takeUid(state: SimState): number {
  return state.nextUid++;
}

/** Queues an event for the host. */
export function emit(state: SimState, event: SimEvent<IdSpace>): void {
  state.events.push(event);
}
