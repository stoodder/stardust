// A2M5's tuning is robust where it matters (T521). As tuned, par wins at 25/36 Evacuated (69.4%,
// the Escort chain's first map; act2.md § A2M5) with the core whole before the pivot, its eleven
// refugees lost where the rig road joins the Preserve Road (W8, W11, W12). Detection and shields are
// tested before the pivot: blind, the Veilwalkers walk through (W2–W4); without Energy or Soaked,
// the Cantor columns do (W2, W4); each loses by W5. Without splash the build can't hold the Cantor
// columns either and loses by W5 too (well inside W8). Both alts win, the Capacitor Bank's among
// them, and Story wins.
//
// The beats (act2.md § A2M5, D137): the Penitent comes alone in W5, and W6's countdown opens as
// she spawns, so W6 starts (and forces the pivot) 60 s later, long before she could reach the gate.
// In every Standard reference run her shield breaks in W5 (the shield cue and the shards land), the
// shards re-form it, and exactly one pivot event runs: the forced one, as W6 starts, mid-fight with
// the Penitent on the road. The first refugees walk from the pivot. A retry from the W5 and W10
// checkpoints replays across the pivot to the same end. With the post-pivot Motes shifted ±0.2 s
// together, par holds at 25/36 and every beat holds.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { WaveGroup } from '../content/types.ts';
import {
  createBuildExecutor,
  createSim,
  type CommandLogEntry,
  type SimEvent,
} from '../sim/index.ts';
import { both, bothWays, delay, shiftedContent } from './__fixtures__/shifts.ts';
import { buildFor, runMap } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const PAR_EVACUATED = 25;
const PIVOT_CUE = 'a2_m05_cue_pivot';
const TICK_HZ = 60;
/** W6's countdown, the Penitent's fight (waves.ts PENITENT_WINDOW), on Standard. */
const WINDOW_TICKS = 60 * TICK_HZ;

const isPostPivotMote = (g: WaveGroup): boolean => g.enemy === 'mote';

/** The compound shift, run both ways (`s` = ±1): every post-pivot Mote group. */
const SHIFTS = {
  'every Mote group after the pivot': (s: number) =>
    Object.fromEntries(
      [6, 7, 8, 9, 10, 11, 12].map((w) => [w, both(delay(isPostPivotMote, 0.2 * s))]),
    ),
} as const;

/** What one run of `label` on `c` shows of the boss fight, the pivot, and the escort. */
interface Beats {
  readonly outcome: string;
  readonly evacuated: number;
  /** Each event's tick, by kind (the cues by id). */
  readonly at: Readonly<Record<string, readonly number[]>>;
  /** The Penitent's spawn tick, and whether it was alive (not standing down) at each cue. */
  readonly penitentSpawn: number;
  readonly penitentOnRoadAtPivot: boolean;
  /** Refugees on the field when the first W6 Mote spawned. */
  readonly refugeesBeforeSurge: number;
  readonly hash: string;
  readonly checkpoints: ReadonlyMap<number, { tick: number; hash: string }>;
  readonly commands: readonly CommandLogEntry[];
}

const KEEP = new Set([
  'BossPhase',
  'BossEnded',
  'ShieldReformed',
  'ObjectiveChanged',
  'WaveStarted',
  'MapWon',
  'MapLost',
  'RefugeeEvacuated',
]);

