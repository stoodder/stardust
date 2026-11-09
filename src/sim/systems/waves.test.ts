// The wave schedule, callWave, map-script triggers, wave resolution, and win/lose
// (design/core-loop.md § 2.1–2.4, § 2.9) on the fixture map. fx_map: W1 is 3 fx_walker 48 ticks
// apart; W2 (a 600-tick countdown) is 2 fx_walker 15 ticks apart plus 4 fleeing fx_runner 30
// apart after 60. fx_mortar and fx_sprinkler unlock at W2's countdown, with a cue; 90 ticks into
// W2 a script grants 10 credits. The 9-tile road takes a walker 540 ticks, a runner 270.
import { describe, expect, it } from 'vitest';
import { FIXTURE } from '../../content/__fixtures__/content.ts';
import { compileContent } from '../../content/compile.ts';
import type { MapDef } from '../../content/types.ts';
import {
  FIXTURE_CONTENT,
  SIM_FIXTURE,
  fixtureConfig,
  fixtureSim,
  type FixtureIds,
} from '../__fixtures__/sim.ts';
import type { SimEvent } from '../events.ts';
import { createSim, type Sim } from '../sim.ts';
import { unsupportedScript } from './triggers.ts';

type Ev = SimEvent<FixtureIds>;
type FxSim = Sim<FixtureIds>;
/** Events with the tick they were emitted on. */
type Logged = { readonly tick: number; readonly e: Ev };

/** Steps `sim` until it has completed `ticks` ticks (or the map ends), collecting events. */
function runTo(sim: FxSim, ticks: number, log: Logged[] = []): Logged[] {
  const out: Ev[] = [];
  while (sim.state.tick < ticks && sim.state.outcome === 'playing') {
    const tick = sim.state.tick;
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) log.push({ tick, e });
  }
  return log;
}
/** Applies `sim`'s pending commands now (as if paused) and returns their events. */
function apply(sim: FxSim): Ev[] {
  sim.applyPending();
  const out: Ev[] = [];
  sim.drainEvents(out);
  return out;
}
const ticksOf = (log: readonly Logged[], type: Ev['type']): number[] =>
  log.filter((l) => l.e.type === type).map((l) => l.tick);
function isType<T extends Ev['type']>(e: Ev, type: T): e is Extract<Ev, { type: T }> {
  return e.type === type;
}
const ofType = <T extends Ev['type']>(log: readonly Logged[], type: T) =>
  log.flatMap((l) => (isType(l.e, type) ? [l.e] : []));
const rejections = (events: readonly Ev[]): string[] =>
  events.flatMap((e) => (e.type === 'CommandRejected' ? [e.reason] : []));

/** A sim on fx_map with `over` patched into the map. */
function simWith(over: Partial<MapDef<FixtureIds, 'fx_map'>>): FxSim {
  const content = compileContent<FixtureIds>({
    ...SIM_FIXTURE,
    maps: { fx_map: { ...SIM_FIXTURE.maps.fx_map, ...over } },
  });
  return createSim({ ...fixtureConfig(), content });
}

/** A sim with wave 1 started at tick 0. */
function started(): FxSim {
  const sim = fixtureSim();
  sim.enqueue({ type: 'callWave' });
  return sim;
}

describe('the setup phase', () => {
  it('runs no countdown: nothing spawns until the player starts wave 1', () => {
    const sim = fixtureSim();
    const log = runTo(sim, 3000);
    expect(log).toEqual([]);
    expect(sim.state.wave).toBe(0);
    expect(sim.state.schedule).toMatchObject({
      phase: 'setup',
      countdownTicks: 0,
      countdownWave: 1,
    });
    expect(sim.state.enemies.live).toBe(0);
  });

  it('starting wave 1 is free and not early', () => {
    const sim = fixtureSim();
    sim.enqueue({ type: 'callWave' });
    expect(apply(sim)).toEqual([{ type: 'WaveStarted', wave: 1, early: false, bonus: 0 }]);
    expect(sim.state.credits).toBe(200);
    expect(sim.state.schedule.startTick).toEqual([0, -1]);
  });
});

