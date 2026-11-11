// dev_holdout (T605; devM6.ts): the Holdout end to end. Bricks blocks up to 2 non-boss ground
// units at a time and lets go as they die; his health follows the wave timeline only (0.6 as W2
// starts, the 5% floor as W3 starts, easing between); W3's start forces the SEAL, which freezes
// waves, movement, and fire while the sim keeps ticking, rejects every other command, and ends the
// map won on its press; both doors (`door_choice`) walk; there are no checkpoints and no defeat.
// The smoke flow (smoke/holdout.spec.ts) counts on all of it.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import {
  BLOCK_FRONT_TILES,
  blockerLevel,
  createBuildExecutor,
  createSim,
  runHeadless,
  type Sim,
  type SimConfig,
  type SimEvent,
} from '../../sim/index.ts';

const MAP = 'dev_holdout';

function config(door: 'convoy' | 'warren' = 'convoy', over: Partial<SimConfig<IdSpace>> = {}) {
  const cfg = battleConfig(MAP, 1);
  return { ...cfg, scriptFlags: { door_choice: door }, ...over };
}

/** Steps `sim` (with par's executor when given) until `until` holds; returns the events. */
function play(
  sim: Sim<IdSpace>,
  until: () => boolean,
  exec: { beforeTick(): void } | null = null,
  max = 60 * 120,
): SimEvent<IdSpace>[] {
  const all: SimEvent<IdSpace>[] = [];
  const out: SimEvent<IdSpace>[] = [];
  for (let i = 0; i < max && !until() && sim.state.outcome === 'playing'; i++) {
    exec?.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    all.push(...out);
  }
  return all;
}

const bricksOf = (sim: Sim<IdSpace>) =>
  sim.state.allies.items.find((a) => a.alive && a.kind === 'bricks')!; // spawned on tick 0

