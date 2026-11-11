// The Holdout's sim parts (T605) on the sim fixture: the forced input (a `forceInput` freezes the
// rest of its tick and everything after, only its `scriptInput` applies, a press resumes play
// whole), `endMap` (won on its tick, from an event only), the blocker's rules as pure functions
// (its timeline's levels, its hold point, who it may hold, the ticks to the next wave), and the
// lifted gates. dev_holdout end to end: render/__fixtures__/devHoldout.test.ts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledMapDef } from '../content/compiled.ts';
import type { MapDef } from '../content/types.ts';
import { SIM_FIXTURE, fixtureConfig, type FixtureIds } from './__fixtures__/sim.ts';
import { blockable, blockerLevel, holdDistOn, ticksToNextWave } from './blocker.ts';
import { ENEMY_BLANK, type Enemy } from './entities.ts';
import { gatedFlagDefaults } from './escort.ts';
import { FEATURE_GATES } from './gates.ts';
import { createSim } from './sim.ts';
import type { SimEvent } from './events.ts';
import { SCRIPT_GATES, unsupportedScript } from './systems/triggers.ts';
import { checkpointAt } from './systems/waves.ts';

/** The fixture with its events replaced (and its own kept unless `keep` is false). */
function withEvents(events: MapDef<FixtureIds, 'fx_map'>['events'], keep = false) {
  const raw = SIM_FIXTURE.maps.fx_map;
  const content = compileContent<FixtureIds>({
    ...SIM_FIXTURE,
    maps: { fx_map: { ...raw, events: [...(keep ? (raw.events ?? []) : []), ...(events ?? [])] } },
  });
  return fixtureConfig({ content });
}

function drain(sim: ReturnType<typeof createSim<FixtureIds>>): SimEvent<FixtureIds>[] {
  const out: SimEvent<FixtureIds>[] = [];
  sim.drainEvents(out);
  return out;
}

describe('the forced input (T605)', () => {
  const PAUSE = withEvents([
    { id: 'hold', on: { wave: 2, phase: 'start' }, actions: [{ forceInput: { id: 'press' } }] },
    { id: 'again', on: { wave: 2, phase: 'start' }, actions: [{ forceInput: { id: 'other' } }] },
    { id: 'after', on: { forcedInputResolved: 'press' }, actions: [{ cue: 'fx_map_w02' }] },
  ]);

  it('freezes the rest of its tick and every tick after; the sim keeps ticking', () => {
    const sim = createSim(PAUSE);
    sim.enqueue({ type: 'callWave' });
    while (sim.state.wave < 2) sim.step();
    const events = drain(sim);
    // One request: a second while it's pending is ignored.
    expect(events.filter((e) => e.type === 'ForcedInputRequested')).toEqual([
      { type: 'ForcedInputRequested', id: 'press' },
    ]);
    expect(sim.state.pendingInput).toBe('press');
    const enemies = () => sim.state.enemies.items.filter((e) => e.alive).map((e) => e.dist);
    const before = { dist: enemies(), sched: JSON.stringify(sim.state.schedule) };
    for (let i = 0; i < 300; i++) sim.step();
    expect({ dist: enemies(), sched: JSON.stringify(sim.state.schedule) }).toEqual(before);
    expect(drain(sim)).toEqual([]);
  });

  it('a press resumes play whole: its trigger fires that tick, and the map plays on to its end', () => {
    const sim = createSim(PAUSE);
    sim.enqueue({ type: 'callWave' });
    while (sim.state.pendingInput === null) sim.step();
    drain(sim);
    const tick = sim.state.tick;
    sim.enqueue({ type: 'scriptInput', id: 'press' });
    sim.step();
    const events = drain(sim);
    expect(events[0]).toEqual({ type: 'ForcedInputResolved', id: 'press' });
    expect(events).toContainEqual({ type: 'ScriptCue', cueId: 'fx_map_w02' });
    expect(sim.state.forcedResolved).toEqual(['press']);
    // The second request was spent while the first was pending: nothing else freezes.
    while (sim.state.outcome === 'playing' && sim.state.tick < tick + 60 * 120) sim.step();
    expect(sim.state.pendingInput).toBeNull();
    expect(sim.state.outcome).not.toBe('playing');
  });

  it('rejects every other command, and a press of another id or with none pending', () => {
    const sim = createSim(PAUSE);
    sim.enqueue({ type: 'scriptInput', id: 'press' }); // none pending yet
    sim.enqueue({ type: 'callWave' });
    sim.step();
    expect(drain(sim).find((e) => e.type === 'CommandRejected')).toMatchObject({
      reason: 'forcedInput',
    });
    while (sim.state.pendingInput === null) sim.step();
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [1, 3] });
    sim.enqueue({ type: 'scriptInput', id: 'other' });
    sim.applyPending();
    expect(drain(sim).flatMap((e) => (e.type === 'CommandRejected' ? [e.reason] : []))).toEqual([
      'forcedInput',
      'forcedInput',
    ]);
    expect(sim.state.pendingInput).toBe('press');
  });
});