describe('the spawner', () => {
  it('spawns wave 1 at its interval from the tick it starts, with full HP and shields', () => {
    const sim = started();
    const log = runTo(sim, 200);
    expect(ticksOf(log, 'EnemySpawned')).toEqual([0, 48, 96]);
    expect(ofType(log, 'EnemySpawned')[0]).toEqual({
      type: 'EnemySpawned',
      uid: 1,
      enemy: 'fx_walker',
      route: 'a',
      wave: 1,
    });
    const e = sim.state.enemies.items[0]!;
    expect(e).toMatchObject({ hp: 30, shieldHp: 0, wave: 1, spawnTick: 0 });
  });

  it('starts the next countdown once the wave has finished spawning, and unlocks on it', () => {
    const sim = started();
    const log = runTo(sim, 97);
    expect(sim.state.schedule).toMatchObject({
      phase: 'countdown',
      countdownTicks: 600,
      countdownTotalTicks: 600,
      countdownWave: 2,
    });
    // Wave 2's countdown starts on wave 1's last spawn tick; its triggers fire the same tick.
    expect(log.filter((l) => l.tick === 96).map((l) => l.e)).toEqual([
      expect.objectContaining({ type: 'EnemySpawned' }),
      { type: 'CountdownStarted', wave: 2, ticks: 600 },
      { type: 'TowerClassUnlocked', tower: 'fx_mortar' },
      { type: 'TowerClassUnlocked', tower: 'fx_sprinkler' },
      { type: 'ScriptCue', cueId: 'fx_map_w02' },
    ]);
    expect(sim.state.lockedTowers).toEqual([]);
  });

  it('starts the next wave when its countdown runs out; groups spawn in parallel', () => {
    const sim = started();
    const log = runTo(sim, 900);
    expect(ofType(log, 'WaveStarted').map((e) => e.wave)).toEqual([1, 2]);
    expect(ticksOf(log, 'WaveStarted')).toEqual([0, 696]); // 96 + 600
    const w2 = log.flatMap((l) =>
      isType(l.e, 'EnemySpawned') && l.e.wave === 2 ? [{ tick: l.tick, e: l.e }] : [],
    );
    expect(w2.map((l) => [l.tick, l.e.enemy])).toEqual([
      [696, 'fx_walker'],
      [711, 'fx_walker'],
      [756, 'fx_runner'],
      [786, 'fx_runner'],
      [816, 'fx_runner'],
      [846, 'fx_runner'],
    ]);
    const runner = sim.state.enemies.items.find((e) => e.alive && e.def?.id === 'fx_runner')!;
    expect(runner).toMatchObject({ shieldHp: 10, tags: ['fleeing'], wave: 2 });
    expect(sim.state.schedule.phase).toBe('done');
  });

  it('runs afterSec script triggers on the wave clock (a 10-credit grant 1.5 s into W2)', () => {
    const sim = started();
    runTo(sim, 786);
    const before = sim.state.credits;
    runTo(sim, 787);
    expect(sim.state.credits).toBe(before + 10);
  });
});

describe('callWave', () => {
  it('is rejected while a wave spawns and after the last wave has started', () => {
    const sim = started();
    runTo(sim, 50);
    sim.enqueue({ type: 'callWave' });
    expect(rejections(apply(sim))).toEqual(['waveInProgress']);
    runTo(sim, 900);
    sim.enqueue({ type: 'callWave' });
    expect(rejections(apply(sim))).toEqual(['noWavesLeft']);
  });

  it('pays half the wave’s clear bonus when called the instant its countdown starts', () => {
    const sim = started();
    runTo(sim, 97);
    sim.enqueue({ type: 'callWave' });
    expect(apply(sim)).toEqual([{ type: 'WaveStarted', wave: 2, early: true, bonus: 14 }]);
    expect(sim.state.credits).toBe(214);
    expect(sim.state.stats.creditsEarned).toBe(14);
    // Its first spawns land in the next tick.
    const log = runTo(sim, 98);
    expect(ticksOf(log, 'EnemySpawned')).toEqual([97]);
    expect(sim.state.schedule.startTick).toEqual([0, 97]);
  });

  it('scales the bonus by the countdown left', () => {
    const sim = started();
    runTo(sim, 97 + 300);
    expect(sim.state.schedule.countdownTicks).toBe(300);
    sim.enqueue({ type: 'callWave' });
    expect(apply(sim)).toEqual([{ type: 'WaveStarted', wave: 2, early: true, bonus: 7 }]);
  });

  it('cuts ability cooldowns by 0.25 × the time left', () => {
    const sim = started();
    sim.enqueue({ type: 'ability', slot: 1, target: [2, 2] });
    runTo(sim, 97);
    const cd = sim.state.abilityCooldownTicks[0]!;
    expect(cd).toBeGreaterThan(150);
    sim.enqueue({ type: 'callWave' });
    apply(sim);
    expect(sim.state.abilityCooldownTicks[0]).toBe(cd - 150);
  });
});