/** Plays `label` on `c` to its end (or replays `replay`'s commands), logging the beats. */
function beats(
  c: CompiledContent,
  label: string,
  difficulty: 'standard' | 'story' = 'standard',
  replay: readonly CommandLogEntry[] | null = null,
): Beats {
  const map = c.maps.a2_m05;
  const build = buildFor(label, map, c)!;
  const sim = createSim(runConfig(c, map, build, referenceRunProfile(map, c, difficulty), 1));
  const exec = replay === null ? createBuildExecutor(sim, build) : null;
  const st = sim.state;
  const out: SimEvent[] = [];
  const at: Record<string, number[]> = {};
  const checkpoints = new Map<number, { tick: number; hash: string }>();
  let penitentSpawn = -1;
  let penitentOnRoadAtPivot = false;
  let refugeesBeforeSurge = -1;
  let next = 0;
  const push = (key: string): void => {
    (at[key] ??= []).push(st.tick);
  };
  const penitent = () =>
    st.enemies.items
      .slice(0, st.enemies.used)
      .find((e) => e.alive && e.def?.id === 'sunderglass_penitent');
  while (st.outcome === 'playing') {
    if (exec !== null) exec.beforeTick();
    else {
      for (; next < replay!.length && replay![next]!.tick <= st.tick; next++) {
        sim.enqueue(replay![next]!.cmd);
      }
    }
    sim.drainEvents(out);
    out.length = 0;
    sim.step();
    sim.drainEvents(out);
    for (const e of out) {
      if (e.type === 'ScriptCue') push(e.cueId);
      else if (e.type === 'BossPhase') push(`BossPhase ${e.phase}`);
      else if (e.type === 'BossEnded') {
        push(`BossEnded ${e.how}`);
        penitentOnRoadAtPivot = penitent() !== undefined;
      } else if (e.type === 'WaveStarted') push(`WaveStarted ${e.wave}`);
      else if (KEEP.has(e.type)) push(e.type);
      if (e.type === 'EnemySpawned' && e.enemy === 'sunderglass_penitent') penitentSpawn = st.tick;
      if (e.type === 'EnemySpawned' && e.enemy === 'mote' && refugeesBeforeSurge < 0) {
        refugeesBeforeSurge = st.stats.refugeesSpawned;
      }
      if (e.type === 'CheckpointReached') checkpoints.set(e.wave, { tick: e.tick, hash: '' });
    }
    out.length = 0;
    for (const [wave, cp] of checkpoints) {
      if (cp.hash === '' && st.tick === cp.tick) checkpoints.set(wave, { ...cp, hash: sim.hash() });
    }
  }
  return {
    outcome: st.outcome,
    evacuated: st.stats.evacuated,
    at,
    penitentSpawn,
    penitentOnRoadAtPivot,
    refugeesBeforeSurge,
    hash: sim.hash(),
    checkpoints,
    commands: [...st.commandLog],
  };
}

/** The beats every Standard reference run shows (act2.md § A2M5, Where it plays). */
function expectBeats(b: Beats, label: string, windowTicks = WINDOW_TICKS): void {
  const one = (k: string): number => {
    expect(b.at[k], `${label}: ${k}`).toHaveLength(1);
    return b.at[k]![0]!;
  };
  expect(b.outcome, label).toBe('won');
  // The Penitent comes alone in W5; her cue plays as she spawns, and W6's countdown opens then.
  const w5 = one('WaveStarted 5');
  expect(b.penitentSpawn, label).toBeGreaterThan(w5);
  expect(Math.abs(one('a2_m05_cue_penitent') - b.penitentSpawn), label).toBeLessThanOrEqual(1);
  // Her shield breaks in W5: the shards, and the shield cue the tick after; then a re-form.
  const broke = one('BossPhase 2');
  expect(one('a2_m05_cue_shield'), label).toBe(broke + 1);
  const w6 = one('WaveStarted 6');
  expect(broke, label).toBeLessThan(w6);
  expect(b.at.ShieldReformed?.length ?? 0, label).toBeGreaterThanOrEqual(1);
  // Exactly one pivot event: the forced one, as W6 starts, mid-fight with her on the road.
  const pivot = one(PIVOT_CUE);
  expect(one('BossEnded pivot'), label).toBe(pivot);
  expect(one('ObjectiveChanged'), label).toBe(pivot);
  expect(pivot, label).toBe(w6);
  expect(Math.abs(w6 - b.penitentSpawn - windowTicks), label).toBeLessThanOrEqual(1);
  expect(b.penitentOnRoadAtPivot, label).toBe(true);
  // The first refugees walk from the pivot, before the surge's first Mote.
  expect(b.refugeesBeforeSurge, label).toBe(6);
  // Victory waits for the road to empty: the last refugee is in before the map is won.
  expect(b.at.RefugeeEvacuated!.at(-1)!, label).toBeLessThanOrEqual(one('MapWon'));
}

