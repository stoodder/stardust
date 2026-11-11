// A3M5's balance-test runner (src/balance/a3m5*.test.ts): one run of a harness label (or a build)
// on A3M5, logging what its beats need: the waves' starts and countdowns, the bearer groups' walks,
// Cut the Feed and its surge, the platform's phases, cues, jams (by source and wave), plates, and
// where it was driven off.
import type { CompiledBuild, CompiledContent } from '../../content/compiled.ts';
import type { ScriptFlags } from '../../sim/index.ts';
import { createBuildExecutor, createSim, type SimEvent, type SimState } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { flagsFor } from '../checks.ts';
import { buildFor } from '../harness.ts';
import { referenceRunProfile, runConfig, type RunProfile } from '../profile.ts';

export const TICK_HZ = 60;

/** What one A3M5 run shows. */
export interface A3m5Run {
  readonly outcome: string;
  readonly ticks: number;
  readonly integrity: number;
  readonly asset: number;
  /** The run's stats at its end. */
  readonly stats: DeepReadonly<SimState['stats']>;
  readonly medals: DeepReadonly<SimState['medals']>;
  readonly objectives: DeepReadonly<SimState['objectives']>;
  /** Each event's ticks by key: `WaveStarted N`, `CountdownStarted N`, `BossPhase N`, … */
  readonly at: Readonly<Record<string, readonly number[]>>;
  /** Core integrity and the asset meter as each wave starts. */
  readonly startOf: Readonly<
    Record<number, { readonly integrity: number; readonly asset: number }>
  >;
  /** Units that walked in while each wave ran (a split's children aside). */
  readonly spawnedByWave: Readonly<Record<number, number>>;
  /** Jams landed per wave, and those the platform's Takeover landed (with each one's ticks). */
  readonly jamsByWave: Readonly<Record<number, number>>;
  readonly takeoverJams: readonly { readonly tick: number; readonly ticks: number }[];
  /** Tower-ticks spent jammed during each wave (the sum over towers, per tick). */
  readonly jammedTicksByWave: Readonly<Record<number, number>>;
  /** The most towers jammed at once by the platform's Takeover, and the towers placed then. */
  readonly takeoverPeak: { readonly jammed: number; readonly placed: number };
  /** The markers the jettison's plates opened. */
  readonly plates: readonly string[];
  /** The platform's route distance when it was driven off (null: never). */
  readonly droveOffAt: number | null;
  /** Cues played (`cue` actions), in order. */
  readonly cues: readonly string[];
}

/** Runs `label` (or `build` under `label`'s flags and meta) on A3M5 in `c`, logging its beats. */
export function runA3m5(
  c: CompiledContent,
  label: string,
  opts: {
    readonly build?: CompiledBuild;
    readonly difficulty?: 'standard' | 'story';
    readonly flags?: ScriptFlags;
    readonly profile?: Pick<RunProfile, 'difficulty' | 'modifiers' | 'specs'>;
  } = {},
): A3m5Run {
  const map = c.maps.a3_m05;
  const flags = opts.flags ?? flagsFor(label, map) ?? {};
  const build = opts.build ?? buildFor(label, map, c)!;
  const difficulty = opts.difficulty ?? (label.endsWith('@story') ? 'story' : 'standard');
  const profile = opts.profile ?? referenceRunProfile(map, c, difficulty, undefined, flags);
  const sim = createSim(runConfig(c, map, build, profile, 1, flags));
  const exec = createBuildExecutor(sim, build);
  const st = sim.state;
  const out: SimEvent[] = [];
  const at: Record<string, number[]> = {};
  const spawnedByWave: Record<number, number> = {};
  const startOf: Record<number, { integrity: number; asset: number }> = {};
  const jamsByWave: Record<number, number> = {};
  const jammedTicksByWave: Record<number, number> = {};
  const takeoverJams: { tick: number; ticks: number }[] = [];
  const plates: string[] = [];
  const cues: string[] = [];
  const takeoverPeak = { jammed: 0, placed: 0 };
  let bossUid = 0;
  let droveOffAt: number | null = null;
  const push = (key: string): void => {
    (at[key] ??= []).push(st.tick);
  };
  while (st.outcome === 'playing' && st.tick < 60 * 60 * 30) {
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      switch (e.type) {
        case 'WaveStarted':
          push(`WaveStarted ${e.wave}`);
          startOf[e.wave] = { integrity: st.integrity, asset: st.asset };
          break;
        case 'CountdownStarted':
          push(`CountdownStarted ${e.wave}`);
          break;
        case 'EnemySpawned': {
          // A wave's own units (and a script group's) walk in at their route's start; the units
          // a split leaves behind appear where their parent fell.
          const u = st.enemies.items.slice(0, st.enemies.used).find((x) => x.uid === e.uid);
          if (u !== undefined && u.dist < 0.25) {
            spawnedByWave[st.wave] = (spawnedByWave[st.wave] ?? 0) + 1;
          }
          if (e.enemy === 'shareholder_value') bossUid = e.uid;
          break;
        }
        case 'BossPhase':
          push(`BossPhase ${e.phase}`);
          break;
        case 'BossEnded': {
          push('BossEnded');
          const b = st.enemies.items.slice(0, st.enemies.used).find((x) => x.uid === e.uid);
          droveOffAt = b === undefined ? null : b.dist;
          break;
        }
        case 'TowerJammed':
          jamsByWave[st.wave] = (jamsByWave[st.wave] ?? 0) + 1;
          if (e.source === bossUid && bossUid !== 0) {
            takeoverJams.push({ tick: st.tick, ticks: e.ticks });
          }
          break;
        case 'TileOpened':
          plates.push(e.marker);
          break;
        case 'ScriptCue':
          cues.push(e.cueId);
          push(`ScriptCue ${e.cueId}`);
          break;
        case 'AllySpawned':
          if (e.kind === 'bearer') push('BearerSpawned');
          break;
        case 'ScriptGroupSpawned':
          push(`ScriptGroupSpawned ${e.id}`);
          break;
        case 'ObjectiveProgress':
          push(`Objective ${e.id} ${e.status}`);
          break;
        default:
          break;
      }
    }
    let jammed = 0;
    let byBoss = 0;
    let placed = 0;
    for (let i = 0; i < st.towers.used; i++) {
      const t = st.towers.items[i]!;
      if (!t.alive) continue;
      placed++;
      if (t.jamTicks > 0) {
        jammed++;
        if (t.jammedBy === bossUid && bossUid !== 0) byBoss++;
      }
    }
    jammedTicksByWave[st.wave] = (jammedTicksByWave[st.wave] ?? 0) + jammed;
    if (byBoss > takeoverPeak.jammed) {
      takeoverPeak.jammed = byBoss;
      takeoverPeak.placed = placed;
    }
  }
  return {
    outcome: st.outcome,
    ticks: st.tick,
    integrity: st.integrity,
    asset: st.asset,
    stats: st.stats,
    medals: { ...st.medals },
    objectives: [...st.objectives],
    at,
    startOf,
    spawnedByWave,
    jamsByWave,
    takeoverJams,
    jammedTicksByWave,
    takeoverPeak,
    plates,
    droveOffAt,
    cues,
  };
}

/** The one tick of event `key` in `r` (throws unless exactly one). */
export function one(r: A3m5Run, key: string): number {
  const ticks = r.at[key] ?? [];
  if (ticks.length !== 1) throw new Error(`${key}: ${ticks.length} ticks`);
  return ticks[0]!;
}