describe('wave resolution and win/lose', () => {
  it('pays each clear bonus as its wave resolves (leaks too), then wins', () => {
    const sim = started();
    const log = runTo(sim, 5000);
    expect(ofType(log, 'WaveCleared')).toEqual([
      { type: 'WaveCleared', wave: 1, bonus: 24 },
      { type: 'WaveCleared', wave: 2, bonus: 28 },
    ]);
    // W1 resolves when its last walker (spawned at 96) leaks, 540 ticks later.
    expect(ticksOf(log, 'WaveCleared')[0]).toBe(96 + 539);
    expect(ofType(log, 'EnemyLeaked').map((e) => e.leak)).toEqual([1, 1, 1, 0, 0, 0, 0, 1, 1]);
    expect(sim.state.integrity).toBe(15); // fleeing runners leak for 0
    expect(sim.state.outcome).toBe('won');
    expect(log.at(-1)).toEqual({ tick: ticksOf(log, 'WaveCleared')[1], e: { type: 'MapWon' } });
    expect(sim.state.credits).toBe(200 + 24 + 28 + 10);
  });

  it('can resolve waves out of order, and wins only once every wave has', () => {
    // One walker per wave, W2 called the tick after W1's; a gun on Last kills W2's first.
    const sim = simWith({
      waves: [
        { groups: [{ enemy: 'fx_walker', count: 1, route: 'a' }] },
        { groups: [{ enemy: 'fx_walker', count: 1, route: 'a' }] },
      ],
      threatIntel: [],
    });
    sim.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    sim.enqueue({ type: 'targeting', towerUid: 1, mode: 'last' });
    sim.enqueue({ type: 'callWave' });
    runTo(sim, 1);
    sim.enqueue({ type: 'callWave' });
    const log = runTo(sim, 2000);
    expect(ofType(log, 'WaveCleared').map((e) => e.wave)).toEqual([2, 1]);
    expect(ticksOf(log, 'MapWon')).toEqual([ticksOf(log, 'WaveCleared')[1]]);
    expect(sim.state.outcome).toBe('won');
  });

  it('loses the instant integrity hits 0, then freezes', () => {
    const sim = simWith({ coreIntegrity: 2 });
    sim.enqueue({ type: 'callWave' });
    const log = runTo(sim, 5000);
    expect(sim.state.outcome).toBe('lost');
    expect(sim.state.integrity).toBe(0);
    expect(ticksOf(log, 'MapLost')).toEqual([48 + 539]); // the second walker's leak
    expect(ofType(log, 'WaveCleared')).toEqual([]);
    const { tick } = sim.state;
    const hash = sim.hash();
    sim.step();
    expect(sim.state.tick).toBe(tick);
    sim.enqueue({ type: 'callWave' });
    expect(rejections(apply(sim))).toEqual(['mapEnded']);
    expect(sim.hash()).toBe(hash);
  });
});

describe('createSim and map scripts', () => {
  it('refuses script parts it cannot simulate, naming them', () => {
    expect(() => createSim({ ...fixtureConfig(), content: compileContent(FIXTURE) })).toThrow(
      /late_gift': action setClickable is not simulated yet/,
    );
    expect(() =>
      simWith({
        events: [{ id: 'boss', on: { bossPhase: 2 }, actions: [{ cue: 'fx_map_boss' }] }],
      }),
    ).toThrow(/'boss': trigger bossPhase is not simulated yet/);
    const cond = {
      ...FIXTURE_CONTENT.maps.fx_map,
      events: [
        {
          id: 'cond',
          on: { tick: 5 },
          when: { flag: 'door_choice', eq: 'open' },
          actions: [{ grantCredits: 5 }],
          once: true,
        } as const,
      ],
    };
    expect(unsupportedScript(cond)).toEqual([
      "event 'cond': 'when' conditions are not simulated yet",
    ]);
  });

  it('runs a tick trigger once, whatever its `once` says (every M1 trigger is monotonic)', () => {
    const sim = simWith({
      events: [{ id: 'gift', on: { tick: 5 }, actions: [{ grantCredits: 7 }], once: false }],
    });
    runTo(sim, 100);
    expect(sim.state.credits).toBe(207);
    expect(sim.state.scriptFired.at(-1)).toBe(true); // after the two compiled unlock events
  });
});
