// Fire control (T206a; design/core-loop.md § 2.7): the holdFire and spareRunners commands and
// their global inheritance, the spare-runners filter (never *picks* a fleeing or youngling unit;
// splash still lands), the fire-control story stats and NotFiringAtSkitterkin, and the per-tag
// spawned / leaked / killed stats.
import { describe, expect, it } from 'vitest';
import type { IdSpace } from '../content/types.ts';
import {
  enemyDef,
  GUN,
  MORTAR,
  placeTower,
  setup,
  spawn,
  SPRINKLER,
  WALKER,
} from './__fixtures__/combat.ts';
import { fixtureSim } from './__fixtures__/sim.ts';
import type { Command } from './commands.ts';
import type { SimEvent as LiveSimEvent } from './events.ts';
import { isSpared, NOT_FIRING_TICKS } from './fireControl.ts';
import type { SimState } from './state.ts';
import { applyCommands } from './systems/applyCommands.ts';
import { runTick, type TickContext } from './tick.ts';

type SimEvent = LiveSimEvent<IdSpace>;
type Tagged = SimEvent & { tick: number };

/** Runs `n` ticks; returns every event they emitted, each tagged with its tick. */
function run(state: SimState, ctx: TickContext, n: number): Tagged[] {
  const out: Tagged[] = [];
  for (let i = 0; i < n; i++) {
    const tick = state.tick;
    runTick(state, ctx);
    for (const e of state.events) out.push({ ...e, tick });
    state.events.length = 0;
  }
  return out;
}

const shotsBy = (evs: readonly Tagged[], uid: number): Tagged[] =>
  evs.filter((e) => e.type === 'ProjectileFired' && e.towerUid === uid);
const firedAt = (evs: readonly Tagged[]): number[] =>
  evs.flatMap((e) => (e.type === 'ProjectileFired' ? [e.targetUid] : []));

/** Queues `cmd` and applies it now, as applyPending does; returns the events it emitted. */
function command(state: SimState, ctx: TickContext, cmd: Command<IdSpace>): SimEvent[] {
  state.pending.push(cmd);
  const before = state.events.length;
  applyCommands(state, ctx);
  return state.events.splice(before);
}

/** A Skitterkin that never moves and doesn't die, so towers have a steady target. */
const still = enemyDef('fx_still', { hp: 100000, speedTilesPerTick: 0 });
/** The same, but an Everglow unit (not a Skitterkin). */
const stillGuard = enemyDef('fx_guard', { hp: 100000, speedTilesPerTick: 0, faction: 'everglow' });

