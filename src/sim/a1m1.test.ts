// A1M1 end to end through the public sim API (T105b): the spawner against the compiled waves,
// the Thumper unlock, do-nothing losing, a scripted par run whose banks match D019's
// bank-per-phase numbers, and determinism over a full run. A minimal step executor lives here;
// the harness's real one is T108a's (src/sim/headless.ts).
import { describe, expect, it } from 'vitest';
import type { CompiledBuild } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { Command } from './commands.ts';
import type { SimEvent } from './events.ts';
import { createSim, type Sim } from './sim.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a1_m01;
const par = map.builds.parBuild;
/** A run can't take longer than this (A1M1 lasts about 3.5 min). */
const MAX_TICKS = 60 * 60 * 10;

function newSim(build: CompiledBuild | null, seed = 1): Sim {
  return createSim({
    content,
    mapId: 'a1_m01',
    seed,
    loadout: build?.loadout ?? par.loadout,
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: build?.technicianAbility ?? null, slot2: null, slot2State: 'none' },
    scriptFlags: {},
  });
}

interface Run {
  readonly sim: Sim;
  readonly events: { readonly tick: number; readonly e: SimEvent }[];
  /**
   * Each wave's build-phase bank: the credits as it starts plus what its phase's steps spent
   * (D019's number when every earlier enemy has been paid for by then).
   */
  readonly banks: number[];
}

/**
 * Plays `build` (or nothing): starts wave 1, never calls a wave early, and issues each wave's
 * build steps in order during the build phase before it (wave 1's in the setup), each as soon as
 * the bank covers it, like a player. Ability steps go `afterTicks` into their wave.
 */
function play(build: CompiledBuild | null, seed = 1): Run {
  const sim = newSim(build, seed);
  const steps = build?.steps ?? [];
  const uidAt = new Map<string, number>();
  const banks: number[] = [];
  const abilityAt = new Map<number, Command>();
  const events: Run['events'] = [];
  const out: SimEvent[] = [];
  const record = (tick: number): void => {
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) {
      events.push({ tick, e });
      if (e.type === 'TowerBuilt') uidAt.set(e.tile.join(','), e.uid);
      if (e.type !== 'WaveStarted') continue;
      for (const st of steps) {
        if (st.wave !== e.wave || st.kind !== 'ability' || typeof st.when !== 'object') continue;
        const cmd: Command =
          st.target === null
            ? { type: 'ability', slot: st.slot }
            : { type: 'ability', slot: st.slot, target: st.target };
        abilityAt.set(tick + st.when.afterTicks, cmd);
      }
    }
  };
  let phase = 0; // the wave whose build steps are being issued
  let next = 0; // index into steps
  let spent = 0;
  /** Issues the phase's next steps while they're affordable (all of them if `force`). */
  const issue = (force: boolean): void => {
    for (; next < steps.length; next++) {
      const st = steps[next]!;
      if (st.wave !== phase) continue;
      let cmd: Command | null = null;
      let cost = 0;
      if (st.kind === 'build') {
        cmd = { type: 'build', tile: st.tile, tower: st.tower };
        cost = content.towers[st.tower].tiers[0].cost;
      } else if (st.kind === 'upgrade') {
        const uid = uidAt.get(st.tile.join(',')) ?? 0;
        const t = sim.state.towers.items.find((x) => x.alive && x.uid === uid);
        cmd = { type: 'upgrade', towerUid: uid };
        cost = t?.def?.tiers[t.tier]?.cost ?? 0;
      }
      if (cmd === null) continue;
      if (!force && sim.state.credits < cost) return;
      sim.enqueue(cmd);
      sim.applyPending();
      spent += cost;
      record(sim.state.tick);
    }
  };
  const openPhase = (wave: number): void => {
    phase = wave;
    next = 0;
    spent = 0;
  };
  openPhase(1);
  issue(true);
  banks.push(sim.state.credits + spent);
  sim.enqueue({ type: 'callWave' });
  while (sim.state.outcome === 'playing' && sim.state.tick < MAX_TICKS) {
    const s = sim.state.schedule;
    if (s.phase === 'countdown') {
      if (phase !== s.countdownWave) openPhase(s.countdownWave);
      const last = s.countdownTicks === 1; // the wave starts this tick
      issue(last);
      if (last) banks.push(sim.state.credits + spent);
    }
    const cmd = abilityAt.get(sim.state.tick);
    if (cmd !== undefined) sim.enqueue(cmd);
    const tick = sim.state.tick;
    sim.step();
    record(tick);
  }
  return { sim, events, banks };
}

function isType<T extends SimEvent['type']>(
  e: SimEvent,
  type: T,
): e is Extract<SimEvent, { type: T }> {
  return e.type === type;
}
const ofType = <T extends SimEvent['type']>(run: Run, type: T) =>
  run.events.flatMap((l) => (isType(l.e, type) ? [{ tick: l.tick, e: l.e }] : []));

