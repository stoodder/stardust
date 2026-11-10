// Checkpoint replays on Escort maps (T305c; D118, design/core-loop.md § 2.12): a retry from W5 or
// W10 replays the lost run's commands headlessly and must land on exactly the state the run had
// there (refugees on the road, mid-hush, evacuated and lost included), then play on to exactly
// the same end. Two 11-wave maps on dev_act2's layout: an Escort from the start, and a Defend map
// a script pivots into an Escort as W6 starts (A2M5's shape: `setObjective`, `spawnAllies`).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { IdSpace, MapDef, ScriptedEvent } from '../content/types.ts';
import { act2Layout, DEV_CONTENT, dev, type DevIds } from '../render/__fixtures__/devBattle.ts';
import { createSim, type CommandLogEntry, type SimConfig } from '../sim/index.ts';
import { resumeOf, type Checkpoint } from './checkpoints.ts';
import { createHost, type Host } from './host.ts';

const TIMEOUT_MS = 120_000;

/** 11 waves of Motes: down the south-west road to the merge, and down the refugees' west road. */
const WAVES = dev.defineWaves(
  Array.from({ length: 11 }, (_, i) => ({
    ...(i === 0 ? {} : { countdownSec: 10 }),
    groups: [
      { enemy: 'mote' as const, count: 3 + i, route: 'b', delaySec: 2, intervalSec: 0.4 },
      { enemy: 'mote' as const, count: 2, route: 'a', delaySec: 6, intervalSec: 0.8 },
    ],
  })),
);

const BUILDS = dev.defineBuilds({
  referenceProfile: {
    towers: ['rivet', 'zapcoil'],
    specs: [],
    shop: {},
    protocols: [],
    technicianAbility: 'dev_strike',
  },
  parBuild: { loadout: ['rivet', 'zapcoil'], steps: [] },
  noCounterBuilds: { splash: { loadout: ['rivet'], steps: [] } },
});

function escortMap(
  id: string,
  objective: 'escort' | 'defend',
  events: readonly ScriptedEvent<DevIds>[],
): MapDef<DevIds> {
  return dev.defineMap({
    ...act2Layout,
    id,
    objective,
    maxLost: 40,
    markers: { gate: [17, 10] },
    safeExit: 'gate',
    refugees: {
      g1: { route: 'a', withPebble: true },
      g2: { route: 'a' },
      g3: { route: 'a' },
    },
    threatIntel: ['clustered'],
    requiredCounters: ['splash'],
    waves: WAVES,
    events,
    ...BUILDS,
  });
}

const start = (wave: number) => ({ wave, phase: 'start' as const });
const MAPS = {
  // An Escort from the start: groups at W1, W4, and W9 (on the road as W10's countdown begins).
  cp_escort: escortMap('cp_escort', 'escort', [
    { id: 'g1', on: start(1), actions: [{ spawnAllies: 'g1' }] },
    { id: 'g2', on: start(4), actions: [{ spawnAllies: 'g2' }] },
    { id: 'g3', on: start(9), actions: [{ spawnAllies: 'g3' }] },
  ]),
  // Defend until W6 starts, then an Escort (A2M5's pivot, without its boss): groups at W6 and W9.
  cp_pivot: escortMap('cp_pivot', 'defend', [
    {
      id: 'pivot',
      on: start(6),
      actions: [{ setObjective: 'escort' }, { spawnAllies: 'g1' }],
    },
    { id: 'g2', on: start(9), actions: [{ spawnAllies: 'g2' }] },
  ]),
};
const CONTENT = compileContent({ ...DEV_CONTENT, maps: { ...DEV_CONTENT.maps, ...MAPS } });

function config(mapId: keyof typeof MAPS): SimConfig<IdSpace> {
  return {
    content: CONTENT,
    mapId,
    seed: 3,
    loadout: ['rivet', 'zapcoil'],
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'dev_strike', slot2: null, slot2State: 'none' },
    specsUnlocked: [],
    scriptFlags: {},
  };
}

type H = Host<IdSpace>;
type Log = readonly CommandLogEntry<IdSpace>[];

