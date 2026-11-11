// SimState: everything that changes during a run, as plain data. hash() walks all of it except
// the output buffers (HASH_EXCLUDED), so two runs that agree on hash() agree on every field.
// Immutable inputs (content, the map, the config) live in the TickContext instead (tick.ts).
import type { CompiledMapDef, CompiledScriptTrigger } from '../content/compiled.ts';
import { SELL_REFUND_PCT } from '../content/rules.ts';
import type {
  EnemyFaction,
  IdSpace,
  MeterLabel,
  ObjectiveKind,
  TileChar,
  WaveTag,
} from '../content/types.ts';
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
import type { MedalKind, SimEvent } from './events.ts';
import { createPool, type Pool } from './pool.ts';

/** Initial pool sizes, from the design's peak live counts (pools grow past them if needed). */
export const POOL_CAPACITY = {
  towers: 48,
  enemies: 256,
  projectiles: 256,
  zones: 32,
  // Escort refugees plus the Scuttle Dens' swarmlings (T604: up to 8 a Den).
  allies: 64,
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
  allies: Rng;
  projectiles: Rng;
}

/** A count per wave tag (fixed keys, so the shape is monomorphic and hash order is stable). */
export type TagCounts = Record<WaveTag, number>;

/**
 * Per-run stats (integers): the run stats conditions read (`RunStat` in content/types.ts), the
 * Pests Processed count, and the story stats (architecture.md § Entity model). The fire-control
 * stats are counted by sim/fireControl.ts and the towers system, the per-tag stats where units
 * spawn (waves), leak (movement), and die (damage); `medalExemptLeaks` and `markersPassed` in
 * cleanup (sim/medals.ts).
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
  /** Ticks on which any live tower was holding fire. */
  holdFireTicks: number;
  /** holdFire commands that turned Hold Fire on where it was off (a tower's, or the global). */
  holdFireUses: number;
  /**
   * Ticks since a tower last fired at a Skitterkin while one was in range of a tower; frozen while
   * none is (the "not firing" bark, NotFiringAtSkitterkin).
   */
  ticksSinceFiredAtSkitterkin: number;
  /** Per wave tag: units spawned, leaked, and killed by the player (towers, abilities, allies). */
  tagSpawned: TagCounts;
  tagLeaked: TagCounts;
  tagKilled: TagCounts;
  /** Leaks by medal-exempt units, which never break Perfect Core (core-loop.md § 2.7; T202c). */
  medalExemptLeaks: number;
  /**
   * Link uptime: per link id, the ticks on which at least one pair of that link was active
   * (counted by the links system). A key appears on the link's first active tick.
   */
  linkTicks: Record<string, number>;
  /**
   * `passedMarker` conditions (sim/conditions.ts): per marker, per enemy id (`*` for any enemy),
   * the tick a non-exempt unit first went past it. Only markers a map's conditions name are
   * watched; a key appears on the first pass.
   */
  markersPassed: Record<string, Record<string, number>>;
  /**
   * Hits on neutral units (Gerald; the Return to Sender Challenge; core-loop.md § 2.7): counted by
   * the towers and projectiles systems when a shot lands on one (T304a).
   */
  neutralHits: number;
  /** Wreckage tiles the drone cleared (the Asset Recovery Challenge; systems/wreckage.ts, T304b). */
  wreckageCleared: number;
  /**
   * Late sells (A1M4's Clean Audit objective; sim/objectives.ts `isLateSell`, counted by `sell`):
   * a sell after a wave has started since the tower was built, unless it's a misclick-grace refund.
   */
  lateSells: number;
  /** Blinks a boss completed (Glass Half Empty; counted by enemyAbilities/blink.ts, T404). */
  bossBlinks: number;
  /** Leaks by Heavy units (Hiccup Contained; counted in movement with `leaksByFaction`, T460). */
  heavyLeaks: number;
  /**
   * Leaks by faction and by enemy id, medal-exempt units never counted (the `leaks` condition
   * atom: Hiccup Contained; counted in movement). `leaksByEnemy` gets a key on its first leak.
   */
  leaksByFaction: FactionCounts;
  leaksByEnemy: Record<string, number>;
  /**
   * Non-exempt leaks by the leaking unit's wave (index = wave − 1; the `leaks` condition's
   * `waves`: Before the Dark). Counted in movement with `leaksByFaction` (T500a).
   */
  leaksByWave: number[];
  /** The wave during which a boss's `pivot` ran; 0 until it does (Kneel; set by T506). */
  pivotWave: number;
  /**
   * Escort (T305c): refugees spawned (`spawnAllies`; Pebble not counted), refugees who reached
   * the safe exit, and refugees lost (hushed on the road, or at the exit by an enemy that got
   * there). The Evacuated meter is `evacuated` of the map's `escort.total`.
   */
  refugeesSpawned: number;
  evacuated: number;
  refugeesLost: number;
  // M6 (T600a seams).
  /**
   * Refugees lost per group (index-aligned with `map.escort.groups`; empty without escort data):
   * hushed, gathered, or taken at the exit (the `groupLost` condition: The Matriarch's Young).
   * Counted by sim/escort.ts with `refugeesLost`.
   */
  lostByGroup: number[];
  /** Refugees a Maw gathered (Nothing Gathered; counted by T602's gather, also a loss). */
  refugeesGathered: number;
  /** Revocations that took effect: each tower class and each ability counts one (T606). */
  revocations: number;
  // M7 (T700a seams; each counted by the task named).
  /** The most towers Jammed at once this run (Keep the Lights On: ≤ 1; T702). */
  jammedPeak: number;
  /**
   * The jam limit's tallies (sim/jam.ts; T702): ticks with more than JAM_MAX_TOWER_SHARE of the
   * live towers Jammed (harness #10: none in par), and tower-ticks Jammed and alive (jam uptime).
   */
  jamOverLimitTicks: number;
  jammedTowerTicks: number;
  towerTicks: number;
  /** The longest single Hostile Takeover jam this run, in ticks (Declined: ≤ 60, 1 s; T707). */
  takeoverJamTicks: number;
  /** Bearers who reached home (A3M5's Results line; T706). */
  bearersHome: number;
}