describe('A1M1 waves', () => {
  it('spawns W1’s six Nibblers 0.8 s apart from the tick it starts', () => {
    const run = play(null);
    const w1 = ofType(run, 'EnemySpawned').filter((l) => l.e.wave === 1);
    expect(w1.map((l) => l.tick)).toEqual([0, 48, 96, 144, 192, 240]);
    expect(new Set(w1.map((l) => l.e.enemy))).toEqual(new Set(['nibbler']));
  });

  it('spaces every wave by the 25 s countdown after the previous one finished spawning', () => {
    const run = play(par);
    const starts = ofType(run, 'WaveStarted').map((l) => l.tick);
    let expected = 0;
    const want = map.waves.map((w, i) => {
      if (i > 0) expected += map.waves[i - 1]!.lastSpawnTicks + w.countdownTicks;
      return expected;
    });
    expect(starts).toEqual(want);
    expect(ofType(run, 'WaveStarted').every((l) => !l.e.early && l.e.bonus === 0)).toBe(true);
  });

  it("unlocks the Thumper the tick W3's countdown starts", () => {
    const run = play(null);
    const w2Start = map.waves[0]!.lastSpawnTicks + map.waves[1]!.countdownTicks;
    const unlock = ofType(run, 'TowerClassUnlocked');
    expect(unlock).toEqual([
      {
        tick: w2Start + map.waves[1]!.lastSpawnTicks,
        e: { type: 'TowerClassUnlocked', tower: 'thumper' },
      },
    ]);
    expect(ofType(run, 'CountdownStarted').find((l) => l.e.wave === 3)?.tick).toBe(unlock[0]!.tick);
  });

  it('rejects a Thumper before the unlock and accepts it after', () => {
    const sim = newSim(par);
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

describe('A1M1 economy and outcomes', () => {
  it('loses if the player builds nothing', () => {
    const run = play(null);
    expect(run.sim.state.outcome).toBe('lost');
    expect(run.sim.state.integrity).toBe(0);
    expect(ofType(run, 'MapLost')).toHaveLength(1);
    expect(ofType(run, 'MapWon')).toEqual([]);
  });

  it('par, issued through commands, wins without a leak and banks D019’s numbers', () => {
    const run = play(par);
    expect(ofType(run, 'CommandRejected')).toEqual([]);
    expect(ofType(run, 'EnemyLeaked')).toEqual([]);
    expect(ofType(run, 'AbilityUsed')).toHaveLength(2);
    // Every enemy dies, so each build phase's bank is D019's (and data.test.ts's) number.
    expect(run.banks).toEqual([350, 292, 270, 113, 165, 95, 179]);
    expect(ofType(run, 'WaveCleared').map((l) => l.e.wave)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const s = run.sim.state;
    expect(s.outcome).toBe('won');
    expect(s.integrity).toBe(20);
    const total = map.waves.reduce((n, w) => n + w.groups.reduce((k, g) => k + g.count, 0), 0);
    expect(s.stats.skitterkinKilled).toBe(total);
    // The final bank: W7's phase bank, less its Thumper, plus W7's payout.
    const w7 = map.waves[6]!.groups.reduce((n, g) => n + g.count * g.enemy.bounty, 0) + 48;
    expect(s.credits).toBe(179 - 125 + w7);
    expect(s.credits).toBe(350 + s.stats.creditsEarned - s.stats.creditsSpent);
    // The map is decided: no tick runs after it.
    const tick = s.tick;
    run.sim.step();
    expect(run.sim.state.tick).toBe(tick);
  });

  it('rivet_only also wins', () => {
    const run = play(map.builds.altBuilds.rivet_only!);
    expect(ofType(run, 'CommandRejected')).toEqual([]);
    expect(run.sim.state.outcome).toBe('won');
  });
});

describe('A1M1 determinism', () => {
  it('a full par run hashes the same twice, and its command log replays it', () => {
    const a = play(par);
    const b = play(par);
    expect(b.sim.hash()).toBe(a.sim.hash());
    expect(play(par, 2).sim.state.outcome).toBe('won');

    const replay = newSim(par);
    const log = a.sim.state.commandLog;
    let i = 0;
    while (replay.state.outcome === 'playing' && replay.state.tick < MAX_TICKS) {
      while (i < log.length && log[i]!.tick === replay.state.tick) replay.enqueue(log[i++]!.cmd);
      replay.step();
    }
    expect(i).toBe(log.length);
    expect(replay.hash()).toBe(a.sim.hash());
    expect(replay.state.tick).toBe(a.sim.state.tick);
  });
});