/** Steps `host` one tick at a time until `done`, or throws after `max`. */
function stepUntil(host: H, done: () => boolean, max = 60 * 60 * 30): void {
  for (let i = 0; i < max; i++) {
    if (done()) return;
    host.fastForward(1);
  }
  throw new Error(`stepUntil: not done after ${max} ticks`);
}

/** Plays `log` through `host` from now on: each entry enqueued just before its tick runs. */
function playLog(host: H, log: Log): void {
  let i = log.findIndex((e) => e.tick >= host.sim.state.tick);
  if (i < 0) i = log.length;
  host.setDriver(() => {
    while (i < log.length && log[i]!.tick <= host.sim.state.tick) host.enqueue(log[i++]!.cmd);
  });
}

interface Straight {
  readonly checkpoints: readonly Checkpoint[];
  /** By checkpoint: the hash, and the escort's numbers there. */
  readonly at: readonly {
    readonly hash: string;
    readonly onRoad: number;
    readonly evacuated: number;
    readonly lost: number;
    readonly objective: string;
  }[];
  readonly hash: string;
  readonly outcome: string;
  readonly log: Log;
  /** Refugees hushed on the road over the run. */
  readonly hushed: number;
}

/** A straight run: three towers, W1 called, then every wave on its countdown. */
function straightRun(mapId: keyof typeof MAPS): Straight {
  const host = createHost(createSim(config(mapId)), { now: () => 0, speed: 0 });
  host.enqueue({ type: 'build', tile: [14, 4], tower: 'zapcoil' });
  host.enqueue({ type: 'build', tile: [16, 8], tower: 'rivet' });
  host.enqueue({ type: 'build', tile: [8, 4], tower: 'rivet' });
  host.enqueue({ type: 'callWave' });
  const at: Straight['at'][number][] = [];
  let hushed = 0;
  host.bus.on('Hushed', (e) => {
    if (e.victimAlly !== undefined) hushed++;
  });
  const s = host.sim.state;
  stepUntil(host, () => {
    if (host.checkpoints.length > at.length && s.tick === host.checkpoints[at.length]!.tick) {
      let onRoad = 0;
      for (let i = 0; i < s.allies.used; i++) if (s.allies.items[i]!.alive) onRoad++;
      at.push({
        hash: host.sim.hash(),
        onRoad,
        evacuated: s.stats.evacuated,
        lost: s.stats.refugeesLost,
        objective: s.objective,
      });
    }
    return s.outcome !== 'playing';
  });
  return {
    checkpoints: [...host.checkpoints],
    at,
    hash: host.sim.hash(),
    outcome: s.outcome,
    log: [...s.commandLog],
    hushed,
  };
}

describe.each(['cp_escort', 'cp_pivot'] as const)('checkpoint replays on %s', (mapId) => {
  it(
    'resume from W5 and W10 to the exact state, then on to the same end',
    () => {
      const run = straightRun(mapId);
      expect(run.checkpoints.map((c) => c.wave)).toEqual([5, 10]);
      expect(run.at).toHaveLength(2);
      // The escort is under way at W10: refugees walking, some safe, the map an Escort.
      const w10 = run.at[1]!;
      expect(w10.objective).toBe('escort');
      expect(w10.onRoad).toBeGreaterThan(0);
      expect(w10.evacuated + w10.lost).toBeGreaterThan(0);
      if (mapId === 'cp_pivot') expect(run.at[0]!.objective).toBe('defend');
      expect(run.hushed, 'refugees hushed on the road').toBeGreaterThan(0);
      for (const [i, cp] of run.checkpoints.entries()) {
        const host = createHost(createSim(config(mapId)), {
          now: () => 0,
          speed: 0,
          resume: resumeOf(run.log, cp),
        });
        host.catchUp();
        expect(host.sim.state.tick).toBe(cp.tick);
        expect(host.sim.hash(), `W${cp.wave}`).toBe(run.at[i]!.hash);
        playLog(host, run.log);
        stepUntil(host, () => host.sim.state.outcome !== 'playing');
        expect(host.sim.state.outcome).toBe(run.outcome);
        expect(host.sim.hash(), `W${cp.wave} to the end`).toBe(run.hash);
      }
    },
    TIMEOUT_MS,
  );
});