describe('dev_holdout: the Holdout (T605)', () => {
  it('par ends on the SEAL, pressed by its scriptInput step, as won; deterministic', () => {
    const par = battleConfig(MAP, 1).content.maps[MAP]!.builds.parBuild;
    const a = runHeadless(config(), par);
    const b = runHeadless(config(), par);
    expect(b.hash).toBe(a.hash);
    expect(a.outcome).toBe('won');
    expect(a.forcedInputs).toEqual(['seal']);
    expect(a.violations).toEqual([]);
    const press = a.steps.find((s) => s.kind === 'scriptInput')!;
    expect(press.error).toBeNull();
    // Pressed the tick after W3's start forced it; the map ends on that tick.
    const w3 = a.waves[2]!.startTick;
    expect(press.issuedTick).toBe(w3 + 1);
    expect(a.ticks).toBe(w3 + 2);
    expect(a.integrity).toBe(a.maxIntegrity);
  });

  it('walks each door under its door_choice (both doors), and its group alone counts', () => {
    const par = battleConfig(MAP, 1).content.maps[MAP]!.builds.parBuild;
    for (const door of ['convoy', 'warren'] as const) {
      const sim = createSim(config(door));
      expect(sim.state.refugeeTotal).toBe(6);
      const exec = createBuildExecutor(sim, par);
      const events = play(sim, () => false, exec);
      expect(sim.state.outcome).toBe('won');
      const spawned = events.filter((e) => e.type === 'AllySpawned' && e.kind === 'refugee');
      expect(spawned).toHaveLength(6);
      expect(sim.state.stats.evacuated + sim.state.stats.refugeesLost).toBe(6);
      // The open door's group walks, from its own side of the map.
      const exitX = door === 'convoy' ? 2.5 : 10.5;
      const startX = door === 'convoy' ? 0.5 : 13.5;
      expect(spawned.every((e) => e.type === 'AllySpawned' && e.x === startX)).toBe(true);
      expect(sim.map.escort!.groups.find((g) => g.id === door)!.exitTile[0] + 0.5).toBe(exitX);
    }
  });

  it("Bricks's health follows the timeline only: each wave starts on its level, to the 5% floor", () => {
    // Standard, and Story's longer countdowns (the ease stretches to arrive on time).
    for (const modifiers of [[], [{ kind: 'countdown' as const, pct: 0.5 }]]) {
      const sim = createSim(config('convoy', { modifiers }));
      const keys = sim.map.allies[0]!.block!.health;
      expect([1, 2, 3].map((w) => blockerLevel(keys, w))).toEqual([1, 0.6, 0.05]);
      sim.enqueue({ type: 'callWave' });
      sim.step(); // posts spawn on tick 0
      expect(bricksOf(sim)).toMatchObject({ vulnerability: 'scripted', blockCapacity: 2 });
      let last = 1;
      let wave = 0;
      const atStart: number[] = [];
      for (let i = 0; i < 60 * 120 && sim.state.pendingInput === null; i++) {
        if (sim.state.wave !== wave) {
          wave = sim.state.wave;
          atStart.push(bricksOf(sim).health);
        }
        sim.step();
        const h = bricksOf(sim).health;
        expect(h).toBeLessThanOrEqual(last + 1e-12); // never rises
        expect(h).toBeGreaterThanOrEqual(0.05);
        last = h;
      }
      atStart.push(bricksOf(sim).health); // W3's start: the SEAL froze it there
      expect(sim.state).toMatchObject({ wave: 3, pendingInput: 'seal' });
      expect(atStart[1]).toBe(1); // W1 starts full
      expect(atStart[2]).toBeCloseTo(0.6, 12); // W2
      expect(atStart.at(-1)).toBe(0.05); // W3, as the SEAL fires: the floor
    }
  });

  it('blocks at most 2 ground units at a time in front of the post; they stand still, then release as they die', () => {
    // No towers: Bricks fights alone, so his hold stays full while Motes queue past.
    const sim = createSim(config('convoy'));
    sim.enqueue({ type: 'callWave' });
    let maxHeld = 0;
    let sawFull = false;
    const stillDist = new Map<number, number>();
    const out: SimEvent<IdSpace>[] = [];
    let ons = 0;
    let offs = 0;
    for (let i = 0; i < 60 * 40 && sim.state.wave < 2; i++) {
      sim.step();
      out.length = 0;
      sim.drainEvents(out);
      for (const e of out) {
        if (e.type !== 'Blocked') continue;
        if (e.on) ons++;
        else offs++;
      }
      const b = bricksOf(sim);
      let held = 0;
      for (const e of sim.state.enemies.items) {
        if (!e.alive || e.blockerUid === 0) continue;
        held++;
        expect(e.blockerUid).toBe(b.uid);
        // Taken in front of him (his post is beside (6,3): 3 tiles down the road).
        expect(e.dist).toBeGreaterThanOrEqual(3 - BLOCK_FRONT_TILES - 1e-9);
        expect(e.dist).toBeLessThanOrEqual(3 + 1e-6);
        const was = stillDist.get(e.uid);
        if (was !== undefined) expect(e.dist).toBe(was);
        stillDist.set(e.uid, e.dist);
      }
      expect(held).toBe(b.blocking);
      maxHeld = Math.max(maxHeld, held);
      if (held === 2) sawFull = true;
    }
    expect(maxHeld).toBe(2);
    expect(sawFull).toBe(true);
    expect(ons).toBeGreaterThan(2); // a freed place is taken again
    expect(offs).toBeGreaterThanOrEqual(0);
  });

  it('the SEAL freezes waves, movement, and fire while the sim ticks; only its press applies', () => {
    const cfg = config();
    const par = cfg.content.maps[MAP]!.builds.parBuild;
    const sim = createSim(cfg);
    // Par's builds, but no press.
    const exec = createBuildExecutor(sim, {
      ...par,
      steps: par.steps.filter((s) => s.kind !== 'scriptInput'),
    });
    const events = play(sim, () => sim.state.pendingInput !== null, exec);
    expect(events.filter((e) => e.type === 'ForcedInputRequested')).toEqual([
      { type: 'ForcedInputRequested', id: 'seal' },
    ]);
    const snap = () => ({
      wave: sim.state.wave,
      schedule: JSON.stringify(sim.state.schedule),
      credits: sim.state.credits,
      enemies: sim.state.enemies.items.filter((e) => e.alive).map((e) => [e.uid, e.dist, e.hp]),
      towers: sim.state.towers.items.filter((t) => t.alive).map((t) => [t.uid, t.cooldownTicks]),
      allies: sim.state.allies.items.filter((a) => a.alive).map((a) => [a.uid, a.dist, a.health]),
      evacuated: sim.state.stats.evacuated,
    });
    const before = snap();
    const tick = sim.state.tick;
    const quiet = play(sim, () => false, null, 600);
    expect(sim.state.tick).toBe(tick + 600);
    expect(snap()).toEqual(before);
    expect(quiet).toEqual([]);
    // Every other command is rejected; a press of another id too.
    sim.enqueue({ type: 'callWave' });
    sim.enqueue({ type: 'build', tower: 'rivet', tile: [8, 2] });
    sim.enqueue({ type: 'scriptInput', id: 'nope' });
    sim.applyPending();
    const out: SimEvent<IdSpace>[] = [];
    sim.drainEvents(out);
    expect(out.map((e) => (e.type === 'CommandRejected' ? e.reason : e.type))).toEqual([
      'forcedInput',
      'forcedInput',
      'forcedInput',
    ]);
    // The press: resolved, and the map ends won on the next tick.
    sim.enqueue({ type: 'scriptInput', id: 'seal' });
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    expect(out.map((e) => e.type)).toEqual(['ForcedInputResolved', 'MapWon']);
    expect(sim.state).toMatchObject({
      outcome: 'won',
      pendingInput: null,
      forcedResolved: ['seal'],
    });
    expect(sim.state.medals.victory).toBe('earned');
    // The command log keeps everything, in order (replays see the moment).
    expect(sim.state.commandLog.at(-1)?.cmd).toEqual({ type: 'scriptInput', id: 'seal' });
  });

  it('has no checkpoints and no defeat: leaks at a door take a sheltered refugee, never integrity', () => {
    const sim = createSim(config('warren'));
    sim.enqueue({ type: 'callWave' });
    const events = play(sim, () => sim.state.pendingInput !== null);
    expect(events.some((e) => e.type === 'CheckpointReached')).toBe(false);
    expect(events.some((e) => e.type === 'MapLost')).toBe(false);
    expect(sim.state.integrity).toBe(sim.state.maxIntegrity);
    const leaks = events.filter((e) => e.type === 'EnemyLeaked');
    expect(leaks.length).toBeGreaterThan(0); // no towers: Motes reach the doors
    expect(leaks.every((e) => e.type === 'EnemyLeaked' && e.leak === 0)).toBe(true);
    expect(sim.state.outcome).toBe('playing');
  });

  it('replays from its command log to the same hash (a press while paused included)', () => {
    const sim = createSim(config());
    sim.enqueue({ type: 'callWave' });
    play(sim, () => sim.state.pendingInput !== null);
    for (let i = 0; i < 37; i++) sim.step(); // a player who waits
    sim.enqueue({ type: 'scriptInput', id: 'seal' });
    sim.applyPending(); // pressed while paused
    sim.step();
    expect(sim.state.outcome).toBe('won');
    const replay = createSim(config());
    const log = sim.state.commandLog;
    let k = 0;
    while (replay.state.outcome === 'playing' && replay.state.tick < 60 * 600) {
      while (k < log.length && log[k]!.tick === replay.state.tick) replay.enqueue(log[k++]!.cmd);
      replay.step();
    }
    expect(replay.hash()).toBe(sim.hash());
  });
});