describe('holdFire', () => {
  it('per tower: stops it attacking; counts uses that turn it on, and ticks with any tower holding', () => {
    const { state, ctx } = setup();
    spawn(state, still, { dist: 2 }); // in range of both pads
    const a = placeTower(state, GUN, 1, 1);
    const b = placeTower(state, GUN, 3, 1);
    expect(command(state, ctx, { type: 'holdFire', target: a.uid, on: true })).toEqual([
      { type: 'HoldFireChanged', target: a.uid, on: true },
    ]);
    // Already on: accepted, but not a new use.
    command(state, ctx, { type: 'holdFire', target: a.uid, on: true });
    const evs = run(state, ctx, 60);
    expect(shotsBy(evs, a.uid)).toEqual([]);
    expect(shotsBy(evs, b.uid).length).toBe(2);
    expect(a.targetUid).toBe(0);
    expect(state.holdFireAll).toBe(false);
    expect(b.holdFire).toBe(false);
    expect(state.stats.holdFireUses).toBe(1);
    expect(state.stats.holdFireTicks).toBe(60);

    command(state, ctx, { type: 'holdFire', target: a.uid, on: false });
    // Its cooldown ran down while holding, so it fires the tick it's released.
    const after = run(state, ctx, 31);
    expect(shotsBy(after, a.uid).map((e) => e.tick)).toEqual([60, 90]);
    expect(state.stats.holdFireTicks).toBe(60);
  });

  it("'all': every tower and the global toggle; towers built while it's on inherit it", () => {
    const sim = fixtureSim();
    const out: LiveSimEvent[] = [];
    sim.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    sim.enqueue({ type: 'holdFire', target: 'all', on: true });
    sim.applyPending();
    sim.enqueue({ type: 'build', tile: [1, 3], tower: 'fx_gun' });
    sim.applyPending();
    sim.drainEvents(out);
    const [first, second] = sim.state.towers.items;
    expect(sim.state.holdFireAll).toBe(true);
    expect(first!.holdFire).toBe(true);
    expect(second!.holdFire).toBe(true); // inherited at build
    expect(sim.state.stats.holdFireUses).toBe(1);
    expect(out.filter((e) => e.type === 'HoldFireChanged')).toEqual([
      { type: 'HoldFireChanged', target: 'all', on: true },
    ]);
    // A per-tower release, then 'all' off: the master switch clears every tower.
    sim.enqueue({ type: 'holdFire', target: second!.uid, on: false });
    sim.applyPending();
    expect(second!.holdFire).toBe(false);
    expect(sim.state.holdFireAll).toBe(true);
    sim.enqueue({ type: 'holdFire', target: second!.uid, on: true });
    sim.enqueue({ type: 'holdFire', target: 'all', on: false });
    sim.applyPending();
    expect(sim.state.stats.holdFireUses).toBe(2);
    expect([first!.holdFire, second!.holdFire, sim.state.holdFireAll]).toEqual([
      false,
      false,
      false,
    ]);
    sim.enqueue({ type: 'build', tile: [3, 1], tower: 'fx_gun' });
    sim.applyPending();
    expect(sim.state.towers.items[2]!.holdFire).toBe(false);
  });

  it('rejects an unknown tower (noSuchTower), counting nothing', () => {
    const { state, ctx } = setup();
    const evs = command(state, ctx, { type: 'holdFire', target: 99, on: true });
    expect(evs).toMatchObject([{ type: 'CommandRejected', reason: 'noSuchTower' }]);
    expect(state.stats.holdFireUses).toBe(0);
  });

  it('applies while paused (applyPending) and is in the command log', () => {
    const sim = fixtureSim();
    sim.enqueue({ type: 'holdFire', target: 'all', on: true });
    sim.applyPending();
    expect(sim.state.holdFireAll).toBe(true);
    expect(sim.state.tick).toBe(0);
    expect(sim.state.commandLog.map((e) => e.cmd.type)).toEqual(['holdFire']);
  });

  it('a holding pulse tower does not pulse; holding with no towers counts no ticks', () => {
    const { state, ctx } = setup();
    command(state, ctx, { type: 'holdFire', target: 'all', on: true });
    run(state, ctx, 10);
    expect(state.stats.holdFireTicks).toBe(0);
    spawn(state, still);
    const s = placeTower(state, SPRINKLER, 1, 1);
    command(state, ctx, { type: 'holdFire', target: s.uid, on: true });
    expect(shotsBy(run(state, ctx, 120), s.uid)).toEqual([]);
    expect(state.stats.holdFireTicks).toBe(120);
  });
});

describe('spareRunners', () => {
  it("per tower and 'all', with events; towers built while the global toggle is on inherit it", () => {
    const sim = fixtureSim();
    const out: LiveSimEvent[] = [];
    sim.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
    sim.applyPending();
    const first = sim.state.towers.items[0]!;
    sim.enqueue({ type: 'spareRunners', target: first.uid, on: true });
    sim.applyPending();
    expect(first.spareRunners).toBe(true);
    expect(sim.state.spareRunnersAll).toBe(false);
    sim.enqueue({ type: 'spareRunners', target: 'all', on: true });
    sim.enqueue({ type: 'build', tile: [1, 3], tower: 'fx_gun' });
    sim.applyPending();
    expect(sim.state.towers.items[1]!.spareRunners).toBe(true);
    sim.enqueue({ type: 'spareRunners', target: 'all', on: false });
    sim.enqueue({ type: 'spareRunners', target: 42, on: true });
    sim.applyPending();
    expect(sim.state.towers.items.slice(0, 2).map((t) => t.spareRunners)).toEqual([false, false]);
    sim.drainEvents(out);
    expect(out.filter((e) => e.type === 'SpareRunnersChanged')).toEqual([
      { type: 'SpareRunnersChanged', target: first.uid, on: true },
      { type: 'SpareRunnersChanged', target: 'all', on: true },
      { type: 'SpareRunnersChanged', target: 'all', on: false },
    ]);
    expect(out.filter((e) => e.type === 'CommandRejected')).toMatchObject([
      { reason: 'noSuchTower' },
    ]);
    // The filter is not Hold Fire.
    expect(sim.state.stats.holdFireUses).toBe(0);
  });
});

