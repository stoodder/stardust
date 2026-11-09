// Clickable world objects (T409; story-runtime.md § Map scripts): `setClickable` (with its
// fallback trigger), the `interact` command, the `interacted` trigger, and the harness's
// `interact` step, on the content fixture's rock (`clickables.rock`).
import { describe, expect, it } from 'vitest';
import { FIXTURE } from '../content/__fixtures__/content.ts';
import type { CompiledBuild, CompiledBuildStep } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import type { MapDef } from '../content/types.ts';
import { CLICK_CONTENT, fixtureConfig, type FixtureIds } from './__fixtures__/sim.ts';
import type { SimEvent } from './events.ts';
import { createBuildExecutor, runHeadless } from './headless.ts';
import { createSim, type Sim } from './sim.ts';

type FxSim = Sim<FixtureIds>;
type FxEvent = SimEvent<FixtureIds>;
type FxEvents = NonNullable<MapDef<FixtureIds, 'fx_map'>['events']>;

/**
 * The fixture with fx_map's events replaced: the rock turns clickable as W1 starts, with W1's
 * clear as its fallback, and its `interacted` event cues the rescue and grants 7 credits.
 */
const RESCUE: FxEvents = [
  {
    id: 'open',
    on: { wave: 1, phase: 'start' },
    actions: [
      { setClickable: { marker: 'rock', on: true, fallback: { wave: 1, phase: 'cleared' } } },
    ],
  },
  {
    id: 'rescued',
    on: { interacted: 'rock' },
    actions: [{ cue: 'fx_map_rescue' }, { grantCredits: 7 }],
  },
];

function simWith(events: FxEvents = RESCUE, seed = 1): FxSim {
  const content = compileContent<FixtureIds>({
    ...FIXTURE,
    maps: { fx_map: { ...FIXTURE.maps.fx_map, events } },
  });
  return createSim({ ...fixtureConfig(), content, seed });
}

/** Steps `sim` to `tick`, returning the events with the tick each came on. */
function runTo(sim: FxSim, tick: number): { tick: number; e: FxEvent }[] {
  const log: { tick: number; e: FxEvent }[] = [];
  const out: FxEvent[] = [];
  while (sim.state.tick < tick && sim.state.outcome === 'playing') {
    const at = sim.state.tick;
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) log.push({ tick: at, e });
  }
  return log;
}

const clickEvents = (log: { tick: number; e: FxEvent }[]) =>
  log.filter(
    ({ e }) =>
      e.type === 'ClickableChanged' ||
      e.type === 'Interacted' ||
      (e.type === 'ScriptCue' && e.cueId === 'fx_map_rescue') ||
      (e.type === 'CommandRejected' && e.cmd.type === 'interact'),
  );

/** Starts wave 1 and steps until the rock turns clickable (W1's start runs its event). */
function opened(sim = simWith()): FxSim {
  sim.enqueue({ type: 'callWave' });
  runTo(sim, 2);
  expect(sim.state.clickable).toEqual(['rock']);
  return sim;
}