// Each test re-runs a whole map's harness (or its par): seconds, not milliseconds.
describe('A2M5 balance', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  const report = runMap(content, 'a2_m05', { seeds: 1 });
  const run = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;

  it('passes every harness check as tuned, par at 25/36 Evacuated', () => {
    expect(report.checks.filter((k) => !k.ok).map((k) => k.id)).toEqual([]);
    const par = run('par').result!;
    expect(par.outcome).toBe('won');
    expect([par.stats.evacuated, par.escortTotal, par.stats.refugeesLost]).toEqual([
      PAR_EVACUATED,
      36,
      11,
    ]);
    // The core whole at the pivot, the refugees lost where the rig road joins (W8, W11, W12).
    expect(par.integrity).toBe(par.maxIntegrity);
    expect(par.waves.map((w) => w.refugeesLost)).toEqual([0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 3]);
    expect(par.stats.pivotWave).toBe(6);
  });

  it('tests detection and shields before the pivot, and loses without splash by W8', () => {
    for (const c of ['detection', 'shield']) {
      const r = run(`noCounter:${c}`).result!;
      expect(r.outcome, c).toBe('lost');
      expect(r.lostAtWave, c).toBeLessThanOrEqual(5);
      expect(r.stats.pivotWave, c).toBe(0);
    }
    const splash = run('noCounter:splash').result!;
    expect(splash.outcome).toBe('lost');
    expect(splash.lostAtWave).toBeLessThanOrEqual(8);
    // Blind, the Veilwalkers walk through unrevealed.
    expect(run('noCounter:detection').result!.stats.leaksByEnemy.veilwalker).toBeGreaterThanOrEqual(
      8,
    );
  });

  it('lets both alts win, the Capacitor Bank’s among them, and Story win', () => {
    for (const alt of ['alt:capacitor', 'alt:coil_and_hook']) {
      const r = run(alt);
      expect(r.result!.outcome, alt).toBe('won');
      expect(r.marginPct, alt).toBeGreaterThanOrEqual(20);
      expect(
        r.result!.steps.every((s) => s.error === null && s.issuedTick >= 0),
        alt,
      ).toBe(true);
    }
    const map = content.maps.a2_m05;
    const cap = map.builds.altBuilds.capacitor!;
    expect(cap.steps.some((s) => s.kind === 'specialize' && s.spec === 'b')).toBe(true);
    expect(run('par@story').result!.outcome).toBe('won');
  });

  it('runs about ten minutes at 1× (the split trigger is a median over 15, D137)', () => {
    const minutes = ['par', 'alt:capacitor', 'alt:coil_and_hook', 'par@story']
      .map((b) => run(b).result!.ticks / (TICK_HZ * 60))
      .toSorted((a, b) => a - b);
    const median = (minutes[1]! + minutes[2]!) / 2;
    expect(median).toBeGreaterThan(9);
    expect(median).toBeLessThan(15);
  });

  it('lands every beat in par, both alts, and Story: the shield, then one pivot as W6 starts', () => {
    for (const label of ['par', 'alt:capacitor', 'alt:coil_and_hook']) {
      expectBeats(beats(content, label), label);
    }
    // Story's countdowns run 50% longer: she walks 90 s, still short of the gate (100 s).
    expectBeats(beats(content, 'par', 'story'), 'Story', 1.5 * WINDOW_TICKS);
  });

  it('replays a retry from the W5 and W10 checkpoints across the pivot to the same end', () => {
    const straight = beats(content, 'par');
    expect([...straight.checkpoints.keys()]).toEqual([5, 10]);
    for (const [wave, cp] of straight.checkpoints) {
      expect(cp.hash, `W${wave}`).not.toBe('');
      // Before W5's checkpoint the map is a Defend; by W10's it's an Escort.
      expect(cp.tick < straight.at[PIVOT_CUE]![0]!, `W${wave}`).toBe(wave === 5);
      const replay = beats(
        content,
        'par',
        'standard',
        straight.commands.filter((c) => c.tick < cp.tick),
      );
      expect(replay.checkpoints.get(wave), `W${wave}`).toEqual(cp);
      const rest = beats(content, 'par', 'standard', straight.commands);
      expect(rest.hash, `W${wave} to the end`).toBe(straight.hash);
    }
  });

  it.each(bothWays(SHIFTS))(
    'holds par at 25/36 and every beat with %s shifted %s',
    (_name, _way, patches) => {
      const c = shiftedContent('a2_m05', patches);
      const b = beats(c, 'par');
      expect(b.evacuated).toBe(PAR_EVACUATED);
      expectBeats(b, 'par');
    },
  );
});
