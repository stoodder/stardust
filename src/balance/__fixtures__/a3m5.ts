// A3M5's balance-test runner (src/balance/a3m5*.test.ts): one run of a harness label (or a build)
// on A3M5, logging what its beats need: the waves' starts and countdowns, the bearer groups' walks,
// Cut the Feed and its surge, the platform's phases, cues, jams (by source and wave), plates, and
// where it was driven off.
import type { CompiledBuild, CompiledContent } from '../../content/compiled.ts';
import { BEARER_WAVES } from '../../content/maps/a3_m05/map.ts';
import type { ScriptFlags } from '../../sim/index.ts';
import { createBuildExecutor, createSim, type SimEvent, type SimState } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { flagsFor } from '../checks.ts';
import { buildFor } from '../harness.ts';
import { referenceRunProfile, runConfig, type RunProfile } from '../profile.ts';

export const TICK_HZ = 60;
/** The platform's route length (A2M4's road, in tiles to the core): where it would leak. */
export const ROAD_TILES = 38;

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
  /** Ticks on which a Takeover jam landed with the map past the jam limit (#10's 25%). */
  readonly takeoverOverLimit: number;
  /** Gravity Well pulls by unit uid (their ticks), for the stacking test. */
  readonly pulls: ReadonlyMap<number, readonly number[]>;
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
  let takeoverOverLimit = 0;
  const pulls = new Map<number, number[]>();
  let droveOffAt: number | null = null;
  const push = (key: string): void => {
    (at[key] ??= []).push(st.tick);
  };
  while (st.outcome === 'playing' && st.tick < 60 * 60 * 30) {
    exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    let tookOver = false;
    for (const e of out) {
      const type = e.type;
      if (type === 'WaveStarted') {
        push(`WaveStarted ${e.wave}`);
        startOf[e.wave] = { integrity: st.integrity, asset: st.asset };
      } else if (type === 'CountdownStarted') push(`CountdownStarted ${e.wave}`);
      else if (type === 'EnemySpawned') {
        // A wave's own units (and a script group's) walk in at their route's start; the units
        // a split leaves behind appear where their parent fell.
        const u = st.enemies.items.slice(0, st.enemies.used).find((x) => x.uid === e.uid);
        if (u !== undefined && u.dist < 0.25) {
          spawnedByWave[st.wave] = (spawnedByWave[st.wave] ?? 0) + 1;
        }
        if (e.enemy === 'shareholder_value') bossUid = e.uid;
      } else if (type === 'BossPhase') push(`BossPhase ${e.phase}`);
      else if (type === 'BossEnded') {
        push('BossEnded');
        const b = st.enemies.items.slice(0, st.enemies.used).find((x) => x.uid === e.uid);
        droveOffAt = b === undefined ? null : b.dist;
      } else if (type === 'TowerJammed') {
        jamsByWave[st.wave] = (jamsByWave[st.wave] ?? 0) + 1;
        if (e.source === bossUid && bossUid !== 0) {
          takeoverJams.push({ tick: st.tick, ticks: e.ticks });
          tookOver = true;
        }
      } else if (type === 'TileOpened') plates.push(e.marker);
      else if (type === 'ScriptCue') {
        cues.push(e.cueId);
        push(`ScriptCue ${e.cueId}`);
      } else if (type === 'AllySpawned') {
        if (e.kind === 'bearer') push('BearerSpawned');
      } else if (type === 'ScriptGroupSpawned') push(`ScriptGroupSpawned ${e.id}`);
      else if (type === 'PulledBack') {
        const list = pulls.get(e.uid) ?? [];
        list.push(st.tick);
        pulls.set(e.uid, list);
      } else if (type === 'ObjectiveProgress') push(`Objective ${e.id} ${e.status}`);
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
    if (tookOver && jammed > Math.floor(0.25 * placed)) takeoverOverLimit++;
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
    takeoverOverLimit,
    pulls,
    plates,
    droveOffAt,
    cues,
  };
}

/**
 * `build` with every timed ability cast `sec` seconds later (earlier when negative; never before
 * its wave starts): a human's timing around par's scripted beats (D150).
 */
export function castsShifted(build: CompiledBuild, sec: number): CompiledBuild {
  const ticks = Math.round(sec * TICK_HZ);
  return {
    ...build,
    steps: build.steps.map((s) =>
      s.kind === 'ability' && typeof s.when === 'object'
        ? { ...s, when: { afterTicks: Math.max(0, s.when.afterTicks + ticks) } }
        : s,
    ),
  };
}

/** The one tick of event `key` in `r` (throws unless exactly one). */
export function one(r: A3m5Run, key: string): number {
  const ticks = r.at[key] ?? [];
  if (ticks.length !== 1) throw new Error(`${key}: ${ticks.length} ticks`);
  return ticks[0]!;
}

/** The beats every winning reference run lands (act3.md § A3M5). */
export function beatMisses(r: A3m5Run): string[] {
  const miss: string[] = [];
  const check = (ok: boolean, what: string): void => {
    if (!ok) miss.push(what);
  };
  const at = (key: string): number | null => {
    const ticks = r.at[key] ?? [];
    return ticks.length === 1 ? ticks[0]! : null;
  };
  check(r.outcome === 'won', `outcome ${r.outcome}`);
  // Each bearer group walks as its wave starts, and none at any other time.
  const walks = r.at.BearerSpawned ?? [];
  const starts = BEARER_WAVES.map(([w]) => at(`WaveStarted ${w}`));
  for (const [i, [w]] of BEARER_WAVES.entries()) {
    check(walks.includes(starts[i] ?? -1), `W${w}'s bearers walk as it starts`);
  }
  check(
    walks.every((t) => starts.includes(t)),
    'bearers walk only as their waves start',
  );
  // The platform: three phases inside W14, each cue the tick after its phase begins.
  const cues = ['a3_m05_cue_sv_spawn', 'a3_m05_cue_takeover', 'a3_m05_cue_jettison'];
  let last = at('WaveStarted 14') ?? Infinity;
  for (const [i, cue] of cues.entries()) {
    const phase = at(`BossPhase ${i + 1}`);
    check(phase !== null && phase >= last, `phase ${i + 1} once, in order`);
    check(phase !== null && at(`ScriptCue ${cue}`) === phase + 1, `${cue} the tick after it`);
    last = phase ?? Infinity;
  }
  // Driven off before the core, and W15's countdown waits for it.
  const ended = at('BossEnded');
  check(ended !== null && ended > last, 'driven off after phase 3');
  check(r.droveOffAt !== null && r.droveOffAt < ROAD_TILES, 'driven off short of the core');
  const w15 = at('CountdownStarted 15');
  check(w15 !== null && ended !== null && w15 >= ended, "W15's countdown waits for it");
  // The plates land on the crash site.
  check(
    r.plates.toSorted().join() === 'crash_1,crash_2,crash_3,crash_4',
    'plates on the crash site',
  );
  return miss;
}
