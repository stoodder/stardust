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
  /**
   * Kills by enemy id (towers and abilities). A key appears on its enemy's first kill, so key
   * order is kill order: deterministic, and hash() walks it.
   */
  killsByEnemy: Record<string, number>;
  integrityLost: number;
  towersBuilt: number;
  /** Gross credits paid for builds and upgrades (refunds don't reduce it; see creditsRefunded). */
  creditsSpent: number;
  /** Credits sells returned. Net spending is `creditsSpent − creditsRefunded`. */
  creditsRefunded: number;
  /** Credits earned in play: bounties, clear bonuses, early-call bonuses, and script grants. */
  creditsEarned: number;
  abilityUses: number;
}

export type Outcome = 'playing' | 'won' | 'lost';

/**
 * Where the wave schedule is (design/core-loop.md § 2.1):
 * - `setup`: before wave 1; no countdown runs until the player starts it (callWave).
 * - `spawning`: wave `wave` is spawning its groups.
 * - `countdown`: wave `wave` has finished spawning; the next wave's countdown is running.
 * - `done`: the last wave has finished spawning (the map ends when every wave resolves).
 */
export type SchedulePhase = 'setup' | 'spawning' | 'countdown' | 'done';

/** The wave schedule and per-wave resolution (the waves and cleanup systems). */
export interface WaveSchedule {
  phase: SchedulePhase;
  /** While spawning: ticks since the current wave started (its groups' delays count from 0). */
  waveTicks: number;
  /** While counting down: ticks left before the next wave starts on its own; else 0. */
  countdownTicks: number;
  /** The running countdown's full length in ticks (the early-call bonus scales by it); else 0. */
  countdownTotalTicks: number;
  /**
   * The highest wave whose build phase has begun: 1 from the start (wave 1's build phase is the
   * setup), N + 1 once wave N finishes spawning. The `countdown` script trigger reads it.
   */
  countdownWave: number;
  /** Per wave (index = wave − 1): the tick it started, or −1. */
  startTick: number[];
  /** Per wave: enemies that haven't died or leaked yet, unspawned ones included. */
  remaining: number[];
  /** Per wave: resolved (every enemy died or leaked) and its clear bonus paid. */
  resolved: boolean[];
}
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
  /** The last wave started (1-based); 0 during the setup phase. */
  wave: number;
  schedule: WaveSchedule;
  /** Per map event (CompiledMapDef.events, same order): it has fired. */
  scriptFired: boolean[];
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
  /**
   * Commander ability cooldowns in ticks, by slot (index 0 = slot 1, 1 = slot 2); 0 = ready. The
   * abilities system ticks them down (T113).
   */
  abilityCooldownTicks: number[];
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
    schedule: {
      phase: 'setup',
      waveTicks: 0,
      countdownTicks: 0,
      countdownTotalTicks: 0,
      countdownWave: 1,
      startTick: map.waves.map(() => -1),
      remaining: map.waves.map((w) => w.groups.reduce((n, g) => n + g.count, 0)),
      resolved: map.waves.map(() => false),
    },
    scriptFired: map.events.map(() => false),
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
      killsByEnemy: {},
      integrityLost: 0,
      towersBuilt: 0,
      creditsSpent: 0,
      creditsRefunded: 0,
      creditsEarned: 0,
      abilityUses: 0,
    },
    abilityCooldownTicks: [0, 0],
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