describe('the spare-runners filter (core-loop.md § Spare runners)', () => {
  it('spares fleeing and youngling units only', () => {
    expect(isSpared(['fleeing'])).toBe(true);
    expect(isSpared(['youngling', 'quiet_wave'])).toBe(true);
    expect(isSpared(['quiet_wave'])).toBe(false);
    expect(isSpared(['medal_exempt'])).toBe(false);
    expect(isSpared([])).toBe(false);
  });

  it('never picks a spared unit: it takes the next by priority, or waits', () => {
    for (const tag of ['fleeing', 'youngling'] as const) {
      const { state, ctx } = setup();
      const runner = spawn(state, still, { dist: 2, tags: [tag] }); // ahead: First would pick it
      const t = placeTower(state, GUN, 1, 1);
      t.spareRunners = true;
      let evs = run(state, ctx, 60);
      expect(firedAt(evs)).toEqual([]); // nothing else to shoot: it waits
      const walker = spawn(state, still, { dist: 1 });
      evs = run(state, ctx, 60);
      expect(new Set(firedAt(evs))).toEqual(new Set([walker.uid]));
      expect(runner.hp).toBe(still.hp);
      // Without the filter, First picks the runner ahead.
      t.spareRunners = false;
      evs = run(state, ctx, 31);
      expect(firedAt(evs)).toContain(runner.uid);
    }
  });

  it('a quiet_wave unit is not spared by the filter (Hold Fire is the tool for it)', () => {
    const { state, ctx } = setup();
    const quiet = spawn(state, still, { tags: ['quiet_wave'] });
    placeTower(state, GUN, 1, 1).spareRunners = true;
    expect(firedAt(run(state, ctx, 1))).toEqual([quiet.uid]);
  });

  it('drops a spared target it was keeping when the filter turns on mid-cooldown', () => {
    const { state, ctx } = setup();
    const runner = spawn(state, still, { dist: 2, tags: ['fleeing'] });
    const t = placeTower(state, GUN, 1, 1);
    run(state, ctx, 1);
    expect(t.targetUid).toBe(runner.uid);
    t.spareRunners = true;
    run(state, ctx, 1);
    expect(t.targetUid).toBe(0);
  });

  it('splash still lands on spared units next to the target', () => {
    const { state, ctx } = setup();
    const walker = spawn(state, still, { dist: 4 });
    const runner = spawn(state, still, { dist: 4.3, tags: ['fleeing'] });
    const m = placeTower(state, MORTAR, 3, 1);
    m.spareRunners = true;
    const evs = run(state, ctx, 60);
    expect(firedAt(evs)).toEqual([walker.uid]);
    expect(walker.hp).toBeLessThan(still.hp);
    expect(runner.hp).toBeLessThan(still.hp);
  });

  it('a pulse waits while only spared units are in range, and hits them when it pulses for another', () => {
    const { state, ctx } = setup();
    const runner = spawn(state, still, { tags: ['youngling'] });
    const s = placeTower(state, SPRINKLER, 1, 1);
    s.spareRunners = true;
    expect(shotsBy(run(state, ctx, 60), s.uid)).toEqual([]);
    expect(runner.hp).toBe(still.hp);
    spawn(state, still, { dist: 0.5 });
    expect(shotsBy(run(state, ctx, 1), s.uid).length).toBe(1);
    expect(runner.hp).toBeLessThan(still.hp);
  });
});

