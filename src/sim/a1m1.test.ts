// A1M1 end to end through the public sim API (T105b, T125): the spawner against the compiled
// waves, the Thumper unlock, Bricks at his post, do-nothing losing, par through the harness's
// executor (runHeadless) with builds.ts's bank-per-phase numbers and the Teamwork medal, and
// determinism over a full run, its command log included.
import { describe, expect, it } from 'vitest';
import type { CompiledBuild } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { Command } from './commands.ts';
import { companionSlot } from './companion.ts';
import type { SimEvent } from './events.ts';
import { createBuildExecutor, runHeadless, type HeadlessResult } from './headless.ts';
import type { SimConfig } from './config.ts';
import { createSim, type Sim } from './sim.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a1_m01;
const par = map.builds.parBuild;
/** A run can't take longer than this (A1M1 lasts about 4 min). */
const MAX_TICKS = 60 * 60 * 10;

/** A Standard config for `build` (or for no build: par's loadout, no Technician ability). */
function config(build: CompiledBuild | null, seed = 1): SimConfig {
  const slot = companionSlot(content, map, build?.companion ?? null);
  return {
    content,
    mapId: 'a1_m01',
    seed,
    loadout: build?.loadout ?? par.loadout,
    companion: slot.companion,
    modifiers: [],
    difficulty: 'standard',
    abilities: {
      slot1: build?.technicianAbility ?? null,
      slot2: slot.slot2,
      slot2State: slot.slot2State,
    },
    scriptFlags: {},
    specsUnlocked: [],
  };
}

const run = (build: CompiledBuild, seed = 1): HeadlessResult =>
  runHeadless(config(build, seed), build, { maxTicks: MAX_TICKS });

interface Watched {
  readonly sim: Sim;
  readonly events: { readonly tick: number; readonly e: SimEvent }[];
}

/** Starts wave 1 and steps a sim with nothing built until the map ends, logging every event. */
function watchIdle(): Watched {
  const sim = createSim(config(null));
  const events: Watched['events'] = [];
  const out: SimEvent[] = [];
  sim.enqueue({ type: 'callWave' });
  while (sim.state.outcome === 'playing' && sim.state.tick < MAX_TICKS) {
    const tick = sim.state.tick;
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) events.push({ tick, e });
  }
  return { sim, events };
}

function isType<T extends SimEvent['type']>(
  e: SimEvent,
  type: T,
): e is Extract<SimEvent, { type: T }> {
  return e.type === type;
}
const ofType = <T extends SimEvent['type']>(w: Watched, type: T) =>
  w.events.flatMap((l) => (isType(l.e, type) ? [{ tick: l.tick, e: l.e }] : []));

/**
 * What each wave's build phase spends under `build` if it buys every step there (builds and
 * upgrades; casts are free). Each phase's bank is what's left as the wave starts plus this.
 */
function phaseSpend(build: CompiledBuild): number[] {
  const spend = map.waves.map(() => 0);
  const at = new Map<string, { tower: keyof typeof content.towers; tier: number }>();
  for (const s of build.steps) {
    if (s.kind === 'build') {
      spend[s.wave - 1]! += content.towers[s.tower].tiers[0].cost;
      at.set(s.tile.join(','), { tower: s.tower, tier: 1 });
    } else if (s.kind === 'upgrade') {
      const t = at.get(s.tile.join(','))!;
      spend[s.wave - 1]! += content.towers[t.tower].tiers[t.tier]!.cost;
      t.tier++;
    }
  }
  return spend;
}

describe('A1M1 waves', () => {
  it('spawns W1’s eight Nibblers 0.65 s apart from the tick it starts', () => {
    const w1 = ofType(watchIdle(), 'EnemySpawned').filter((l) => l.e.wave === 1);
    expect(w1.map((l) => l.tick)).toEqual([0, 39, 78, 117, 156, 195, 234, 273]);
    expect(new Set(w1.map((l) => l.e.enemy))).toEqual(new Set(['nibbler']));
  });

  it('spaces every wave by the 25 s countdown after the previous one finished spawning', () => {
    const r = run(par);
    let expected = 0;
    const want = map.waves.map((w, i) => {
      if (i > 0) expected += map.waves[i - 1]!.lastSpawnTicks + w.countdownTicks;
      return expected;
    });
    expect(r.waves.map((w) => w.startTick)).toEqual(want);
    expect(r.waves.every((w) => !w.early && w.earlyBonus === 0)).toBe(true);
  });

  it("unlocks the Thumper the tick W3's countdown starts", () => {
    const w = watchIdle();
    const w2Start = map.waves[0]!.lastSpawnTicks + map.waves[1]!.countdownTicks;
    const unlock = ofType(w, 'TowerClassUnlocked');
    expect(unlock).toEqual([
      {
        tick: w2Start + map.waves[1]!.lastSpawnTicks,
        e: { type: 'TowerClassUnlocked', tower: 'thumper' },
      },
    ]);
    expect(ofType(w, 'CountdownStarted').find((l) => l.e.wave === 3)?.tick).toBe(unlock[0]!.tick);
  });

  it('rejects a Thumper before the unlock and accepts it after', () => {
    const sim = createSim(config(par));
    const thumper: Command = { type: 'build', tile: [10, 5], tower: 'thumper' };
    sim.enqueue({ type: 'callWave' });
    while (sim.state.schedule.countdownWave < 3) {
      if (sim.state.tick === 1000) sim.enqueue(thumper);
      sim.step();
    }
    sim.enqueue(thumper);
    sim.applyPending();
    const out: SimEvent[] = [];
    sim.drainEvents(out);
    const verdicts = out.flatMap((e) =>
      e.type === 'CommandRejected' ? [e.reason] : e.type === 'TowerBuilt' ? [e.tower] : [],
    );
    expect(verdicts).toEqual(['towerLocked', 'thumper']);
  });
});

