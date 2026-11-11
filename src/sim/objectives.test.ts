// Optional objectives (T304f): Clean Audit's late sell (the ruling: a wave has started since the
// tower was built, and it isn't a misclick-grace refund), settling at once or at the win tick, a
// loss failing what's open, onComplete actions, the ObjectiveProgress events, and the run-end ids.
import { describe, expect, it } from 'vitest';
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import type { IdSpace, MapDef, ObjectiveDef, RawContent } from '../content/types.ts';
import { secToTicks } from '../shared/time.ts';
import { placeTower } from './__fixtures__/combat.ts';
import { SIM_FIXTURE, fixtureConfig } from './__fixtures__/sim.ts';
import type { SimEvent } from './events.ts';
import {
  completedObjectiveIds,
  isLateSell,
  objectiveStatusById,
  settleObjectivesLoss,
} from './objectives.ts';
import { createSim, type Sim } from './sim.ts';
import { createState, type SimState } from './state.ts';
import { cleanup } from './systems/cleanup.ts';
import { unsupportedScript } from './systems/triggers.ts';
import { createScratch, type TickContext } from './tick.ts';

const RAW: RawContent<IdSpace> = SIM_FIXTURE;

const CLEAN_AUDIT: ObjectiveDef<IdSpace> = {
  id: 'clean_audit',
  name: 'Clean Audit',
  description: 'Sell no turret after its build phase.',
  condition: { stat: 'lateSells', lte: 0 },
  intel: 1,
};

/** fx_map with these objectives. */
function contentWith(objectives: readonly ObjectiveDef<IdSpace>[]): CompiledContent<IdSpace> {
  const fx: MapDef<IdSpace> = { ...RAW.maps.fx_map!, objectives };
  return compileContent({ ...RAW, maps: { fx_map: fx } });
}

function simWith(objectives: readonly ObjectiveDef<IdSpace>[]): Sim<IdSpace> {
  return createSim<IdSpace>({ ...fixtureConfig(), content: contentWith(objectives) });
}

function run(sim: Sim<IdSpace>, ticks: number, events: SimEvent<IdSpace>[] = []): void {
  for (let i = 0; i < ticks; i++) {
    sim.step();
    sim.drainEvents(events);
  }
}

/** Builds fx_gun at (1,1) and returns its uid. */
function build(sim: Sim<IdSpace>): number {
  sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [1, 1] });
  run(sim, 1);
  const t = sim.state.towers.items.find((x) => x.alive);
  if (t === undefined) throw new Error('no tower');
  return t.uid;
}

const progress = (events: readonly SimEvent<IdSpace>[]): SimEvent<IdSpace>[] =>
  events.filter((e) => e.type === 'ObjectiveProgress' || e.type === 'MapWon');

function setup(objectives: readonly ObjectiveDef<IdSpace>[]): {
  state: SimState;
  ctx: TickContext;
  map: CompiledMapDef<IdSpace>;
} {
  const content = contentWith(objectives);
  const map = content.maps.fx_map!;
  return {
    state: createState(map, 1),
    ctx: { content, map, config: { ...fixtureConfig(), content }, scratch: createScratch() },
    map,
  };
}

describe('Clean Audit: late sells', () => {
  it('selling in the build phase it was built in is free, even after the misclick grace', () => {
    const sim = simWith([CLEAN_AUDIT]);
    const uid = build(sim);
    run(sim, secToTicks(12)); // past the 10 s grace; wave 1 hasn't started (setup)
    sim.enqueue({ type: 'sell', towerUid: uid });
    run(sim, 1);
    expect(sim.state.stats.lateSells).toBe(0);
    expect(sim.state.objectives).toEqual(['open']);
  });

  it('a sell once a wave has started since the build is late, and fails the objective at once', () => {
    const sim = simWith([CLEAN_AUDIT]);
    const uid = build(sim);
    sim.enqueue({ type: 'callWave' });
    run(sim, secToTicks(11)); // past the grace, wave 1 under way
    const events: SimEvent<IdSpace>[] = [];
    sim.enqueue({ type: 'sell', towerUid: uid });
    run(sim, 1, events);
    expect(sim.state.stats.lateSells).toBe(1);
    expect(sim.state.objectives).toEqual(['failed']);
    expect(progress(events)).toEqual([
      { type: 'ObjectiveProgress', id: 'clean_audit', status: 'failed' },
    ]);
  });

  it('a misclick-grace refund after a wave start is never a sale', () => {
    const sim = simWith([CLEAN_AUDIT]);
    sim.enqueue({ type: 'callWave' });
    run(sim, 1);
    // Built just before the next wave starts, sold inside the grace before it fires.
    const uid = build(sim);
    const t = sim.state.towers.items.find((x) => x.uid === uid)!;
    const later = { ...sim.state, wave: 2, tick: t.builtTick + 60 };
    later.schedule = { ...sim.state.schedule, startTick: [0, t.builtTick + 30] };
    expect(isLateSell(t, later)).toBe(false); // full refund: not a sale
    expect(isLateSell({ ...t, firstFiredTick: t.builtTick + 1 }, later)).toBe(true);
    // A wave starting on the build tick doesn't make it late (commands apply first).
    later.schedule = { ...sim.state.schedule, startTick: [0, t.builtTick] };
    expect(isLateSell({ ...t, firstFiredTick: t.builtTick + 1 }, later)).toBe(false);
  });

  it('nothing is late before wave 1', () => {
    const { state } = setup([]);
    expect(isLateSell({ invested: 100, builtTick: 0, firstFiredTick: 5 }, state)).toBe(false);
  });
});