describe('"not firing" (core-loop.md § 6.3)', () => {
  it('is 10 s', () => {
    expect(NOT_FIRING_TICKS).toBe(600);
  });

  it('counts while a Skitterkin is in range and no tower fires at one; fires the event once per run', () => {
    const { state, ctx } = setup();
    const t = placeTower(state, GUN, 1, 1);
    t.holdFire = true;
    run(state, ctx, 30);
    expect(state.stats.ticksSinceFiredAtSkitterkin).toBe(0); // nothing in range: frozen
    spawn(state, still);
    let evs = run(state, ctx, NOT_FIRING_TICKS);
    expect(state.stats.ticksSinceFiredAtSkitterkin).toBe(NOT_FIRING_TICKS);
    const notFiring = (es: readonly Tagged[]): number[] =>
      es.flatMap((e) => (e.type === 'NotFiringAtSkitterkin' ? [e.tick] : []));
    expect(notFiring(evs)).toEqual([30 + NOT_FIRING_TICKS - 1]);
    // A shot at a Skitterkin resets it.
    t.holdFire = false;
    run(state, ctx, 1);
    expect(state.stats.ticksSinceFiredAtSkitterkin).toBe(0);
    // Holding again for another 10 s: the count climbs, the event doesn't repeat.
    t.holdFire = true;
    evs = run(state, ctx, NOT_FIRING_TICKS + 10);
    expect(state.stats.ticksSinceFiredAtSkitterkin).toBe(NOT_FIRING_TICKS + 10);
    expect(notFiring(evs)).toEqual([]);
    expect(state.notFiringAnnounced).toBe(true);
  });

  it('only Skitterkin count, and only in range of a tower', () => {
    const { state, ctx } = setup();
    placeTower(state, GUN, 1, 1).holdFire = true;
    spawn(state, stillGuard);
    spawn(state, WALKER, { dist: 8.5 }); // near the core, out of the gun's range
    run(state, ctx, 20);
    expect(state.stats.ticksSinceFiredAtSkitterkin).toBe(0);
  });

  it('firing at a non-Skitterkin does not reset it; a pulse that hits a Skitterkin does', () => {
    const { state, ctx } = setup();
    spawn(state, stillGuard, { dist: 3 }); // ahead: the gun picks it
    spawn(state, still, { dist: 2 });
    placeTower(state, GUN, 1, 1);
    run(state, ctx, 40);
    expect(state.stats.ticksSinceFiredAtSkitterkin).toBe(40);
    placeTower(state, SPRINKLER, 3, 1);
    run(state, ctx, 1);
    expect(state.stats.ticksSinceFiredAtSkitterkin).toBe(0);
  });
});

describe('per-tag stats', () => {
  it('count spawns, leaks, and kills per wave tag', () => {
    // fx_map W2: 2 walkers and 4 fleeing runners. With no towers every unit leaks.
    const sim = fixtureSim();
    sim.enqueue({ type: 'callWave' });
    while (sim.state.outcome === 'playing') sim.step();
    expect(sim.state.stats.tagSpawned).toEqual({
      quiet_wave: 0,
      youngling: 0,
      fleeing: 4,
      medal_exempt: 0,
    });
    expect(sim.state.stats.tagLeaked.fleeing).toBe(4);
    expect(sim.state.stats.tagKilled.fleeing).toBe(0);
  });

  it('a kill by any source counts toward every tag the unit carries', () => {
    const { state, ctx } = setup();
    spawn(state, WALKER, { tags: ['quiet_wave', 'youngling'] });
    spawn(state, WALKER, { dist: 0.2, tags: ['fleeing'] });
    placeTower(state, GUN, 1, 1, 3);
    placeTower(state, GUN, 1, 3, 3);
    run(state, ctx, 120);
    expect(state.stats.tagKilled).toEqual({
      quiet_wave: 1,
      youngling: 1,
      fleeing: 1,
      medal_exempt: 0,
    });
    expect(state.stats.tagLeaked.fleeing).toBe(0);
  });
});
