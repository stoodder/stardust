// The scripted-build executor's step semantics (conventions.md § Balance sims) and runHeadless,
// on the fixture map (src/sim/__fixtures__/sim.ts), plus A1M1's authored builds end to end.
import { describe, expect, it } from 'vitest';
import type { CompiledBuild, CompiledBuildStep } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { FIXTURE_CONTENT, fixtureConfig, fixtureSim, type FixtureIds } from './__fixtures__/sim.ts';
import type { SimEvent } from './events.ts';
import { createBuildExecutor, runHeadless } from './headless.ts';
import { createSim } from './sim.ts';

type Step = CompiledBuildStep<FixtureIds>;
const fxMap = FIXTURE_CONTENT.maps.fx_map;

function build(
  steps: Step[],
  over: Partial<CompiledBuild<FixtureIds>> = {},
): CompiledBuild<FixtureIds> {
  return {
    loadout: ['fx_gun', 'fx_mortar'],
    companion: null,
    technicianAbility: 'fx_strike',
    callEarly: false,
    steps,
    ...over,
  };
}

/** Runs a build with an executor, recording every event with its tick. */
function play(b: CompiledBuild<FixtureIds>, maxTicks = 60 * 60 * 5) {
  const sim = fixtureSim({ loadout: b.loadout });
  const exec = createBuildExecutor(sim, b);
  const events: { tick: number; e: SimEvent<FixtureIds> }[] = [];
  /** The bank before each tick's steps. */
  const credits: number[] = [];
  const out: SimEvent<FixtureIds>[] = [];
  const drain = (tick: number): void => {
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) events.push({ tick, e });
  };
  while (sim.state.outcome === 'playing' && sim.state.tick < maxTicks) {
    const tick = sim.state.tick; // the tick about to run; the executor's commands apply at it
    credits.push(sim.state.credits);
    exec.beforeTick();
    sim.step();
    drain(tick);
  }
  return { sim, exec, events, credits };
}