describe('endMap (T605)', () => {
  it('ends the map won on its tick, medals settled, and nothing after it runs', () => {
    const sim = createSim(
      withEvents([
        { id: 'end', on: { wave: 1, phase: { afterSec: 1 } }, actions: [{ endMap: 'completed' }] },
        { id: 'late', on: { wave: 1, phase: { afterSec: 1 } }, actions: [{ grantCredits: 99 }] },
      ]),
    );
    sim.enqueue({ type: 'callWave' });
    while (sim.state.outcome === 'playing' && sim.state.tick < 600) sim.step();
    const events = drain(sim);
    expect(sim.state.outcome).toBe('won');
    expect(events.at(-1)).toEqual({ type: 'MapWon' });
    expect(events.filter((e) => e.type === 'MapWon')).toHaveLength(1);
    expect(sim.state.medals.victory).toBe('earned');
    expect(sim.state.tick).toBe(61); // W1 at tick 0, +1 s
    expect(sim.state.stats.creditsEarned).toBe(0); // the later event never ran
  });

  it('runs from map events only: an objective may not end the map', () => {
    const map = {
      ...compileContent(SIM_FIXTURE).maps.fx_map,
      events: [],
      objectives: [
        {
          id: 'o',
          name: 'O',
          description: 'O',
          condition: { stat: 'towersBuilt', gte: 1 },
          intel: 1,
          onComplete: [{ endMap: 'won' }],
        },
      ],
    } as unknown as CompiledMapDef;
    expect(unsupportedScript(map)).toEqual([
      "objective 'o': action endMap runs from map events only",
    ]);
  });
});

describe('the gates (T605)', () => {
  it('run the Holdout, blockers, forceInput, forcedInputResolved, and endMap', () => {
    expect(FEATURE_GATES['map.holdout']).toBeNull();
    expect(FEATURE_GATES['ally.blocker']).toBeNull();
    for (const key of ['forceInput', 'forcedInputResolved', 'endMap']) {
      expect(Object.hasOwn(SCRIPT_GATES, key), key).toBe(false);
    }
  });

  it('records no checkpoint on a Holdout (it has no defeat to retry)', () => {
    expect(checkpointAt({ act: 3, objective: 'holdout' }, 10)).toBe(false);
    expect(checkpointAt({ act: 3, objective: 'escort' }, 10)).toBe(true);
  });
});

