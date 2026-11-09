// The Quiet Wave's sim rules (D097; design/core-loop.md § 2.1, § 2.4, § 2.7): a wave with
// `countdownAfter: 'bossEnded'` waits (`held`) until the boss fight ends, then runs its own
// countdown; callWave refuses a `quiet_wave` wave (no bonus); a `quiet_wave` leak never takes the
// core below 1, leaks after every other leak of its tick, and is floored before Emergency Bulkhead
// absorbs (D098). On fx_map with wave 1 replaced by Chitterbloom (live content) and wave 2 by
// `quietW2` (fx_walker, which the 9-tile road takes 540 ticks).
import { describe, expect, it } from 'vitest';
import { RAW_CONTENT } from '../content/registry.ts';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent, CompiledScriptedEvent, CompiledWave } from '../content/compiled.ts';
import type { IdSpace, WaveTag } from '../content/types.ts';
import { MAP, WALKER, setup, spawn } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig, type FixtureIds } from './__fixtures__/sim.ts';
import { callWaveBonus, nextWaveIsQuiet } from './economy.ts';
import type { SimEvent } from './events.ts';
import { createSim, type Sim } from './sim.ts';
import { movement } from './systems/movement.ts';

const E = compileContent(RAW_CONTENT).enemies;
const DRIVE_AT = 300;

/** Drives every live boss off `DRIVE_AT` ticks into wave 1. */
const DRIVE: CompiledScriptedEvent<IdSpace> = {
  id: 'drive',
  on: { wave: 1, phase: { afterTicks: DRIVE_AT } },
  when: null,
  actions: [{ bossEnd: 'driveOff' }],
  once: true,
};

/** fx_map: W1 one Chitterbloom (driven off at DRIVE_AT, unless `drive` is false), W2 3 walkers. */
function content(
  w2: { readonly after?: 'bossEnded'; readonly tags?: readonly WaveTag[] },
  drive = true,
): CompiledContent<FixtureIds> {
  const [w1, w2Base] = MAP.waves;
  const base = w1!.groups[0]!;
  const boss = Object.assign({}, base, { enemy: E.chitterbloom, count: 1, delayTicks: 0 });
  const walkers = Object.assign({}, base, { enemy: WALKER, count: 3, tags: w2.tags ?? [] });
  const waves: CompiledWave<IdSpace>[] = [
    Object.assign({}, w1!, { groups: [boss], lastSpawnTicks: 0 }),
    Object.assign({}, w2Base!, {
      groups: [walkers],
      lastSpawnTicks: 2 * base.intervalTicks,
      countdownAfter: w2.after ?? null,
    }),
  ];
  const map = Object.assign({}, MAP, { waves, events: drive ? [DRIVE] : [] });
  const enemies = Object.assign({}, FIXTURE_CONTENT.enemies, E);
  return Object.assign({}, FIXTURE_CONTENT, { enemies, maps: { fx_map: map } });
}

type Logged = { readonly tick: number; readonly e: SimEvent<IdSpace> };

function start(c: CompiledContent<FixtureIds>, integrity?: number): Sim<FixtureIds> {
  const modifiers =
    integrity === undefined
      ? []
      : [
          {
            kind: 'economy',
            stat: 'coreIntegrity',
            set: integrity,
            source: 'veteran:glass',
          } as const,
        ];
  const sim = createSim(fixtureConfig({ content: c, modifiers }));
  sim.enqueue({ type: 'callWave' });
  return sim;
}

/** Steps `sim` to `ticks` (or the map's end), logging events with their tick. */
function runTo(sim: Sim<FixtureIds>, ticks: number, log: Logged[] = []): Logged[] {
  const out: SimEvent<FixtureIds>[] = [];
  while (sim.state.tick < ticks && sim.state.outcome === 'playing') {
    const tick = sim.state.tick;
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) log.push({ tick, e });
  }
  return log;
}

