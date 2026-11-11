// T806 on dev_bore (devPhases.ts): the Deep Bore (Purge's 75%, the breakthrough, its boss bonus),
// Phase 2's 'halls' checkpoint and its own clock, Dawn's light and the dark it lifts, and the
// determinism of a replay whose log prefix ends inside Phase 2, after the checkpoint.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace, MapDef, RawContent } from '../../content/types.ts';
import { validate } from '../../content/validate.ts';
import { createBuildExecutor } from '../../sim/headless.ts';
import {
  createSim,
  type Command,
  type Sim,
  type SimConfig,
  type SimEvent,
} from '../../sim/index.ts';
import { DEV_CONTENT, type DevIds } from './devBattle.ts';
import { boreMap } from './devPhases.ts';

const DEV = compileContent(DEV_CONTENT);

function config(quill: string, content: typeof DEV = DEV): SimConfig<IdSpace> {
  const map: CompiledMapDef<IdSpace> = content.maps.dev_bore;
  return {
    content,
    mapId: 'dev_bore',
    seed: 1,
    loadout: map.builds.parBuild.loadout,
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: {
      slot1: map.builds.referenceProfile.technicianAbility,
      slot2: null,
      slot2State: 'none',
    },
    specsUnlocked: [],
    scriptFlags: { quill_choice: quill },
  };
}

/** dev_bore with `patch` (its other maps left out), compiled. */
function patched(patch: Partial<MapDef<DevIds>>): typeof DEV {
  const maps = { ...DEV_CONTENT.maps, dev_bore: { ...boreMap, ...patch } };
  const raw: RawContent<DevIds> = { ...DEV_CONTENT, maps };
  return compileContent(raw);
}

interface Run {
  readonly sim: Sim<IdSpace>;
  /** Every event, with the tick it was drained after (the tick just run). */
  readonly events: (SimEvent<IdSpace> & { readonly at: number })[];
  /** The hash after each tick in `hashAt` (the sim's `state.tick` then). */
  readonly hashes: Map<number, string>;
}

/**
 * Plays dev_bore's par build until the map ends (or `until`), hashing at the ticks asked, and
 * enqueuing `extra` commands before the ticks they name.
 */
function play(
  cfg: SimConfig<IdSpace>,
  hashAt: readonly number[] = [],
  until = 60 * 60 * 5,
  extra: ReadonlyMap<number, Command<IdSpace>> = new Map(),
): Run {
  const sim = createSim(cfg);
  const exec = createBuildExecutor(sim, sim.map.builds.parBuild);
  const events: Run['events'] = [];
  const hashes = new Map<number, string>();
  const out: SimEvent<IdSpace>[] = [];
  while (sim.state.outcome === 'playing' && sim.state.tick < until) {
    exec.beforeTick();
    const at = sim.state.tick;
    const cmd = extra.get(at);
    if (cmd !== undefined) sim.enqueue(cmd);
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) events.push({ ...e, at });
    if (hashAt.includes(sim.state.tick)) hashes.set(sim.state.tick, sim.hash());
  }
  return { sim, events, hashes };
}

/** The first event of `type`, or undefined. */
function first<T extends SimEvent<IdSpace>['type']>(run: Run, type: T) {
  return run.events.find((e): e is Extract<Run['events'][number], { type: T }> => e.type === type);
}

/** A fresh sim from `cfg` replaying `log`'s commands below `tick`, stepped to `tick`. */
function replay(
  cfg: SimConfig<IdSpace>,
  log: Run['sim']['state']['commandLog'],
  tick: number,
): Sim<IdSpace> {
  const sim = createSim(cfg);
  let i = 0;
  while (sim.state.tick < tick) {
    while (i < log.length && log[i]!.tick === sim.state.tick) sim.enqueue(log[i++]!.cmd);
    sim.step();
  }
  return sim;
}