describe('the blocker rules (T605)', () => {
  it("steps its health per wave between keys: full before the first, the last key's after", () => {
    const keys = [
      { wave: 10, pct: 0.9 },
      { wave: 13, pct: 0.25 },
      { wave: 14, pct: 0.05 },
    ];
    expect(blockerLevel(keys, 1)).toBe(1);
    expect(blockerLevel(keys, 9)).toBe(1);
    expect(blockerLevel(keys, 10)).toBe(0.9);
    expect(blockerLevel(keys, 11)).toBeCloseTo(0.9 - 0.65 / 3, 12);
    expect(blockerLevel(keys, 12)).toBeCloseTo(0.9 - (2 * 0.65) / 3, 12);
    expect(blockerLevel(keys, 13)).toBe(0.25);
    expect(blockerLevel(keys, 14)).toBe(0.05);
    expect(blockerLevel(keys, 20)).toBe(0.05);
    expect(blockerLevel([], 5)).toBe(1);
  });

  it("holds a route where it passes nearest the post, within a tile; not an air lane's", () => {
    const map = compileContent(SIM_FIXTURE).maps.fx_map;
    const road = map.routes.a!;
    // The road runs (0,0) (1,0) (2,0) then down column 2; a post at (1,1) is beside (1,0).
    expect(holdDistOn(road, 1.5, 1.5)).toBeCloseTo(1, 12);
    // Beside (2,1), the turn: nearest at 2 tiles along.
    expect(holdDistOn(road, 3.5, 1.5)).toBeCloseTo(2, 12);
    expect(holdDistOn(road, 5.5, 0.5)).toBe(-1); // too far
    expect(holdDistOn(map.routes.sky!, 3.5, 1.5)).toBe(-1); // flyers pass over
  });

  it('may hold a live ground unit only: never a boss, a flyer, a burrowed or leaving unit, or a spared one', () => {
    const map = compileContent(SIM_FIXTURE).maps.fx_map;
    const def = compileContent(SIM_FIXTURE).enemies.fx_walker;
    const unit = (over: Partial<Enemy>): Enemy =>
      ({ ...ENEMY_BLANK, alive: true, def, route: map.routes.a!, ...over }) as Enemy;
    expect(blockable(unit({}))).toBe(true);
    expect(blockable(unit({ alive: false }))).toBe(false);
    expect(blockable(unit({ burrowed: true }))).toBe(false);
    expect(blockable(unit({ leaving: true }))).toBe(false);
    expect(blockable(unit({ standDownTicks: 30 }))).toBe(false);
    expect(blockable(unit({ tags: ['fleeing'] }))).toBe(false);
    expect(blockable(unit({ route: map.routes.sky! }))).toBe(false);
    const boss = { ...def, boss: { phases: [] } } as unknown as typeof def;
    expect(blockable(unit({ def: boss }))).toBe(false);
  });

  it('counts the ticks to the next wave start: the rest of the spawning plus the countdown', () => {
    const cfg = fixtureConfig();
    const sim = createSim(cfg);
    const ctx = { map: sim.map, config: cfg };
    expect(ticksToNextWave(sim.state, ctx)).toBe(-1); // the setup
    sim.enqueue({ type: 'callWave' });
    sim.step();
    const left = ticksToNextWave(sim.state, ctx);
    const startedAt = sim.state.tick;
    while (sim.state.wave < 2) sim.step();
    // Measured after tick 0 (W1's start): W2 starts `left` ticks after it.
    expect(sim.state.schedule.startTick[1]! - (startedAt - 1)).toBe(left);
    // In the last wave, nothing is scheduled.
    expect(ticksToNextWave(sim.state, ctx)).toBe(-1);
  });
});

describe('gatedFlagDefaults (T605)', () => {
  it('opens the first door a gated group lists, under any flag the run sets', () => {
    const map = {
      escort: { groups: [{ when: { flag: 'door_choice', eq: 'convoy' } }, { when: null }] },
      builds: { flagVariants: { door_choice: ['convoy', 'warren'] } },
    } as unknown as Pick<CompiledMapDef, 'escort' | 'builds'>;
    expect(gatedFlagDefaults(map)).toEqual({ door_choice: 'convoy' });
    expect(gatedFlagDefaults(map, { door_choice: 'warren' })).toEqual({ door_choice: 'warren' });
    expect(gatedFlagDefaults(compileContent(SIM_FIXTURE).maps.fx_map)).toEqual({});
  });
});
