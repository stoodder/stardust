// Script `when` conditions (T202c): judged once, on the tick the trigger is reached; flags come
// from SimConfig.scriptFlags. And what createSim still refuses (unsupportedScript).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { ConditionDef, MapDef } from '../../content/types.ts';
import { SIM_FIXTURE, fixtureConfig, type FixtureIds } from '../__fixtures__/sim.ts';
import type { ScriptFlags } from '../config.ts';
import { createSim, type Sim } from '../sim.ts';
import { unsupportedScript } from './triggers.ts';

function simWith(
  over: Partial<MapDef<FixtureIds, 'fx_map'>>,
  scriptFlags: ScriptFlags = {},
): Sim<FixtureIds> {
  const content = compileContent<FixtureIds>({
    ...SIM_FIXTURE,
    maps: { fx_map: { ...SIM_FIXTURE.maps.fx_map, ...over } },
  });
  return createSim({ ...fixtureConfig(), content, scriptFlags });
}

/** A credit grant at `tick`, guarded by `when`. */
function gift(id: string, tick: number, when: ConditionDef<FixtureIds>, credits: number) {
  return { id, on: { tick }, when, actions: [{ grantCredits: credits }] } as const;
}

function runTo(sim: Sim<FixtureIds>, ticks: number): void {
  while (sim.state.tick < ticks) sim.step();
}

describe('script `when` conditions', () => {
  it('run the actions only when the condition holds on the trigger tick (flags from config)', () => {
    const variants = { flagVariants: { door_choice: ['convoy', 'warren'] } } as const;
    const events = [
      gift('convoy', 5, { flag: 'door_choice', eq: 'convoy' }, 7),
      gift('warren', 5, { flag: 'door_choice', eq: 'warren' }, 11),
    ];
    const sim = simWith({ ...variants, events }, { door_choice: 'warren' });
    runTo(sim, 10);
    expect(sim.state.credits).toBe(200 + 11);
    // Both are spent: a false `when` doesn't wait for the condition to come true later.
    expect(sim.state.scriptFired.slice(-2)).toEqual([true, true]);
  });

  it('a state `when` is judged once, at the trigger: later changes never fire it', () => {
    const sim = simWith({ events: [gift('built', 5, { stat: 'towersBuilt', gte: 1 }, 7)] });
    runTo(sim, 10); // nothing built by tick 5
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [1, 1] });
    runTo(sim, 20);
    expect(sim.state.credits).toBe(200 - 100);
  });

  it('createSim no longer refuses `when`, but refuses optional objectives (M3)', () => {
    const map = {
      ...compileContent(SIM_FIXTURE).maps.fx_map,
      objectives: [
        {
          id: 'clean',
          condition: { stat: 'towersBuilt', lte: 3 } as const,
          intel: 1,
          onComplete: [],
        },
      ],
    };
    expect(unsupportedScript(map)).toEqual([
      "objective 'clean': optional objectives are not simulated until M3",
    ]);
  });
});