/** A count per enemy faction (fixed keys, so the shape is monomorphic and hash order is stable). */
export type FactionCounts = Record<EnemyFaction, number>;

/**
 * Wreckage and the salvage drone (design/maps.md § 3; systems/wreckage.ts, T304b). Tiles are
 * row-major indices into the map's grid.
 */
export interface WreckageState {
  /** Wreckage tiles queued for the drone, in order; the head is being cleared. */
  queue: number[];
  /** Ticks of clearing done on the queue's head. */
  progressTicks: number;
  /** Wreckage tiles cleared this run, in order: each is now its `underWreckage` tile. */
  cleared: number[];
}

/**
 * The run's credit rules after modifiers (economy.ts `applyRunModifiers`, at createSim). Kept in
 * state, not the config, so the HUD's helpers read the same numbers the sim pays.
 */
export interface RunEconomy {
  /** Σ `economy.bounty` pct: Bounty Hunter, Bounty Board. */
  bountyPct: number;
  /** The fraction of a credit the bounty bonus has earned but not yet paid (0 ≤ carry < 1). */
  bountyCarry: number;
  /** Σ `economy.earlyCallBonus` pct: Early Bird. */
  earlyCallPct: number;
  /** The sell refund fraction: SELL_REFUND_PCT plus Resale Value's `sellRefund` flats. */
  sellRefundPct: number;
}

/**
 * A medal's standing during a run (T202c): `open` until settled, `forfeited` once it can't be
 * earned this run, `earned` at victory.
 */
export type MedalStatus = 'open' | 'forfeited' | 'earned';

/**
 * An optional objective's standing during a run (T304f; sim/objectives.ts): `open` until settled,
 * `done` once its condition holds for good (or holds at victory), `failed` once it can't.
 */
export type ObjectiveStatus = 'open' | 'done' | 'failed';