describe('setClickable', () => {
  it('turns the marker clickable with its fallback and says so', () => {
    const sim = simWith();
    sim.enqueue({ type: 'callWave' });
    const log = runTo(sim, 2);
    expect(clickEvents(log)).toEqual([
      { tick: 0, e: { type: 'ClickableChanged', marker: 'rock', on: true } },
    ]);
    expect(sim.state.clickable).toEqual(['rock']);
    expect(sim.state.clickFallback).toEqual([{ wave: 1, phase: 'cleared' }]);
    expect(sim.state.interacted).toEqual([]);
  });

  it('turning it off drops the fallback: the beat never lands by itself', () => {
    const sim = simWith([
      RESCUE[0]!,
      RESCUE[1]!,
      {
        id: 'close',
        on: { wave: 1, phase: { afterSec: 0.5 } },
        actions: [{ setClickable: { marker: 'rock', on: false } }],
      },
    ]);
    sim.enqueue({ type: 'callWave' });
    const log = runTo(sim, 60 * 60);
    expect(clickEvents(log).map(({ e }) => e)).toEqual([
      { type: 'ClickableChanged', marker: 'rock', on: true },
      { type: 'ClickableChanged', marker: 'rock', on: false },
    ]);
    expect(sim.state.schedule.resolved[0]).toBe(true); // W1 cleared: the fallback was dropped
    expect([sim.state.clickable, sim.state.clickFallback, sim.state.interacted]).toEqual([
      [],
      [],
      [],
    ]);
  });

  it('turning on a clickable marker again only replaces its fallback', () => {
    const sim = simWith([
      RESCUE[0]!,
      {
        id: 'again',
        on: { wave: 1, phase: { afterSec: 0.5 } },
        actions: [{ setClickable: { marker: 'rock', on: true, fallback: { tick: 100 } } }],
      },
    ]);
    sim.enqueue({ type: 'callWave' });
    const log = runTo(sim, 200);
    expect(clickEvents(log)).toEqual([
      { tick: 0, e: { type: 'ClickableChanged', marker: 'rock', on: true } },
      { tick: 100, e: { type: 'ClickableChanged', marker: 'rock', on: false } },
      { tick: 100, e: { type: 'Interacted', marker: 'rock', byFallback: true } },
    ]);
  });

  it('never turns a marker clickable again once it has been interacted with', () => {
    const sim = simWith([
      ...RESCUE,
      {
        id: 'reopen',
        on: { wave: 2, phase: 'countdown' },
        actions: [{ setClickable: { marker: 'rock', on: true } }],
      },
    ]);
    sim.enqueue({ type: 'interact', marker: 'rock' }); // too early: rejected
    sim.enqueue({ type: 'callWave' });
    runTo(sim, 2);
    sim.enqueue({ type: 'interact', marker: 'rock' });
    const log = runTo(sim, 60 * 40);
    expect(sim.state.schedule.countdownWave).toBe(2);
    expect(sim.state.clickable).toEqual([]);
    expect(clickEvents(log).map(({ e }) => e.type)).toEqual([
      'ClickableChanged', // off: the click
      'Interacted',
      'ScriptCue',
    ]);
  });
});

describe('the interact command', () => {
  it('is rejected notClickable (and logged) before the marker is clickable, changing nothing', () => {
    const sim = simWith();
    const before = sim.hash();
    sim.enqueue({ type: 'interact', marker: 'rock' });
    sim.applyPending();
    const out: FxEvent[] = [];
    sim.drainEvents(out);
    expect(out).toEqual([
      {
        type: 'CommandRejected',
        cmd: { type: 'interact', marker: 'rock' },
        reason: 'notClickable',
      },
    ]);
    expect(sim.state.commandLog).toHaveLength(1);
    expect(sim.hash()).toBe(before);
  });

  it('is rejected for a marker that is not clickable, even while another is', () => {
    const sim = opened();
    sim.enqueue({ type: 'interact', marker: 'nowhere' });
    const log = runTo(sim, sim.state.tick + 1);
    expect(clickEvents(log).map(({ e }) => e)).toEqual([
      {
        type: 'CommandRejected',
        cmd: { type: 'interact', marker: 'nowhere' },
        reason: 'notClickable',
      },
    ]);
    expect(sim.state.clickable).toEqual(['rock']);
  });

  it('interacts once: the highlight goes, then Interacted, then the interacted trigger, same tick', () => {
    const sim = opened();
    const credits = sim.state.credits;
    const at = sim.state.tick;
    sim.enqueue({ type: 'interact', marker: 'rock' });
    sim.enqueue({ type: 'interact', marker: 'rock' }); // a double click: the second is rejected
    const log = runTo(sim, 60 * 60);
    expect(clickEvents(log)).toEqual([
      { tick: at, e: { type: 'ClickableChanged', marker: 'rock', on: false } },
      { tick: at, e: { type: 'Interacted', marker: 'rock', byFallback: false } },
      {
        tick: at,
        e: {
          type: 'CommandRejected',
          cmd: { type: 'interact', marker: 'rock' },
          reason: 'notClickable',
        },
      },
      { tick: at, e: { type: 'ScriptCue', cueId: 'fx_map_rescue' } },
    ]);
    expect(sim.state.interacted).toEqual(['rock']);
    expect([sim.state.clickable, sim.state.clickFallback]).toEqual([[], []]);
    // The fallback (W1 cleared) is gone with it: nothing interacts again.
    expect(sim.state.schedule.resolved[0]).toBe(true);
    expect(log.filter(({ e }) => e.type === 'Interacted')).toHaveLength(1);
    expect(sim.state.credits).toBeGreaterThanOrEqual(credits + 7);
  });

  it('applied while paused, its interacted trigger fires on the next tick', () => {
    const sim = opened();
    sim.enqueue({ type: 'interact', marker: 'rock' });
    sim.applyPending();
    const out: FxEvent[] = [];
    sim.drainEvents(out);
    expect(out.map((e) => e.type)).toEqual(['ClickableChanged', 'Interacted']);
    const log = runTo(sim, sim.state.tick + 1);
    expect(clickEvents(log).map(({ e }) => e)).toEqual([
      { type: 'ScriptCue', cueId: 'fx_map_rescue' },
    ]);
  });

  it('is rejected mapEnded after the map ends', () => {
    const sim = opened();
    Reflect.set(sim.state, 'outcome', 'won');
    sim.enqueue({ type: 'interact', marker: 'rock' });
    sim.applyPending();
    const out: FxEvent[] = [];
    sim.drainEvents(out);
    expect(out).toEqual([
      { type: 'CommandRejected', cmd: { type: 'interact', marker: 'rock' }, reason: 'mapEnded' },
    ]);
  });
});

