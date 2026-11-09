// What a headless run reports (runHeadless, headless.ts): per-wave and per-tower tallies built
// from the drained events, and the debug invariant checks the harness asserts
// (conventions.md § Balance sims, #12). Reads the public sim API only.
import type { IdSpace } from '../content/types.ts';
import { MAX_LOADOUT } from './config.ts';
import type { SimEvent } from './events.ts';
import { isBuildableTile, tileIndex } from './grid.ts';
import { liveTileAt } from './systems/wreckage.ts';
import type { Sim } from './sim.ts';
import type { SimStats } from './state.ts';
import { isSpared } from './fireControl.ts';
import { allyMayTarget } from './systems/allies.ts';

/** One wave of a run. */
export interface WaveSummary {
  readonly wave: number;
  spawned: number;
  killed: number;
  leaked: number;
  /** Core integrity its leaks cost. */
  integrityLost: number;
  /** The tick it started, or −1. */
  startTick: number;
  /** Called during its countdown, and the bonus that paid. */
  early: boolean;
  earlyBonus: number;
  /** The tick it resolved (every enemy died or leaked), or −1. */
  clearedTick: number;
  /**
   * Credits when its build phase opened (wave 1: the starting credits), before any step; −1 if
   * it never opened.
   */
  bankAtPhase: number;
  /** Credits left unspent as it started (at the end of its first tick). */
  unspentAtStart: number;
}

/** One tower a run built. */
export interface TowerSummary {
  readonly uid: number;
  readonly tower: string;
  readonly tile: readonly [number, number];
  readonly builtTick: number;
  soldTick: number;
  tier: number;
  shots: number;
  kills: number;
  /** HP its hits took (ProjectileHit's `damage`): shield-absorbed damage and overkill excluded. */
  damage: number;
}

export interface RunSummary {
  readonly integrity: number;
  /** The integrity the run started with (the map's, after modifiers); margins divide by it. */
  readonly maxIntegrity: number;
  /** Credits left at the end (unspent). */
  readonly credits: number;
  /** The last wave started when the map was lost, or null. */
  readonly lostAtWave: number | null;
  readonly stats: SimStats;
  readonly waves: readonly WaveSummary[];
  readonly towers: readonly TowerSummary[];
  /** Kills by commander abilities. */
  readonly abilityKills: number;
  /** Kills by scripted allies (Bricks's post). */
  readonly allyKills: number;
  /** The first violations found (at most MAX_VIOLATIONS), as "tick N: what". */
  readonly violations: readonly string[];
}

export interface RunTracker {
  consume(events: readonly SimEvent<IdSpace>[]): void;
  afterTick(): void;
  summary(): RunSummary;
}

const MAX_VIOLATIONS = 20;
/** Positions may sit exactly on the map's edge (spawn and core centers are inside anyway). */
const EDGE_EPS = 1e-6;