const tickOf = (log: readonly Logged[], test: (e: SimEvent<IdSpace>) => boolean): number =>
  log.find((l) => test(l.e))?.tick ?? -1;

/** Calls the next wave now (as if paused) and returns the rejection, if any. */
function call(sim: Sim<FixtureIds>): string | null {
  sim.enqueue({ type: 'callWave' });
  sim.applyPending();
  const out: SimEvent<FixtureIds>[] = [];
  sim.drainEvents(out);
  const r = out.find((e) => e.type === 'CommandRejected');
  return r?.type === 'CommandRejected' ? r.reason : null;
}

describe("countdownAfter: 'bossEnded'", () => {
  it('holds the next countdown until the boss is driven off, then runs it in full', () => {
    const sim = start(content({ after: 'bossEnded' }));
    const log = runTo(sim, 100);
    expect(sim.state.schedule.phase).toBe('held');
    expect(log.some((l) => l.e.type === 'CountdownStarted')).toBe(false);
    runTo(sim, 3000, log);
    const ended = tickOf(log, (e) => e.type === 'BossEnded');
    const countdown = tickOf(log, (e) => e.type === 'CountdownStarted' && e.wave === 2);
    const started = tickOf(log, (e) => e.type === 'WaveStarted' && e.wave === 2);
    expect(ended).toBeGreaterThanOrEqual(DRIVE_AT);
    expect(countdown).toBe(ended + 1); // the waves system runs before the drive-off's tick ends
    expect(started - countdown).toBe(MAP.waves[1]!.countdownTicks);
  });

  it('changes nothing without the field: the countdown starts as wave 1 finishes spawning', () => {
    const log = runTo(start(content({})), 50);
    expect(tickOf(log, (e) => e.type === 'CountdownStarted' && e.wave === 2)).toBe(0);
  });

  it('refuses callWave while held (waveInProgress) and pays no bonus', () => {
    const sim = start(content({ after: 'bossEnded' }));
    runTo(sim, 100);
    expect(callWaveBonus(sim.state, sim.map)).toBe(0);
    expect(call(sim)).toBe('waveInProgress');
    expect(sim.state.wave).toBe(1);
  });

  it('is deterministic', () => {
    const a = start(content({ after: 'bossEnded', tags: ['quiet_wave'] }));
    const b = start(content({ after: 'bossEnded', tags: ['quiet_wave'] }));
    runTo(a, 2500);
    runTo(b, 2500);
    expect(a.hash()).toBe(b.hash());
  });
});

describe('the Quiet Wave refuses callWave', () => {
  it("is never called early: 'quietWave' while held and during its countdown, no bonus", () => {
    const sim = start(content({ after: 'bossEnded', tags: ['quiet_wave'] }));
    runTo(sim, 100);
    expect(nextWaveIsQuiet(sim.state, sim.map)).toBe(true);
    expect(call(sim)).toBe('quietWave');
    runTo(sim, DRIVE_AT + 60);
    expect(sim.state.schedule.phase).toBe('countdown');
    expect(callWaveBonus(sim.state, sim.map)).toBe(0);
    const credits = sim.state.credits;
    expect(call(sim)).toBe('quietWave');
    expect(sim.state.credits).toBe(credits);
    expect(sim.state.wave).toBe(1);
  });

  it('a plain next wave is not quiet, and nothing is quiet once no wave is left', () => {
    const sim = start(content({}));
    runTo(sim, 10);
    expect(nextWaveIsQuiet(sim.state, sim.map)).toBe(false);
    expect(callWaveBonus(sim.state, sim.map)).toBeGreaterThan(0);
    expect(nextWaveIsQuiet({ wave: 2 }, sim.map)).toBe(false);
  });
});

/** Leaks one walker (leak `cost`, tags `tags`) into a core at `integrity`. */
function leakAt(integrity: number, tags: readonly WaveTag[], cost = 2) {
  const { state } = setup();
  state.integrity = integrity;
  const def = Object.freeze({ ...WALKER, id: 'thrum', leak: cost });
  spawn(state, def, { dist: MAP.routes.a!.lengthTiles, tags });
  movement(state);
  const leaked = state.events.find((e) => e.type === 'EnemyLeaked');
  return { integrity: state.integrity, leak: leaked?.type === 'EnemyLeaked' ? leaked.leak : -1 };
}