describe('the fallback', () => {
  it('interacts by itself when its trigger is reached, and the interacted trigger fires that tick', () => {
    const sim = opened();
    const log: { tick: number; e: FxEvent }[] = [];
    while (sim.state.interacted.length === 0 && sim.state.tick < 60 * 60) {
      log.push(...runTo(sim, sim.state.tick + 1));
    }
    const cleared = log.find(({ e }) => e.type === 'WaveCleared')!.tick;
    // A wave's `cleared` is reached in cleanup, so its triggers see it on the next tick.
    expect(clickEvents(log)).toEqual([
      { tick: cleared + 1, e: { type: 'ClickableChanged', marker: 'rock', on: false } },
      { tick: cleared + 1, e: { type: 'Interacted', marker: 'rock', byFallback: true } },
      { tick: cleared + 1, e: { type: 'ScriptCue', cueId: 'fx_map_rescue' } },
    ]);
    expect(sim.state.interacted).toEqual(['rock']);
    // Too late to click now.
    sim.enqueue({ type: 'interact', marker: 'rock' });
    const after = runTo(sim, sim.state.tick + 1);
    expect(clickEvents(after).map(({ e }) => e.type)).toEqual(['CommandRejected']);
  });

  it("the fixture's own rock: a W2 action with a tick fallback", () => {
    // fx_map's `late_gift` (once: false) turns the rock on 1.5 s into W2, fallback tick 600.
    const sim = createSim({ ...fixtureConfig(), content: CLICK_CONTENT });
    sim.enqueue({ type: 'callWave' });
    const log = runTo(sim, 60 * 60);
    const changed = clickEvents(log).filter(({ e }) => e.type !== 'ClickableChanged');
    expect(changed).toHaveLength(1);
    expect(changed[0]!.e).toEqual({ type: 'Interacted', marker: 'rock', byFallback: true });
    // Turned on after tick 600, its fallback is already reached: it lands on the next tick.
    const on = clickEvents(log).find(({ e }) => e.type === 'ClickableChanged')!.tick;
    expect(on).toBeGreaterThan(600);
    expect(changed[0]!.tick).toBe(on + 1);
  });
});

/** Plays fx_map with nobody building, clicking the rock at `clickAt` (or never), to the end. */
function play(clickAt: number | null): FxSim {
  const sim = simWith();
  sim.enqueue({ type: 'callWave' });
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 120) {
    if (sim.state.tick === clickAt) sim.enqueue({ type: 'interact', marker: 'rock' });
    sim.step();
    sim.drainEvents([]);
  }
  return sim;
}