/** Tracks a run from its events; `checkInvariants` adds the per-tick debug checks. */
export function createRunTracker<K extends IdSpace>(
  sim: Sim<K>,
  checkInvariants: boolean,
): RunTracker {
  const state = sim.state;
  const map = sim.map;
  // The integrity the run starts with is the sim's own `maxIntegrity` (the map's, after the run's
  // modifiers: Reinforced Core, Story); the credits, the start's (Seed Money). The tracker is
  // created before the first tick.
  const maxIntegrity = state.maxIntegrity;
  const startCredits = state.credits;
  const waves: WaveSummary[] = map.waves.map((w) => ({
    wave: w.number,
    spawned: 0,
    killed: 0,
    leaked: 0,
    integrityLost: 0,
    startTick: -1,
    early: false,
    earlyBonus: 0,
    clearedTick: -1,
    bankAtPhase: w.number === 1 ? state.credits : -1,
    unspentAtStart: 0,
  }));
  const towers: TowerSummary[] = [];
  const towerByUid = new Map<number, TowerSummary>();
  const enemyWave = new Map<number, number>();
  const liveTowers = new Set<number>();
  const violations: string[] = [];
  let abilityKills = 0;
  let allyKills = 0;
  let lostAtWave: number | null = null;

  const violate = (what: string): void => {
    if (violations.length < MAX_VIOLATIONS) violations.push(`tick ${state.tick}: ${what}`);
  };
  /** Enemies allies may never target, by uid (recorded at spawn from their wave tags). */
  const allyExempt = new Set<number>();
  /** Enemies the spare-runners filter never picks (fleeing, youngling), by uid. */
  const spared = new Set<number>();
  const noteExempt = (uid: number): void => {
    const pool = state.enemies;
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!; // i < used
      if (e.uid !== uid) continue;
      if (!allyMayTarget(e.tags)) allyExempt.add(uid);
      if (isSpared(e.tags)) spared.add(uid);
      return;
    }
  };
  /**
   * Fire control (core-loop.md § 2.7): a tower holding fire never fires, and one with the
   * spare-runners filter never fires at a spared unit as its target. The tower's flags are read
   * as the drain finds them, which is how they stood when it fired (commands apply first).
   */
  const checkShot = (towerUid: number, targetUid: number): void => {
    const pool = state.towers;
    let t: (typeof pool.items)[number] | undefined;
    for (let i = 0; i < pool.used && t === undefined; i++) {
      const c = pool.items[i]!; // i < used
      if (c.alive && c.uid === towerUid) t = c;
    }
    if (t === undefined) return;
    if (t.holdFire) violate(`tower ${towerUid} fired while holding fire`);
    if (t.spareRunners && targetUid !== 0 && spared.has(targetUid)) {
      violate(`tower ${towerUid} with spare runners on targeted spared enemy ${targetUid}`);
    }
  };
  if (sim.config.loadout.length > MAX_LOADOUT)
    violate(`loadout has ${sim.config.loadout.length} towers`);

  const waveOf = (n: number): WaveSummary | undefined => waves[n - 1];

  return {
    consume(events) {
      for (const e of events) {
        switch (e.type) {
          case 'EnemySpawned': {
            enemyWave.set(e.uid, e.wave);
            if (checkInvariants) noteExempt(e.uid);
            const w = waveOf(e.wave);
            if (w !== undefined) w.spawned++;
            break;
          }
          case 'EnemyDied': {
            const w = waveOf(enemyWave.get(e.uid) ?? 0);
            if (w !== undefined) w.killed++;
            if (e.killer.kind === 'ability') abilityKills++;
            else if (e.killer.kind === 'ally') allyKills++;
            else {
              const t = towerByUid.get(e.killer.uid);
              if (t !== undefined) t.kills++;
            }
            break;
          }
          // A carrier's burst sack is render-only: nothing to tally.
          case 'SackBurst':
            break;
          case 'EnemyLeaked': {
            const w = waveOf(enemyWave.get(e.uid) ?? 0);
            if (w !== undefined) {
              w.leaked++;
              w.integrityLost += e.leak; // what the core actually lost (clamped at 0)
            }
            break;
          }
          case 'ProjectileFired': {
            const t = towerByUid.get(e.towerUid);
            if (t !== undefined) t.shots++;
            if (checkInvariants) checkShot(e.towerUid, e.targetUid);
            break;
          }
          case 'TowerBuilt': {
            const t: TowerSummary = {
              uid: e.uid,
              tower: e.tower,
              tile: [e.tile[0], e.tile[1]],
              builtTick: state.tick,
              soldTick: -1,
              tier: 1,
              shots: 0,
              kills: 0,
              damage: 0,
            };
            towers.push(t);
            towerByUid.set(e.uid, t);
            liveTowers.add(e.uid);
            break;
          }
          case 'TowerUpgraded': {
            const t = towerByUid.get(e.uid);
            if (t !== undefined) t.tier = e.tier;
            break;
          }
          case 'TowerSpecialized': {
            const t = towerByUid.get(e.uid);
            if (t !== undefined) t.tier = 4;
            break;
          }
          case 'TowerSold': {
            const t = towerByUid.get(e.uid);
            if (t !== undefined) t.soldTick = state.tick;
            liveTowers.delete(e.uid);
            break;
          }
          case 'WaveStarted': {
            const w = waveOf(e.wave);
            if (w !== undefined) {
              w.startTick = state.schedule.startTick[e.wave - 1] ?? state.tick;
              w.early = e.early;
              w.earlyBonus = e.bonus;
              w.unspentAtStart = state.credits;
            }
            break;
          }
          case 'WaveCleared': {
            const w = waveOf(e.wave);
            if (w !== undefined) w.clearedTick = state.tick;
            break;
          }
          case 'CountdownStarted': {
            const w = waveOf(e.wave);
            if (w !== undefined && e.wave > 1) w.bankAtPhase = state.credits;
            break;
          }
          case 'MapLost':
            lostAtWave = state.wave;
            break;
          case 'AllyAttacked':
            // Allies never target quiet-wave, youngling, or fleeing units (D005).
            if (checkInvariants && allyExempt.has(e.targetUid)) {
              violate(`ally ${e.uid} attacked exempt enemy ${e.targetUid}`);
            }
            break;
          case 'ProjectileHit': {
            const t = towerByUid.get(e.towerUid);
            if (t !== undefined) t.damage += e.damage;
            break;
          }
          case 'TowerClassUnlocked':
          case 'ScriptCue':
          case 'AbilityUsed':
          case 'MapWon':
          case 'CommandRejected':
          case 'HoldFireChanged':
          case 'SpareRunnersChanged':
          case 'NotFiringAtSkitterkin':
          case 'LinkFormed':
          case 'LinkBroken':
          case 'AllySpawned':
          case 'AllyRemoved':
          case 'MedalProgress':
          case 'ObjectiveProgress':
          case 'NeutralHit':
          case 'NeutralExited':
          case 'BossPhase':
          case 'BossEnded':
          case 'WreckageCleared':
          // Act II (T400a seams): their tasks may tally them (a hush, an asset hit).
          case 'HushStarted':
          case 'Hushed':
          case 'TurnedHeavy':
          case 'SkittishBolt':
          case 'ShieldPulse':
          case 'ShieldHit':
          case 'BlinkTell':
          case 'Blinked':
          case 'BlinkInterrupted':
          case 'Revealed':
          case 'Cloaked':
          case 'AssetHit':
          case 'AssetLost':
          case 'CheckpointReached':
          case 'ClickableChanged':
          case 'Interacted':
            break;
          default:
            e satisfies never;
        }
      }
    },

    afterTick() {
      if (!checkInvariants) return;
      if (!Number.isInteger(state.credits) || state.credits < 0) {
        violate(`credits ${state.credits}`);
      }
      if (!Number.isFinite(state.integrity) || state.integrity < 0) {
        violate(`integrity ${state.integrity}`);
      } else if (state.integrity > maxIntegrity) {
        violate(`integrity ${state.integrity} above ${maxIntegrity}`);
      }
      if (state.outcome === 'won' && state.integrity <= 0) violate('won with no integrity left');
      // The credits ledger: every credit is the start, plus income, minus net spending.
      const st = state.stats;
      const ledger = startCredits + st.creditsEarned - st.creditsSpent + st.creditsRefunded;
      if (state.credits !== ledger) {
        violate(`credits ${state.credits} ≠ ledger ${ledger} (start + earned − spent + refunded)`);
      }
      const remaining = state.schedule.remaining;
      for (let w = 0; w < remaining.length; w++) {
        if (remaining[w]! < 0) violate(`wave ${w + 1} has ${remaining[w]} enemies remaining`); // w < length
      }
      const enemies = state.enemies;
      for (let i = 0; i < enemies.used; i++) {
        const e = enemies.items[i]!; // i < used
        if (!e.alive) continue;
        if (!Number.isFinite(e.x) || !Number.isFinite(e.y) || !Number.isFinite(e.hp)) {
          violate(`enemy ${e.uid} has a NaN field`);
        } else if (
          e.x < -EDGE_EPS ||
          e.y < -EDGE_EPS ||
          e.x > map.cols + EDGE_EPS ||
          e.y > map.rows + EDGE_EPS
        ) {
          violate(`enemy ${e.uid} left the map at (${e.x}, ${e.y})`);
        }
      }
      const shots = state.projectiles;
      for (let i = 0; i < shots.used; i++) {
        const p = shots.items[i]!; // i < used
        if (p.alive && (!Number.isFinite(p.x) || !Number.isFinite(p.y))) {
          violate(`projectile ${p.uid} has a NaN position`);
        }
      }
      // Enemies never remove towers: the live towers are exactly the built ones not sold.
      let alive = 0;
      const pool = state.towers;
      for (let i = 0; i < pool.used; i++) {
        const t = pool.items[i]!; // i < used
        if (!t.alive) continue;
        alive++;
        if (!liveTowers.has(t.uid)) violate(`tower ${t.uid} is alive but was never built`);
        // Towers stand only on buildable tiles (hard rule), and the tile map points back at them.
        const idx = tileIndex(map, t.col, t.row);
        if (idx < 0 || !isBuildableTile(liveTileAt(map, state.wreckage, idx))) {
          violate(`tower ${t.uid} stands on a non-buildable tile (${t.col}, ${t.row})`);
        } else if (state.towerAtTile[idx] !== t.slot) {
          violate(`tile (${t.col}, ${t.row}) doesn't map to tower ${t.uid}`);
        }
      }
      const tiles = state.towerAtTile;
      for (let idx = 0; idx < tiles.length; idx++) {
        const slot = tiles[idx]!; // idx < length
        if (slot === -1) continue;
        const t = pool.items[slot];
        const col = idx % map.cols;
        const row = (idx - col) / map.cols;
        if (t === undefined || !t.alive || t.col !== col || t.row !== row) {
          violate(`tile (${col}, ${row}) maps to slot ${slot}, which has no tower there`);
        }
      }
      if (alive !== liveTowers.size) {
        violate(`${liveTowers.size - alive} tower(s) vanished without a sell`);
      }
      // Allies stay on the map, never-vulnerable ones are never harmed, and an ally's current
      // target is never exempt (this also covers a target spawned and attacked on one tick).
      const allyPool = state.allies;
      for (let i = 0; i < allyPool.used; i++) {
        const a = allyPool.items[i]!; // i < used
        if (!a.alive) continue;
        if (!(a.x >= 0 && a.y >= 0 && a.x <= map.cols && a.y <= map.rows)) {
          violate(`ally ${a.uid} is off the map at (${a.x}, ${a.y})`);
        }
        if (a.vulnerability === 'never' && a.health !== 1) {
          violate(`ally ${a.uid} can't be hurt but has health ${a.health}`);
        }
        if (a.targetUid !== 0) {
          const t = enemies.items[a.targetSlot];
          if (t !== undefined && t.uid === a.targetUid && !allyMayTarget(t.tags)) {
            violate(`ally ${a.uid} targets exempt enemy ${t.uid}`);
          }
        }
      }
    },

    summary() {
      return {
        integrity: state.integrity,
        maxIntegrity,
        credits: state.credits,
        lostAtWave,
        stats: { ...state.stats, killsByEnemy: { ...state.stats.killsByEnemy } },
        waves,
        towers,
        abilityKills,
        allyKills,
        violations,
      };
    },
  };
}
