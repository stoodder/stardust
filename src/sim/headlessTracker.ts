// What a headless run reports (runHeadless, headless.ts): per-wave and per-tower tallies built
// from the drained events, and the debug invariant checks the harness asserts
// (conventions.md § Balance sims, #12). Reads the public sim API only.
import type { IdSpace } from '../content/types.ts';
import { MAX_LOADOUT } from './config.ts';
import type { SimEvent } from './events.ts';
import type { Sim } from './sim.ts';
import type { SimStats } from './state.ts';

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
}

export interface RunSummary {
  readonly integrity: number;
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
  let lostAtWave: number | null = null;

  const violate = (what: string): void => {
    if (violations.length < MAX_VIOLATIONS) violations.push(`tick ${state.tick}: ${what}`);
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
            const w = waveOf(e.wave);
            if (w !== undefined) w.spawned++;
            break;
          }
          case 'EnemyDied': {
            const w = waveOf(enemyWave.get(e.uid) ?? 0);
            if (w !== undefined) w.killed++;
            if (e.killer.kind === 'ability') abilityKills++;
            else {
              const t = towerByUid.get(e.killer.uid);
              if (t !== undefined) t.kills++;
            }
            break;
          }
          case 'EnemyLeaked': {
            const w = waveOf(enemyWave.get(e.uid) ?? 0);
            if (w !== undefined) {
              w.leaked++;
              w.integrityLost += e.leak;
            }
            break;
          }
          case 'ProjectileFired': {
            const t = towerByUid.get(e.towerUid);
            if (t !== undefined) t.shots++;
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
          case 'ProjectileHit':
          case 'TowerClassUnlocked':
          case 'ScriptCue':
          case 'AbilityUsed':
          case 'MapWon':
          case 'CommandRejected':
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
      } else if (state.integrity > map.coreIntegrity) {
        violate(`integrity ${state.integrity} above ${map.coreIntegrity}`);
      }
      if (state.outcome === 'won' && state.integrity <= 0) violate('won with no integrity left');
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
      }
      if (alive !== liveTowers.size) {
        violate(`${liveTowers.size - alive} tower(s) vanished without a sell`);
      }
    },

    summary() {
      return {
        integrity: state.integrity,
        maxIntegrity: map.coreIntegrity,
        credits: state.credits,
        lostAtWave,
        stats: { ...state.stats, killsByEnemy: { ...state.stats.killsByEnemy } },
        waves,
        towers,
        abilityKills,
        violations,
      };
    },
  };
}