describe('determinism', () => {
  it('the same commands give the same run, with or without the click', () => {
    for (const at of [null, 30]) {
      const a = play(at);
      const b = play(at);
      expect(b.hash()).toBe(a.hash());
      expect(b.state.tick).toBe(a.state.tick);
    }
  });

  it('a click is in the command log, so replaying the log reproduces the run', () => {
    const a = play(30);
    expect(a.state.commandLog.map((l) => [l.tick, l.cmd.type])).toEqual([
      [0, 'callWave'],
      [30, 'interact'],
    ]);
    const b = simWith();
    let next = 0;
    while (b.state.outcome === 'playing' && b.state.tick < 60 * 120) {
      const log = a.state.commandLog;
      while (next < log.length && log[next]!.tick === b.state.tick) b.enqueue(log[next++]!.cmd);
      b.step();
      b.drainEvents([]);
    }
    expect(b.hash()).toBe(a.hash());
  });

  it('clicking and the fallback reach the same story by different paths', () => {
    const clicked = simWith();
    clicked.enqueue({ type: 'callWave' });
    runTo(clicked, 30);
    clicked.enqueue({ type: 'interact', marker: 'rock' });
    runTo(clicked, 31);
    const waited = simWith();
    waited.enqueue({ type: 'callWave' });
    runTo(waited, 31);
    // The click's credits land now; the fallback's only once W1 is cleared.
    expect(clicked.state.credits).toBe(waited.state.credits + 7);
    expect(clicked.hash()).not.toBe(waited.hash());
    const a = play(30);
    const b = play(null);
    expect([a.state.interacted, b.state.interacted]).toEqual([['rock'], ['rock']]);
  });
});

/** The fixture config on fx_map with `events`. */
const cfg = (events: FxEvents = RESCUE) => ({
  ...fixtureConfig(),
  content: compileContent<FixtureIds>({
    ...FIXTURE,
    maps: { fx_map: { ...FIXTURE.maps.fx_map, events } },
  }),
});

describe('the harness interact step', () => {
  type Step = CompiledBuildStep<FixtureIds>;
  const build = (steps: Step[]): CompiledBuild<FixtureIds> => ({
    loadout: ['fx_gun', 'fx_mortar'],
    companion: null,
    technicianAbility: 'fx_strike',
    callEarly: false,
    steps,
  });

  it('clicks as soon as the marker is clickable, without holding the steps behind it', () => {
    const sim = createSim(cfg());
    const exec = createBuildExecutor(
      sim,
      build([
        { wave: 1, kind: 'interact', marker: 'rock' },
        { wave: 1, kind: 'build', tower: 'fx_gun', tile: [1, 1] },
      ]),
    );
    const events: FxEvent[] = [];
    while (sim.state.tick < 5) {
      exec.beforeTick();
      sim.step();
      sim.drainEvents(events);
    }
    // The build went in at tick 0, ahead of the click; the rock turned on at W1's start (tick 0),
    // so the click is issued before tick 1.
    expect(exec.steps.map((s) => [s.kind, s.issuedTick, s.error])).toEqual([
      ['interact', 1, null],
      ['build', 0, null],
    ]);
    expect(sim.state.commandLog.map((l) => [l.tick, l.cmd.type])).toEqual([
      [0, 'build'],
      [0, 'callWave'],
      [1, 'interact'],
    ]);
    expect(events.filter((e) => e.type === 'Interacted')).toEqual([
      { type: 'Interacted', marker: 'rock', byFallback: false },
    ]);
  });

  it('without the step, the fallback lands; runHeadless replays deterministically', () => {
    const steps: Step[] = [{ wave: 1, kind: 'build', tower: 'fx_gun', tile: [1, 1] }];
    const plain = runHeadless(cfg(), build(steps));
    const again = runHeadless(cfg(), build(steps));
    expect(again.hash).toBe(plain.hash);
    const clicked = runHeadless(
      cfg(),
      build([...steps, { wave: 1, kind: 'interact', marker: 'rock' }]),
    );
    expect(clicked.steps.map((s) => s.error)).toEqual([null, null]);
    expect(clicked.commandCount).toBe(plain.commandCount + 1);
    expect(clicked.outcome).toBe(plain.outcome);
  });

  it("records notClickable when the fallback beats the click, and never-issued if it can't come", () => {
    // The click is armed in W2's countdown, after the fallback (tick 10) already interacted.
    const early = [
      {
        id: 'open',
        on: { wave: 1, phase: 'start' },
        actions: [{ setClickable: { marker: 'rock', on: true, fallback: { tick: 10 } } }],
      },
    ] as const;
    const late = runHeadless(cfg(early), build([{ wave: 2, kind: 'interact', marker: 'rock' }]));
    expect(late.steps[0]).toMatchObject({ error: 'notClickable' });
    expect(late.steps[0]!.issuedTick).toBeGreaterThan(0);
    // Nothing turns it on: the click never goes.
    const never = runHeadless(cfg([]), build([{ wave: 1, kind: 'interact', marker: 'rock' }]));
    expect(never.steps[0]).toMatchObject({ issuedTick: -1, error: null });
  });
});