describe('dev_bore (T806)', () => {
  it('validates and runs: no part of its script is refused', () => {
    expect(validate(DEV_CONTENT).filter((e) => e.includes('dev_bore'))).toEqual([]);
    expect(() => createSim(config('keep'))).not.toThrow();
  });

  it('compiles its sky-only key; a sky-only key carries no dark ([darkness])', () => {
    expect(DEV.maps.dev_bore.lighting).toEqual([
      { wave: 1, env: 'act3', dark: 0.6, skyOnly: false },
      { wave: 2, env: 'finale', dark: 0, skyOnly: true },
    ]);
    const lighting = [
      { wave: 1, env: 'act3', dark: 0.6 },
      { wave: 2, env: 'finale', skyOnly: true, dark: 0.6 },
    ] as const;
    const maps = { ...DEV_CONTENT.maps, dev_bore: { ...boreMap, lighting } };
    expect(validate({ ...DEV_CONTENT, maps }).filter((e) => e.startsWith('[darkness]'))).toEqual([
      '[darkness] maps.dev_bore.lighting[1].dark: a sky-only key carries no dark (the darkness skips it)',
    ]);
  });

  it('the Bore fills from W1 and stops at the Halls, fixing +5% boss HP per whole 10%', () => {
    const run = play(config('keep'));
    const { sim } = run;
    const map = sim.map;
    const fillTicks = map.timers[0]!.fillTicks;
    expect(fillTicks).toBe(24 * 60);
    const w1 = run.events.find((e) => e.type === 'WaveStarted' && e.wave === 1)!;
    const phase2 = first(run, 'PhaseChanged')!;
    expect(phase2.phase).toBe(2);
    // It fills one tick per tick from W1's start tick (the triggers start it after this tick's
    // timers pass) up to the tick Phase 2 stops it.
    const t = sim.state.timers[0]!;
    expect(t.filled).toBe(phase2.at - w1.at);
    expect(t.running).toBe(true);
    expect(t.full).toBe(false);
    expect(t.ratePct).toBe(0);
    const tenths = Math.floor((10 * t.filled) / fillTicks);
    expect(t.bossHpPct).toBe(Math.round(tenths * 0.05 * 1e9) / 1e9);
    expect(t.bossHpPct).toBeGreaterThan(0);
    expect(sim.state.stats.boreProgress).toBe(Math.floor((100 * t.filled) / fillTicks));
    expect(first(run, 'TimerFull')).toBeUndefined();
    // W3's boss spawns after it stopped: its max HP carries the bonus.
    const boss = sim.state.enemies.items.find((e) => e.def?.id === 'dev_chitterbloom')!;
    expect(boss.def!.hp).toBeCloseTo(200 * (1 + t.bossHpPct), 9);
  });

  it('runs at 75% under Purge (an event `when` the flag is purge)', () => {
    const keep = play(config('keep'));
    const purge = play(config('purge'));
    const w1 = purge.events.find((e) => e.type === 'WaveStarted' && e.wave === 1)!;
    const phase2 = first(purge, 'PhaseChanged')!;
    expect(purge.sim.state.timers[0]!.filled).toBeCloseTo(0.75 * (phase2.at - w1.at), 9);
    expect(purge.sim.state.stats.boreProgress).toBeLessThan(keep.sim.state.stats.boreProgress);
  });

  it('full before the Halls, it breaks through (spawnWave) and holds full: +50% boss HP', () => {
    const run = play(
      config('keep', patched({ timers: { deep_bore: { fillSec: 5, bossHpPerTenth: 0.05 } } })),
    );
    const full = first(run, 'TimerFull')!;
    expect(full.id).toBe('deep_bore');
    const w1 = run.events.find((e) => e.type === 'WaveStarted' && e.wave === 1)!;
    // Started by W1's start trigger, it fills from the next tick: full 300 ticks on.
    expect(full.at - w1.at).toBe(5 * 60);
    // The `{ timerFull }` trigger fires on the same tick: the timers run before the triggers.
    const surge = first(run, 'ScriptGroupSpawned')!;
    expect([surge.id, surge.at]).toEqual(['breakthrough', full.at]);
    const t = run.sim.state.timers[0]!;
    expect([t.full, t.filled, t.bossHpPct]).toEqual([true, 300, 0.5]);
    expect(run.sim.state.stats.boreProgress).toBe(100);
    expect(run.events.filter((e) => e.type === 'TimerFull')).toHaveLength(1);
    const boss = run.sim.state.enemies.items.find((e) => e.def?.id === 'dev_chitterbloom')!;
    expect(boss.def!.hp).toBeCloseTo(300, 9);
  });

  it("Phase 2 checkpoints 'halls' and keeps its own clock; Dawn lifts the dark; won 8 s on", () => {
    const run = play(config('keep'));
    const { sim } = run;
    expect(sim.state.outcome).toBe('won');
    const cleared2 = run.events.find((e) => e.type === 'WaveCleared' && e.wave === 2)!;
    const phase2 = run.events.find((e) => e.type === 'PhaseChanged' && e.phase === 2)!;
    // `cleared` is reached in cleanup, so its event fires on the next tick's triggers.
    expect(phase2.at).toBe(cleared2.at + 1);
    const cp = first(run, 'CheckpointReached')!;
    expect(cp).toMatchObject({ wave: 2, label: 'halls', tick: phase2.at + 1, at: phase2.at });
    // 5 s into Phase 2, its own clock grants 50 (`{ phase: 2, afterSec: 5 }`).
    const clock = sim.map.events.findIndex((e) => e.id === 'phase2_clock');
    const before = play(config('keep'), [], phase2.at + 300).sim.state;
    const after = play(config('keep'), [], phase2.at + 301).sim.state;
    expect([before.scriptFired[clock], after.scriptFired[clock]]).toEqual([false, true]);
    expect(after.stats.creditsEarned - before.stats.creditsEarned).toBeGreaterThanOrEqual(50);
    const dawn = run.events.find((e) => e.type === 'PhaseChanged' && e.phase === 3)!;
    const light = first(run, 'LightingSet')!;
    expect([light.key, light.at]).toEqual(['dawn', dawn.at]);
    expect(sim.state.lightingKey).toBe('dawn');
    expect(sim.state.lightingTick).toBe(dawn.at);
    expect(sim.state.phase).toBe(3);
    expect(sim.state.phaseTick).toBe(dawn.at);
    expect(first(run, 'MapWon')!.at).toBe(dawn.at + 8 * 60);
    expect(sim.state.dark).toBe(0); // lifted with the light
  });

  it("the dark eases to 0 over the light set's 8 s", () => {
    const dawnAt = first(play(config('keep')), 'LightingSet')!.at;
    const half = play(config('keep'), [], dawnAt + 1 + 240);
    // At the end of the tick 4 s on: halfway, from W3's 0.6.
    expect(half.sim.state.dark).toBeCloseTo(0.6 * (1 - 241 / 480), 9);
  });

  it('replays a log prefix ending inside Phase 2, after the halls checkpoint, to the same state', () => {
    const plain = play(config('keep'));
    const cp = first(plain, 'CheckpointReached')!;
    const uidAt = (col: number, row: number): number =>
      plain.sim.state.towers.items.find((t) => t.alive && t.col === col && t.row === row)!.uid;
    // Phase 2's own commands: the Zapcoils upgraded 2 s and 4 s after the checkpoint.
    const extra = new Map<number, Command<IdSpace>>([
      [cp.tick + 120, { type: 'upgrade', towerUid: uidAt(2, 1) }],
      [cp.tick + 240, { type: 'upgrade', towerUid: uidAt(5, 5) }],
    ]);
    const full = play(config('keep'), [], undefined, extra);
    expect(first(full, 'CheckpointReached')).toMatchObject({ tick: cp.tick });
    const dawn = first(full, 'LightingSet')!;
    // A tick inside Phase 2 with the boss on the map, after those commands.
    const inside = cp.tick + 600;
    const log = full.sim.state.commandLog;
    expect(log.some((c) => c.tick >= cp.tick && c.tick < inside)).toBe(true);
    expect(inside).toBeLessThan(dawn.at);
    const end = full.sim.state.tick;
    const ref = play(config('keep'), [cp.tick, inside, end], undefined, extra);
    expect(ref.sim.hash()).toBe(full.sim.hash());

    // "Retry from the Halls": the checkpoint's own replay reproduces its state exactly.
    const atCp = replay(config('keep'), log, cp.tick);
    expect(atCp.hash()).toBe(ref.hashes.get(cp.tick));
    expect(atCp.state.phase).toBe(2);
    expect(atCp.state.timers[0]!.bossHpPct).toBe(full.sim.state.timers[0]!.bossHpPct);

    // The prefix ending inside Phase 2 (the Bore %, its bonus, the phase clock, the boss's HP).
    const atInside = replay(config('keep'), log, inside);
    expect(atInside.hash()).toBe(ref.hashes.get(inside));

    // And on from there with the rest of the log to the same end.
    let i = log.findIndex((c) => c.tick >= inside);
    if (i < 0) i = log.length;
    while (atInside.state.outcome === 'playing') {
      while (i < log.length && log[i]!.tick === atInside.state.tick)
        atInside.enqueue(log[i++]!.cmd);
      atInside.step();
    }
    expect(atInside.state.tick).toBe(end);
    expect(atInside.hash()).toBe(full.sim.hash());
  });
});