/**
 * A Quiet Wave unit (leak 2) and a plain one (leak `plain`) reach the core on the same tick at
 * integrity 3, the quiet one in the lower slot or the higher one.
 */
function sharedTick(quietFirst: boolean, plain = 2) {
  const { state } = setup();
  state.integrity = 3;
  const end = MAP.routes.a!.lengthTiles;
  const thrum = Object.freeze({ ...WALKER, id: 'thrum', leak: 2 });
  const pest = Object.freeze({ ...WALKER, id: 'pest', leak: plain });
  const spawnQuiet = () => spawn(state, thrum, { dist: end, tags: ['quiet_wave'] });
  const spawnPlain = () => spawn(state, pest, { dist: end });
  if (quietFirst) {
    spawnQuiet();
    spawnPlain();
  } else {
    spawnPlain();
    spawnQuiet();
  }
  movement(state);
  return {
    integrity: state.integrity,
    leaks: state.events.flatMap((e) => (e.type === 'EnemyLeaked' ? [[e.enemy, e.leak]] : [])),
  };
}

describe('a quiet_wave leak never takes the core below 1', () => {
  it('caps the leak at integrity − 1', () => {
    expect(leakAt(2, ['quiet_wave'])).toEqual({ integrity: 1, leak: 1 });
    expect(leakAt(1, ['quiet_wave'])).toEqual({ integrity: 1, leak: 0 });
    expect(leakAt(5, ['quiet_wave'])).toEqual({ integrity: 3, leak: 2 });
  });

  it('leaves every other leak alone', () => {
    expect(leakAt(2, [])).toEqual({ integrity: 0, leak: 2 });
  });

  it('applies the floor before Emergency Bulkhead: a floored leak spends no absorb (D098)', () => {
    const { state } = setup();
    state.integrity = 1;
    state.leakAbsorbLeft = 3;
    const thrum = Object.freeze({ ...WALKER, id: 'thrum', leak: 2 });
    spawn(state, thrum, { dist: MAP.routes.a!.lengthTiles, tags: ['quiet_wave'] });
    movement(state);
    expect(state.integrity).toBe(1);
    expect(state.leakAbsorbLeft).toBe(3);
    // At 2, the floor leaves room for 1: absorb takes that 1, the core keeps 2.
    state.integrity = 2;
    spawn(state, thrum, { dist: MAP.routes.a!.lengthTiles, tags: ['quiet_wave'] });
    movement(state);
    expect(state.integrity).toBe(2);
    expect(state.leakAbsorbLeft).toBe(2);
  });

  it('a same-tick plain leak never turns sparing into a loss, in either slot order (D098)', () => {
    // The plain leak (2) is charged first, then Thrum is floored at 1: the core survives at 1.
    const expected = {
      integrity: 1,
      leaks: [
        ['pest', 2],
        ['thrum', 0],
      ],
    };
    expect(sharedTick(true)).toEqual(expected);
    expect(sharedTick(false)).toEqual(expected);
  });

  it('a same-tick plain leak that empties the core on its own still loses, in either order', () => {
    expect(sharedTick(true, 3).integrity).toBe(0);
    expect(sharedTick(false, 3).integrity).toBe(0);
  });

  it('a spared Quiet Wave never loses the map', () => {
    const sim = start(content({ after: 'bossEnded', tags: ['quiet_wave'] }), 1);
    expect(sim.state.integrity).toBe(1);
    expect(WALKER.leak).toBeGreaterThan(0);
    runTo(sim, 6000);
    expect(sim.state.stats.tagLeaked.quiet_wave).toBe(3);
    expect(sim.state.integrity).toBe(1);
    expect(sim.state.outcome).toBe('won');
  });
});