export type Outcome = 'playing' | 'won' | 'lost';

/**
 * Where the wave schedule is (design/core-loop.md § 2.1):
 * - `setup`: before wave 1; no countdown runs until the player starts it (callWave).
 * - `spawning`: wave `wave` is spawning its groups.
 * - `held`: wave `wave` has finished spawning, and the next wave (`countdownAfter: 'bossEnded'`)
 *   waits for every boss fight to end before its countdown begins (A1M5's Quiet Wave; D097).
 * - `countdown`: wave `wave` has finished spawning; the next wave's countdown is running.
 * - `done`: the last wave has finished spawning (the map ends when every wave resolves).
 */
export type SchedulePhase = 'setup' | 'spawning' | 'held' | 'countdown' | 'done';

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
  /**
   * The run's starting integrity after modifiers (Reinforced Core, Story's 30; economy.ts
   * `applyRunModifiers`): the meter's full value, which Results and the HUD show it against.
   */
  maxIntegrity: number;
  /** The last wave started (1-based); 0 during the setup phase. */
  wave: number;
  /**
   * The map's objective and meter label now: the map's own, until a `setObjective` action
   * changes them (the A2M5 pivot: Defend → Escort, the meter relabeled Evacuated; T305c).
   */
  objective: ObjectiveKind;
  meterLabel: MeterLabel;
  /**
   * Sundown's darkness now, 0–1 (maps.md § 5.1; D137: sim state, lit on screen = lit in the
   * sim): eased in ticks toward each lighting key's `dark` (T505). 0 on a map without one.
   */
  dark: number;
  schedule: WaveSchedule;
  /** Per map event (CompiledMapDef.events, same order): it has fired. */
  scriptFired: boolean[];
  /**
   * Per refugee group (CompiledEscort.groups, same order; empty without escort data): it has been
   * released (`spawnAllies`). A group spawns once: a second release does nothing (D138).
   */
  refugeesReleased: boolean[];
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
  /**
   * Commander ability cooldowns counted in waves, by slot (Clearance Sale's "once per 4 waves",
   * `cooldownWaves`): waves still to start before it's ready; 0 = ready (T304d).
   */
  abilityCooldownWaves: number[];
  /**
   * Clearance Sale's discount (T304d): purchases (builds, upgrades, or specializations) it still covers, and the
   * fraction each saves. Counted per purchase, so pausing can't stretch it.
   */
  discountCharges: number;
  discountPct: number;
  /**
   * Ready Room (`freeCast` modifiers, T304d): by slot, the wave whose free cast that slot has
   * used; 0 = none yet.
   */
  freeCastWave: number[];
  /** Wreckage and the salvage drone's queue (T304b). */
  wreckage: WreckageState;
  /** Global Hold Fire is on: every tower holds, and towers built now start holding (T206a). */
  holdFireAll: boolean;
  /** The global spare-runners toggle: towers built while it's on start with the filter (T206a). */
  spareRunnersAll: boolean;
  /**
   * NotFiringAtSkitterkin has fired in wave `notFiringWave` (it fires at most once a wave; a new
   * wave re-arms it and restarts the count; sim/fireControl.ts, T330).
   */
  notFiringAnnounced: boolean;
  /** The wave the "not firing" count and NotFiringAtSkitterkin belong to (0 before W1). */
  notFiringWave: number;
  /**
   * Something that changes links happened (a build, upgrade, specialization, or sell, or later a
   * jam): the links system recomputes them, and the towers' dynamic bonuses, then clears it.
   */
  linksDirty: boolean;
  /**
   * The active synergy links as flat triples `[linkIndex, uidA, uidB]` (uidA < uidB), sorted:
   * what the links system diffs against to emit LinkFormed and LinkBroken (T202a).
   */
  linkPairs: number[];
  /** Emergency Bulkhead: integrity loss still to absorb (from a `leakAbsorb` modifier; T202a). */
  leakAbsorbLeft: number;
  economy: RunEconomy;
  /** Each medal's standing this run (T202c). */
  medals: Record<MedalKind, MedalStatus>;
  /** Each optional objective's standing this run, index-aligned with `map.objectives` (T304f). */
  objectives: ObjectiveStatus[];
  /**
   * Protect the asset (design/maps.md § 5.2; T305a): the asset meter and its full value; both 0
   * on a map without an asset (`map.asset`).
   */
  asset: number;
  maxAsset: number;
  /**
   * Clickable world objects (T409; story-runtime.md § Map scripts): the markers clickable now, in
   * the order they turned on, and those interacted with this run (by click or by fallback), in
   * order. A marker is interacted with at most once, and never turns clickable again after.
   */
  clickable: string[];
  interacted: string[];
  /**
   * Index-aligned with `clickable`: the fallback trigger its `setClickable` carried (the frozen
   * map data, hashed structurally), or null. When it's reached the sim interacts by itself
   * (`Interacted { byFallback: true }`; systems/triggers.ts).
   */
  clickFallback: (CompiledScriptTrigger<IdSpace> | null)[];
  // M6 (T600a seams; each run by the task named).
  /**
   * Escort's meter total for this run (sim/escort.ts `escortTotal`): the refugees of every group
   * whose `when` holds under the run's story flags (A3M3's `door_choice` side), Pebble not counted.
   * Set by createSim; 0 on a map without refugees.
   */
  refugeeTotal: number;
  /**
   * What this run's script revoked (towers.md § 9; T606), in the order revoked: tower class ids
   * (`revokeTowerClass`) and ability ids (`revokeAbility`). Empty on maps without a revocation.
   * Classes revoked by an earlier map arrive as unowned config, never here. `uids` are the towers
   * the revocations folded away, so a late command naming one is refused `revoked` (sim/revoke.ts).
   */
  revoked: { towers: string[]; abilities: string[]; uids: number[] };
  /**
   * Script modifiers on now (`setModifier`; T606): `quillLockout` (A3M2: QUILL locks you out; her
   * ability is disabled and the preview hidden, core-loop.md § 2.2 and § 2.11) and `previewHidden`
   * (the wave preview reads "ACCESS RESTRICTED").
   */
  scriptModifiers: { quillLockout: boolean; previewHidden: boolean };
  /**
   * A forced single input (core-loop.md § 2.11: A3M3's SEAL; T605): the id it waits for while
   * waves, movement, and firing freeze (the sim keeps ticking), or null. A `scriptInput` command
   * with this id resolves it.
   */
  pendingInput: string | null;
  /** Forced inputs resolved this run, in order (the `forcedInputResolved` trigger; T605). */
  forcedResolved: string[];
  /**
   * Underfoot's traps (T604): flat pairs `[zoneUid, enemyUid]` of the enemies each live trap has
   * already sprung on (once per enemy per trap). Pruned as traps expire.
   */
  trapSprung: number[];
  // M7 (T700a seams; each run by the task named).
  /**
   * Markers whose tile a script opened (`openTile`: Shareholder Value's jettison plates; T707), in
   * order, and what each became, index-aligned (`tilesOpenedTo`). The towers' tile checks and
   * render read the opened tile through them.
   */
  tilesOpened: string[];
  tilesOpenedTo: TileChar[];
  /** Script groups spawned this run (`spawnWave`: A3M5's W10 surge; T706), in order. */
  scriptGroupsSpawned: string[];
  /**
   * Index-aligned with `scriptGroupsSpawned` (T706; sim/scriptGroups.ts): the tick each one's
   * spawn clock started, and the wave its units count in.
   */
  scriptGroupStart: number[];
  scriptGroupWave: number[];
  /**
   * How many wreckage tiles the drone had cleared as each wave started (index wave − 1), kept on
   * a map whose conditions use `cleared` (T706; sim/conditions.ts): Cut the Feed's "before W10".
   */
  wreckageAtWave: number[];
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
    allies: forkRng(root, 'allies'),
    projectiles: forkRng(root, 'projectiles'),
  };
  return {
    tick: 0,
    nextUid: 1,
    outcome: 'playing',
    credits: map.startCredits,
    integrity: map.coreIntegrity,
    maxIntegrity: map.coreIntegrity,
    wave: 0,
    objective: map.objective,
    meterLabel: map.meterLabel ?? defaultMeterLabel(map.objective),
    dark: 0,
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
    refugeesReleased: map.escort === null ? [] : map.escort.groups.map(() => false),
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
      holdFireTicks: 0,
      holdFireUses: 0,
      ticksSinceFiredAtSkitterkin: 0,
      tagSpawned: tagCounts(),
      tagLeaked: tagCounts(),
      tagKilled: tagCounts(),
      medalExemptLeaks: 0,
      linkTicks: {},
      markersPassed: {},
      neutralHits: 0,
      wreckageCleared: 0,
      lateSells: 0,
      bossBlinks: 0,
      heavyLeaks: 0,
      leaksByFaction: factionCounts(),
      leaksByEnemy: {},
      leaksByWave: map.waves.map(() => 0),
      pivotWave: 0,
      refugeesSpawned: 0,
      evacuated: 0,
      refugeesLost: 0,
      lostByGroup: map.escort === null ? [] : map.escort.groups.map(() => 0),
      refugeesGathered: 0,
      revocations: 0,
      jammedPeak: 0,
      jamOverLimitTicks: 0,
      jammedTowerTicks: 0,
      towerTicks: 0,
      takeoverJamTicks: 0,
      bearersHome: 0,
    },
    abilityCooldownTicks: [0, 0],
    abilityCooldownWaves: [0, 0],
    discountCharges: 0,
    discountPct: 0,
    freeCastWave: [0, 0],
    wreckage: { queue: [], progressTicks: 0, cleared: [] },
    holdFireAll: false,
    spareRunnersAll: false,
    notFiringAnnounced: false,
    notFiringWave: 0,
    linksDirty: false,
    linkPairs: [],
    leakAbsorbLeft: 0,
    economy: { bountyPct: 0, bountyCarry: 0, earlyCallPct: 0, sellRefundPct: SELL_REFUND_PCT },
    medals: { victory: 'open', perfectCore: 'open', challenge: 'open' },
    objectives: map.objectives.map((): ObjectiveStatus => 'open'),
    asset: map.asset?.integrity ?? 0,
    maxAsset: map.asset?.integrity ?? 0,
    clickable: [],
    interacted: [],
    clickFallback: [],
    refugeeTotal: map.escort?.total ?? 0,
    revoked: { towers: [], abilities: [], uids: [] },
    scriptModifiers: { quillLockout: false, previewHidden: false },
    pendingInput: null,
    forcedResolved: [],
    trapSprung: [],
    tilesOpened: [],
    tilesOpenedTo: [],
    scriptGroupsSpawned: [],
    scriptGroupStart: [],
    scriptGroupWave: [],
    wreckageAtWave: [],
    pending: [],
    commandLog: [],
    events: [],
  };
}

/**
 * The meter's label when a map doesn't set one (core-loop.md § 2.9): Core integrity on Defend and
 * Protect, Evacuated on Escort and Holdout, Voices on the Choir.
 */
export function defaultMeterLabel(objective: ObjectiveKind): MeterLabel {
  if (objective === 'escort' || objective === 'holdout') return 'evacuated';
  return objective === 'choir' ? 'voices' : 'integrity';
}

/** A zero count for every wave tag. */
export function tagCounts(): TagCounts {
  return { quiet_wave: 0, youngling: 0, fleeing: 0, medal_exempt: 0 };
}

/** A zero count for every enemy faction. */
export function factionCounts(): FactionCounts {
  return { skitterkin: 0, aelari: 0, everglow: 0, hollow: 0 };
}

/** Hands out the next uid. */
export function takeUid(state: SimState): number {
  return state.nextUid++;
}

/** Queues an event for the host. */
export function emit(state: SimState, event: SimEvent<IdSpace>): void {
  state.events.push(event);
}