describe('A1M1 Bricks', () => {
  it('stands at his post by the core from tick 0, with Suppressing Fire in slot 2', () => {
    const w = watchIdle();
    const spawned = ofType(w, 'AllySpawned');
    expect(spawned).toHaveLength(1);
    expect(spawned[0]!.e).toMatchObject({ kind: 'bricks', x: 5.5, y: 8.5 });
    expect(spawned[0]!.tick).toBe(0);
    expect(w.sim.config.abilities).toMatchObject({
      slot2: 'suppressing_fire',
      slot2State: 'present',
    });
    // Alone he can't hold the shift, but he does pick off pests at the gate.
    expect(w.sim.state.outcome).toBe('lost');
    expect(ofType(w, 'EnemyDied').some((l) => l.e.killer.kind === 'ally')).toBe(true);
  });
});

describe('A1M1 economy and outcomes', () => {
  it('loses if the player builds nothing', () => {
    const w = watchIdle();
    expect(w.sim.state.outcome).toBe('lost');
    expect(w.sim.state.integrity).toBe(0);
    expect(ofType(w, 'MapLost')).toHaveLength(1);
    expect(ofType(w, 'MapWon')).toEqual([]);
  });

  it('par wins at 95 with the Teamwork medal, every step on time, with builds.ts’s banks', () => {
    const r = run(par);
    expect(r.outcome).toBe('won');
    expect(r.violations).toEqual([]);
    expect(r.steps.filter((s) => s.late || s.error !== null)).toEqual([]);
    // One pest slips through W7's finale; every other wave is clean.
    expect(r.waves.map((w) => w.leaked)).toEqual([0, 0, 0, 0, 0, 0, 1]);
    expect(r.integrity).toBe(19);
    expect(r.stats.abilityUses).toBe(4); // two strikes, two Suppressing Fires
    // Each build phase's bank (builds.ts and data.test.ts): what's left as the wave starts, plus
    // what the phase spent. Every pest before W7 dies, so these are the documented numbers.
    const spend = phaseSpend(par);
    expect(r.waves.map((w, i) => w.unspentAtStart + spend[i]!)).toEqual([
      350, 198, 176, 119, 235, 237, 369,
    ]);
    expect(r.waves.every((w) => w.clearedTick >= 0)).toBe(true);
    // Crossfire forms when the Thumper lands beside the (10,4) Rivet in W3's build phase and
    // holds to the win: the Teamwork medal. A leak forfeits Perfect Core.
    const thumper = r.towers.find((t) => t.tower === 'thumper')!;
    expect(r.stats.linkTicks).toEqual({ crossfire: r.ticks - thumper.builtTick });
    expect(r.medals).toEqual({ victory: 'earned', perfectCore: 'forfeited', challenge: 'earned' });
    const total = map.waves.reduce((n, w) => n + w.groups.reduce((k, g) => k + g.count, 0), 0);
    expect(r.stats.skitterkinKilled).toBe(total - 1);
    expect(r.credits).toBe(350 + r.stats.creditsEarned - r.stats.creditsSpent);
    // Every tower that fired dealt damage, and Bricks took his share at the gate.
    expect(r.towers.every((t) => t.shots === 0 || t.damage > 0)).toBe(true);
    expect(r.allyKills).toBeGreaterThan(0);
  });

  it('rivet_only, par_minus_last, and no_upgrades also win, and only par’s Thumper links', () => {
    for (const alt of ['rivet_only', 'par_minus_last', 'no_upgrades']) {
      const r = run(map.builds.altBuilds[alt]!);
      expect(r.steps.filter((s) => s.error !== null)).toEqual([]);
      expect(r.outcome).toBe('won');
      expect(r.medals.challenge).toBe(alt === 'rivet_only' ? 'forfeited' : 'earned');
    }
  });
});

describe('A1M1 determinism', () => {
  it('a full par run hashes the same twice, and its command log replays it', () => {
    const a = run(par);
    expect(run(par).hash).toBe(a.hash);
    expect(run(par, 2).outcome).toBe('won');

    // The same run driven by the harness's executor directly, so its command log is in reach.
    const sim = createSim(config(par));
    const exec = createBuildExecutor(sim, par);
    while (sim.state.outcome === 'playing' && sim.state.tick < MAX_TICKS) {
      exec.beforeTick();
      sim.step();
    }
    expect(sim.hash()).toBe(a.hash);

    const replay = createSim(config(par));
    const log = sim.state.commandLog;
    let i = 0;
    while (replay.state.outcome === 'playing' && replay.state.tick < MAX_TICKS) {
      while (i < log.length && log[i]!.tick === replay.state.tick) replay.enqueue(log[i++]!.cmd);
      replay.step();
    }
    expect(i).toBe(log.length);
    expect(replay.hash()).toBe(a.hash);
    expect(replay.state.tick).toBe(a.ticks);
    // The map is decided: no tick runs after it.
    replay.step();
    expect(replay.state.tick).toBe(a.ticks);
  });
});