describe('settling objectives', () => {
  it('a win completes an open objective on the win tick, before MapWon', () => {
    const { state, ctx, map } = setup([CLEAN_AUDIT]);
    state.schedule.startTick.fill(0);
    state.schedule.remaining.fill(0);
    cleanup(state, ctx);
    expect(state.outcome).toBe('won');
    expect(state.objectives).toEqual(['done']);
    expect(progress(state.events)).toEqual([
      { type: 'ObjectiveProgress', id: 'clean_audit', status: 'done' },
      { type: 'MapWon' },
    ]);
    expect(completedObjectiveIds(state, map)).toEqual(['clean_audit']);
    expect(objectiveStatusById(state, map)).toEqual({ clean_audit: 'done' });
  });

  it('a state condition is judged at the win tick', () => {
    const one: ObjectiveDef<IdSpace> = {
      id: 'one_gun',
      name: 'One Gun',
      description: 'Win with exactly one turret.',
      condition: { towers: {}, lte: 1, gte: 1 },
      intel: 1,
    };
    const { state, ctx, map } = setup([one]);
    state.schedule.startTick.fill(0);
    state.schedule.remaining.fill(0);
    cleanup(state, ctx);
    expect(state.objectives).toEqual(['failed']); // no turret on the field
    expect(completedObjectiveIds(state, map)).toEqual([]);
  });

  it('a loss fails every open objective; a settled one stays settled', () => {
    const { state, map } = setup([CLEAN_AUDIT]);
    settleObjectivesLoss(state, map);
    expect(state.objectives).toEqual(['failed']);
    const { state: s2, ctx: c2 } = setup([CLEAN_AUDIT]);
    s2.integrity = 0;
    cleanup(s2, c2);
    expect(s2.outcome).toBe('lost');
    expect(s2.objectives).toEqual(['failed']);
  });

  it('an objective that settles true mid-run completes at once and runs its onComplete', () => {
    const builder: ObjectiveDef<IdSpace> = {
      id: 'builder',
      name: 'Builder',
      description: 'Build a turret.',
      condition: { stat: 'towersBuilt', gte: 1 },
      intel: 1,
      onComplete: [{ grantCredits: 25 }],
    };
    const sim = simWith([builder]);
    const before = sim.state.credits;
    const events: SimEvent<IdSpace>[] = [];
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [1, 1] });
    run(sim, 1, events);
    expect(sim.state.objectives).toEqual(['done']);
    expect(sim.state.credits).toBe(before - 100 + 25);
    expect(progress(events)).toEqual([
      { type: 'ObjectiveProgress', id: 'builder', status: 'done' },
    ]);
  });

  it('a map without objectives has none to settle', () => {
    const { state, ctx } = setup([]);
    placeTower(state, ctx.content.towers.fx_gun!, 1, 1);
    state.schedule.startTick.fill(0);
    state.schedule.remaining.fill(0);
    cleanup(state, ctx);
    expect(state.objectives).toEqual([]);
    expect(progress(state.events)).toEqual([{ type: 'MapWon' }]);
  });

  it('createSim refuses an onComplete action the sim cannot run', () => {
    const map = contentWith([{ ...CLEAN_AUDIT, onComplete: [{ restAll: true }] }]).maps.fx_map!;
    expect(unsupportedScript(map)).toEqual([
      "objective 'clean_audit': action restAll runs from map events only",
    ]);
  });
});
