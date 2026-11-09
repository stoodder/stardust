// Determinism (conventions.md § Testing): same content + map + seed + commands ⇒ same hash();
// replaying the command log (or a prefix of it) reproduces the run; and applyPending() at the end
// of tick T equals applying at the start of tick T + 1.
import { describe, expect, it } from 'vitest';
import { FIXTURE } from '../content/__fixtures__/content.ts';
import { compileContent } from '../content/compile.ts';
import { nextU32 } from '../shared/rng.ts';
import { fixtureConfig, fixtureSim, type FixtureIds } from './__fixtures__/sim.ts';
import type { Command, CommandLogEntry } from './commands.ts';
import type { Sim } from './sim.ts';
import { createSim } from './sim.ts';

type Cmd = Command<FixtureIds>;
type Script = readonly { readonly tick: number; readonly cmd: Cmd }[];

const SCRIPT: Script = [
  { tick: 0, cmd: { type: 'build', tile: [1, 1], tower: 'fx_gun' } },
  { tick: 0, cmd: { type: 'build', tile: [2, 0], tower: 'fx_gun' } }, // rejected: the path
  { tick: 30, cmd: { type: 'upgrade', towerUid: 1 } },
  { tick: 30, cmd: { type: 'build', tile: [3, 2], tower: 'fx_gun' } }, // rejected: 20 credits
  { tick: 45, cmd: { type: 'targeting', towerUid: 1, mode: 'last' } },
  { tick: 50, cmd: { type: 'callWave' } },
  { tick: 90, cmd: { type: 'build', tile: [3, 1], tower: 'fx_mortar' } }, // rejected: locked
];
const TICKS = 120;

/** Steps `sim` until tick `ticks`, enqueuing each scripted command just before its tick runs. */
function run(script: Script, ticks: number, seed = 1, sim = fixtureSim({ seed })): Sim<FixtureIds> {
  while (sim.state.tick < ticks) {
    for (const s of script) if (s.tick === sim.state.tick) sim.enqueue(s.cmd);
    sim.step();
  }
  return sim;
}

/** The command log as a script. */
function logAsScript(log: readonly CommandLogEntry<FixtureIds>[]): Script {
  return log.map((e) => ({ tick: e.tick, cmd: e.cmd }));
}

describe('determinism', () => {
  it('same seed and commands give the same hash at every tick', () => {
    const a = fixtureSim();
    const b = fixtureSim();
    for (let t = 1; t <= TICKS; t++) {
      run(SCRIPT, t, 1, a);
      run(SCRIPT, t, 1, b);
      expect(a.hash()).toBe(b.hash());
    }
    expect(a.state.towers.live).toBe(1);
  });

  it('a different seed gives a different hash (the RNG streams are state)', () => {
    expect(run(SCRIPT, TICKS, 1).hash()).not.toBe(run(SCRIPT, TICKS, 2).hash());
    expect(fixtureSim({ seed: 1 }).hash()).not.toBe(fixtureSim({ seed: 2 }).hash());
  });

  it('different commands give a different hash', () => {
    const changed: Script = SCRIPT.map((s) =>
      s.cmd.type === 'targeting' ? { tick: s.tick, cmd: { ...s.cmd, mode: 'strong' } } : s,
    );
    expect(run(changed, TICKS).hash()).not.toBe(run(SCRIPT, TICKS).hash());
  });

  it('replaying the command log reproduces the run', () => {
    const original = run(SCRIPT, TICKS);
    const log = logAsScript(original.state.commandLog);
    expect(log).toHaveLength(SCRIPT.length);
    const replay = run(log, TICKS);
    expect(replay.hash()).toBe(original.hash());
    expect(replay.state.commandLog).toEqual(original.state.commandLog);
  });

  it('replaying a log prefix up to a checkpoint tick matches the original at that tick', () => {
    const checkpoint = 40;
    const atCheckpoint = run(SCRIPT, checkpoint).hash();
    const log = logAsScript(run(SCRIPT, TICKS).state.commandLog);
    const prefix = log.filter((e) => e.tick < checkpoint);
    expect(run(prefix, checkpoint).hash()).toBe(atCheckpoint);
  });

  it('applyPending() at the end of tick T equals applying at the start of tick T + 1', () => {
    const cmd: Cmd = { type: 'build', tile: [1, 3], tower: 'fx_gun' };
    const paused = run([], 10);
    paused.enqueue(cmd);
    paused.applyPending(); // while paused after 10 ticks
    paused.step();
    const live = run([], 10);
    live.enqueue(cmd);
    live.step(); // applied as tick 10 starts
    expect(paused.hash()).toBe(live.hash());
    expect(paused.state.commandLog).toEqual(live.state.commandLog);
    expect(paused.state.commandLog[0]?.tick).toBe(10);
  });

  it('applyPending() between ticks replays the same through the log', () => {
    const sim = run(SCRIPT, 60);
    sim.enqueue({ type: 'targeting', towerUid: 1, mode: 'close' });
    sim.applyPending();
    run(SCRIPT, TICKS, 1, sim);
    const replay = run(logAsScript(sim.state.commandLog), TICKS);
    expect(replay.hash()).toBe(sim.hash());
  });
});

describe('hash()', () => {
  it('is 16 hex digits and stable across calls', () => {
    const sim = run(SCRIPT, 10);
    expect(sim.hash()).toMatch(/^[0-9a-f]{16}$/);
    expect(sim.hash()).toBe(sim.hash());
  });

  it('ignores the output buffers: draining events or the log length doesn’t change it', () => {
    const a = run(SCRIPT, 60);
    const b = run(SCRIPT, 60);
    a.drainEvents([]);
    expect(a.state.events).toHaveLength(0);
    expect(b.state.events.length).toBeGreaterThan(0);
    expect(a.hash()).toBe(b.hash());
  });

  it('covers the tick, RNG streams, pending commands, and entity fields', () => {
    const base = fixtureSim().hash();
    const stepped = fixtureSim();
    stepped.step();
    expect(stepped.hash()).not.toBe(base);

    const rolled = fixtureSim();
    nextU32(rolled.state.rng.projectiles);
    expect(rolled.hash()).not.toBe(base);

    const queued = fixtureSim();
    queued.enqueue({ type: 'callWave' });
    expect(queued.hash()).not.toBe(base);

    const a = run(SCRIPT, 50);
    const b = run(SCRIPT, 50);
    Reflect.set(b.state.towers.items[0]!, 'cooldownTicks', 1); // the tower built at tick 0
    expect(b.hash()).not.toBe(a.hash());
  });

  it('hashes content references by id, so separately compiled identical content agrees', () => {
    const a = run(SCRIPT, TICKS);
    const b = run(
      SCRIPT,
      TICKS,
      1,
      createSim({ ...fixtureConfig(), content: compileContent<FixtureIds>(FIXTURE) }),
    );
    expect(b.state.towers.items[0]?.def).not.toBe(a.state.towers.items[0]?.def);
    expect(b.hash()).toBe(a.hash());
  });
});