describe('scripted-build executor', () => {
  it('issues the setup steps before starting wave 1, in order, at tick 0', () => {
    const { sim, exec } = play(
      build([
        { wave: 1, kind: 'build', tower: 'fx_gun', tile: [1, 1] },
        { wave: 1, kind: 'upgrade', tile: [1, 1] },
      ]),
    );
    expect(exec.steps.map((s) => [s.issuedTick, s.late, s.error])).toEqual([
      [0, false, null],
      [0, false, null],
    ]);
    const log = sim.state.commandLog.map((l) => [l.tick, l.cmd.type]);
    expect(log.slice(0, 3)).toEqual([
      [0, 'build'],
      [0, 'upgrade'],
      [0, 'callWave'],
    ]);
    expect(exec.waveCalls).toEqual([0]);
  });

  it('waits for an unlock and for credits, and later steps wait behind it', () => {
    // fx_mortar (120) unlocks when W2's countdown starts, with 100 + some W1 bounties banked, so
    // it waits for credits. The targeting step behind it waits too, though it costs nothing.
    const { sim, exec, events, credits } = play(
      build([
        { wave: 1, kind: 'build', tower: 'fx_gun', tile: [1, 1] },
        { wave: 2, kind: 'build', tower: 'fx_mortar', tile: [3, 1] },
        { wave: 2, kind: 'targeting', tile: [1, 1], mode: 'strong' },
      ]),
    );
    const unlock = events.find((l) => l.e.type === 'TowerClassUnlocked')!.tick;
    const [, mortar, targeting] = exec.steps;
    expect(mortar!.issuedTick).toBeGreaterThan(unlock + 1);
    expect(mortar!.late).toBe(false);
    expect(targeting!.issuedTick).toBe(mortar!.issuedTick);
    // It went in on the first tick the bank covered it.
    expect(credits[mortar!.issuedTick - 1]).toBeLessThan(120);
    expect(credits[mortar!.issuedTick]).toBeGreaterThanOrEqual(120);
    expect(sim.state.towers.items.find((t) => t.alive && t.col === 3)?.def?.id).toBe('fx_mortar');
    expect(events.filter((l) => l.e.type === 'CommandRejected')).toEqual([]);
  });

  it('casts an ability step exactly afterTicks into its wave, once its wave has started', () => {
    const { exec, events } = play(
      build([{ wave: 2, kind: 'ability', slot: 1, target: [2, 2], when: { afterTicks: 120 } }]),
    );
    const w2 = events.find((l) => l.e.type === 'WaveStarted' && l.e.wave === 2)!.tick;
    expect(exec.steps[0]!.issuedTick).toBe(w2 + 120);
    expect(exec.steps[0]!.late).toBe(false);
    expect(events.filter((l) => l.e.type === 'AbilityUsed').map((l) => l.tick)).toEqual([w2 + 120]);
  });

  it('casts a waveStart ability on the first tick after its wave starts', () => {
    const { exec, events } = play(
      build([{ wave: 1, kind: 'ability', slot: 1, target: [2, 2], when: 'waveStart' }]),
    );
    const w1 = events.find((l) => l.e.type === 'WaveStarted' && l.e.wave === 1)!.tick;
    expect(exec.steps[0]!.issuedTick).toBe(w1 + 1);
  });

  it('records an upgrade on an empty tile and a sim rejection as step errors, then carries on', () => {
    const { exec } = play(
      build([
        { wave: 1, kind: 'upgrade', tile: [3, 1] },
        { wave: 1, kind: 'build', tower: 'fx_gun', tile: [2, 0] }, // the path
        { wave: 1, kind: 'build', tower: 'fx_gun', tile: [1, 1] },
      ]),
    );
    expect(exec.steps.map((s) => s.error)).toEqual(['noSuchTower', 'notBuildable', null]);
  });

  it('flags a step issued after its wave started as late', () => {
    // fx_mortar is locked until W2's countdown, so a wave-1 mortar goes in during W1.
    const { exec } = play(build([{ wave: 1, kind: 'build', tower: 'fx_mortar', tile: [3, 1] }]));
    expect(exec.steps.map((s) => s.late)).toEqual([true]);
    expect(exec.steps[0]!.issuedTick).toBeGreaterThan(0);
  });

  it('with callEarly, calls each wave the moment its countdown starts, for the full bonus', () => {
    const { events, exec } = play(
      build([{ wave: 1, kind: 'build', tower: 'fx_gun', tile: [1, 1] }], { callEarly: true }),
    );
    const countdown = events.find((l) => l.e.type === 'CountdownStarted' && l.e.wave === 2)!.tick;
    const w2 = events.find((l) => l.e.type === 'WaveStarted' && l.e.wave === 2)!;
    expect(w2.tick).toBe(countdown + 1);
    expect(w2.e).toMatchObject({ early: true });
    expect(exec.waveCalls).toEqual([0, countdown + 1]);
  });

  it('a callWave step calls its wave early during its build phase', () => {
    const { events } = play(build([{ wave: 2, kind: 'callWave' }]));
    expect(events.find((l) => l.e.type === 'WaveStarted' && l.e.wave === 2)!.e).toMatchObject({
      early: true,
    });
  });

  it("refuses step kinds the sim can't run yet", () => {
    const sim = fixtureSim();
    const b = build([{ wave: 1, kind: 'holdFire', target: 'all', on: true }]);
    expect(() => createBuildExecutor(sim, b)).toThrow(/can't run yet: 0:holdFire/);
  });
});

describe('runHeadless', () => {
  const par = build([
    { wave: 1, kind: 'build', tower: 'fx_gun', tile: [1, 1] },
    { wave: 2, kind: 'build', tower: 'fx_mortar', tile: [3, 1] },
    { wave: 2, kind: 'ability', slot: 1, target: [2, 2], when: { afterTicks: 60 } },
  ]);
  const cfg = fixtureConfig({ loadout: par.loadout });

  it('plays a build to a win and summarizes it', () => {
    const r = runHeadless(cfg, par);
    expect(r.outcome).toBe('won');
    expect(r.violations).toEqual([]);
    expect(r.steps.every((s) => s.issuedTick >= 0 && s.error === null)).toBe(true);
    expect(r.maxIntegrity).toBe(fxMap.coreIntegrity);
    expect(r.waves.map((w) => w.spawned)).toEqual([3, 6]);
    expect(r.waves.every((w) => w.killed + w.leaked === w.spawned)).toBe(true);
    expect(r.waves[0]!.bankAtPhase).toBe(200);
    expect(r.towers.map((t) => [t.tower, t.tier])).toEqual([
      ['fx_gun', 1],
      ['fx_mortar', 1],
    ]);
    expect(r.stats.abilityUses).toBe(1);
    expect(r.towers.reduce((n, t) => n + t.kills, 0) + r.abilityKills).toBe(
      r.stats.skitterkinKilled,
    );
    expect(r.credits).toBe(
      200 + r.stats.creditsEarned - r.stats.creditsSpent + r.stats.creditsRefunded,
    );
  });

  it('is deterministic, and its command log replays the run', () => {
    const a = runHeadless(cfg, par);
    expect(runHeadless(cfg, par).hash).toBe(a.hash);
    const sim = createSim(cfg);
    const exec = createBuildExecutor(sim, par);
    while (sim.state.outcome === 'playing') {
      exec.beforeTick();
      sim.step();
    }
    const replay = createSim(cfg);
    const log = sim.state.commandLog;
    let i = 0;
    while (replay.state.outcome === 'playing') {
      while (i < log.length && log[i]!.tick === replay.state.tick) replay.enqueue(log[i++]!.cmd);
      replay.step();
    }
    expect(replay.hash()).toBe(a.hash);
  });

  it('counts leaks per wave (fleeing units leak for 0)', () => {
    const r = runHeadless(cfg, build([], { technicianAbility: null }));
    expect(r.outcome).toBe('won'); // 5 walkers leak 1 each; the 4 fleeing runners leak 0
    expect(r.integrity).toBe(fxMap.coreIntegrity - 5);
    expect(r.lostAtWave).toBeNull();
    expect(r.waves.map((w) => [w.leaked, w.integrityLost])).toEqual([
      [3, 3],
      [6, 2],
    ]);
  });

  it('stops at maxTicks', () => {
    const r = runHeadless(cfg, par, { maxTicks: 100 });
    expect(r.outcome).toBe('timeout');
    expect(r.ticks).toBe(100);
  });
});

describe('A1M1 builds through runHeadless', () => {
  const content = compileContent(RAW_CONTENT);
  const map = content.maps.a1_m01;
  const run = (b: CompiledBuild) =>
    runHeadless(
      {
        content,
        mapId: 'a1_m01',
        seed: 1,
        loadout: b.loadout,
        companion: null,
        modifiers: [],
        difficulty: 'standard',
        abilities: { slot1: b.technicianAbility, slot2: null, slot2State: 'none' },
        scriptFlags: {},
      },
      b,
    );

  it('par issues every step on time, with no error, and wins without a leak', () => {
    const r = run(map.builds.parBuild);
    expect(r.steps.map((s) => [s.error, s.late])).toEqual(r.steps.map(() => [null, false]));
    expect(r.outcome).toBe('won');
    expect(r.waves.map((w) => w.leaked)).toEqual(map.waves.map(() => 0));
    expect(r.violations).toEqual([]);
  });

  it('doing nothing loses, and the result names the wave it lost on', () => {
    const r = run({ ...map.builds.parBuild, technicianAbility: null, steps: [] });
    expect(r.outcome).toBe('lost');
    expect(r.integrity).toBe(0);
    expect(r.lostAtWave).toBe(3);
  });

  it('rivet_only issues every step and wins', () => {
    const r = run(map.builds.altBuilds.rivet_only!);
    expect(r.steps.every((s) => s.issuedTick >= 0 && s.error === null)).toBe(true);
    expect(r.outcome).toBe('won');
  });
});
