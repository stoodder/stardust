// T806's script actions and timers, unit by unit (sim/phases.ts, sim/timers.ts,
// content/lightingSets.ts, the sky-only key in sim/darkness.ts). The whole script end to end, and
// the determinism of a replay inside Phase 2: render/__fixtures__/devPhases.test.ts (dev_bore).
import { describe, expect, it } from 'vitest';
import type { CompiledLightingKey, CompiledMapDef } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { LIGHTING_SETS, lightingSetProgress, lightingSetsOf } from '../content/lightingSets.ts';
import type { IdSpace } from '../content/types.ts';
import { SIM_FIXTURE, fixtureConfig } from './__fixtures__/sim.ts';
import { darkTarget } from './darkness.ts';
import { phaseReached, scriptCheckpoint, setLighting, setPhase } from './phases.ts';
import { createState, type SimState } from './state.ts';
import { createScratch } from './tick.ts';
import { setTimerRate, startTimer, timerBossHpPct, timerFull, timers } from './timers.ts';

const FX = compileContent(SIM_FIXTURE);
const BORE: CompiledMapDef<IdSpace> = {
  ...FX.maps.fx_map,
  timers: [
    { id: 'deep_bore', fillTicks: 100, bossHpPerTenth: 0.05 },
    { id: 'other', fillTicks: 10, bossHpPerTenth: 0 },
  ],
};
const ctx = { content: FX, map: BORE, config: fixtureConfig(), scratch: createScratch() };

/** Runs the timers system `n` ticks. */
function fill(state: SimState, n: number): void {
  for (let i = 0; i < n; i++) {
    timers(state, ctx);
    state.tick++;
  }
}

/** A compiled lighting key on the night env. */
function key(wave: number, dark: number, skyOnly = false): CompiledLightingKey {
  return { wave, env: 'act3', dark, skyOnly };
}

describe('setPhase', () => {
  it('rises, stamps the clock, and never falls', () => {
    const state = createState(BORE, 1);
    state.tick = 50;
    setPhase(state, 2);
    expect([state.phase, state.phaseTick]).toEqual([2, 50]);
    expect(state.events).toEqual([{ type: 'PhaseChanged', phase: 2 }]);
    state.tick = 90;
    setPhase(state, 2);
    setPhase(state, 1);
    expect([state.phase, state.phaseTick, state.events.length]).toEqual([2, 50, 1]);
    expect(phaseReached(state, 2, 40)).toBe(true);
    expect(phaseReached(state, 2, 41)).toBe(false);
  });
});

describe('checkpoint and setLighting', () => {
  it('a labelled checkpoint resumes at the state after its tick, in the wave now', () => {
    const state = createState(BORE, 1);
    state.tick = 700;
    state.wave = 18;
    scriptCheckpoint(state, 'halls');
    expect(state.events).toEqual([
      { type: 'CheckpointReached', wave: 18, tick: 701, label: 'halls' },
    ]);
  });

  it('turns the light to a set once, keeping the tick it ran', () => {
    const state = createState(BORE, 1);
    state.tick = 300;
    setLighting(state, 'dawn');
    state.tick = 400;
    setLighting(state, 'dawn');
    expect([state.lightingKey, state.lightingTick]).toEqual(['dawn', 300]);
    expect(state.events).toEqual([{ type: 'LightingSet', key: 'dawn' }]);
  });

  it("Dawn is the finale env over 8 s; the turn's progress is sim time alone", () => {
    expect(LIGHTING_SETS.dawn).toEqual({ env: 'finale', easeSec: 8 });
    expect(lightingSetProgress(null, 0, 100)).toBe(0);
    expect(lightingSetProgress('dusk', 0, 100)).toBe(0); // no such set
    expect(lightingSetProgress('dawn', 100, 100)).toBe(0);
    expect(lightingSetProgress('dawn', 100, 340)).toBe(0.5);
    expect(lightingSetProgress('dawn', 100, 9999)).toBe(1);
    const events = [
      { actions: [{ cue: 'x' }, { setLighting: 'dawn' }] },
      { actions: [{ setLighting: 'dawn' }, { setLighting: 'nope' }] },
    ];
    expect(lightingSetsOf({ events })).toEqual(['dawn']);
  });

  it('a sky-only key is skipped by the darkness', () => {
    const keys = [key(1, 1), key(3, 0, true), key(5, 0)];
    // 1 → 0 over W1–W5 in equal steps, as if the sky-only key weren't there.
    expect([1, 2, 3, 4, 5].map((w) => darkTarget(keys, w))).toEqual([1, 0.75, 0.5, 0.25, 0]);
  });
});

describe('the timers', () => {
  it('fill only once started, at their rate, set before or after the start', () => {
    const state = createState(BORE, 1);
    fill(state, 10);
    expect(state.timers[0]!.filled).toBe(0);
    setTimerRate(state, BORE, 'deep_bore', 0.75); // before the start (Purge's event order)
    startTimer(state, BORE, 'deep_bore');
    fill(state, 20);
    expect(state.timers[0]!.filled).toBeCloseTo(15, 9);
    expect(state.stats.boreProgress).toBe(15);
    startTimer(state, BORE, 'deep_bore'); // again: nothing changes
    expect(state.timers[0]!.ratePct).toBe(0.75);
  });

  it('stopped, fix the boss bonus per whole tenth; running again, clear it', () => {
    const state = createState(BORE, 1);
    startTimer(state, BORE, 'deep_bore');
    fill(state, 39);
    expect(timerBossHpPct(state)).toBe(0);
    setTimerRate(state, BORE, 'deep_bore', 0);
    expect(state.timers[0]!.bossHpPct).toBe(0.15); // 39%: three whole tenths
    fill(state, 50);
    expect(state.timers[0]!.filled).toBe(39); // stopped
    setTimerRate(state, BORE, 'deep_bore', 1);
    expect(timerBossHpPct(state)).toBe(0);
  });

  it('full: TimerFull once, the trigger holds, the bar stays full at +50%', () => {
    const state = createState(BORE, 1);
    startTimer(state, BORE, 'deep_bore');
    fill(state, 99);
    expect(timerFull(state, BORE, 'deep_bore')).toBe(false);
    fill(state, 30);
    expect(timerFull(state, BORE, 'deep_bore')).toBe(true);
    expect(state.events).toEqual([{ type: 'TimerFull', id: 'deep_bore' }]);
    expect([state.timers[0]!.filled, state.timers[0]!.bossHpPct]).toEqual([100, 0.5]);
    expect(state.stats.boreProgress).toBe(100);
    setTimerRate(state, BORE, 'deep_bore', 0); // the Halls stop a full Bore: still +50%
    expect(timerBossHpPct(state)).toBe(0.5);
    expect(timerFull(state, BORE, 'nope')).toBe(false);
  });

  it('a second timer fills on its own and leaves boreProgress to the first', () => {
    const state = createState(BORE, 1);
    startTimer(state, BORE, 'other');
    fill(state, 12);
    expect(state.timers[1]).toMatchObject({ filled: 10, full: true, bossHpPct: 0 });
    expect(state.stats.boreProgress).toBe(0);
  });
});
