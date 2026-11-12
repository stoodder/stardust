// T820: the `{ choirAt, afterWave }` trigger (sim/systems/triggers.ts; story-runtime.md § Map
// scripts): the later of the choir's leader at a marker and that wave cleared (D154: the
// finale's Phase 2 starts at the later of W18 cleared and the choir at the Halls mouth). Driven
// on dev_voices (devM8.ts: two waves, the `halls` stop) with the triggers system alone; whole
// runs of both orders are fin_m01's (src/balance/finM01Timing.test.ts).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../src/content/compile.ts';
import type { CompiledMapDef } from '../src/content/compiled.ts';
import type { IdSpace } from '../src/content/types.ts';
import { DEV_CONTENT } from '../src/render/__fixtures__/devBattle.ts';
import { fixtureConfig } from '../src/sim/__fixtures__/sim.ts';
import { createState, type SimState } from '../src/sim/state.ts';
import { triggers } from '../src/sim/systems/triggers.ts';
import { createScratch } from '../src/sim/tick.ts';

const DEV = compileContent(DEV_CONTENT);
const BASE: CompiledMapDef<IdSpace> = DEV.maps.dev_voices!;
const MAP: CompiledMapDef<IdSpace> = {
  ...BASE,
  events: [
    {
      id: 'halls',
      on: { choirAt: 'halls', afterWave: 2 },
      when: null,
      actions: [{ setPhase: 2 }],
      once: true,
    },
  ],
};
const ctx = { content: DEV, map: MAP, config: fixtureConfig(), scratch: createScratch() };

function fresh(): SimState {
  return createState(MAP, 1);
}

describe('{ choirAt, afterWave }', () => {
  it('the choir there first waits for the wave to clear', () => {
    const s = fresh();
    s.choir.arrived = true;
    triggers(s, ctx);
    expect(s.phase).toBe(1);
    s.schedule.resolved[0] = true; // W1 cleared is not W2
    triggers(s, ctx);
    expect(s.phase).toBe(1);
    s.schedule.resolved[1] = true;
    triggers(s, ctx);
    expect(s.phase).toBe(2);
  });

  it('the wave cleared first waits for the choir', () => {
    const s = fresh();
    s.schedule.resolved[0] = true;
    s.schedule.resolved[1] = true;
    triggers(s, ctx);
    expect(s.phase).toBe(1);
    expect(s.scriptFired[0]).not.toBe(true); // not spent while it waits
    s.choir.arrived = true;
    triggers(s, ctx);
    expect(s.phase).toBe(2);
  });

  it('without afterWave it is the choir alone', () => {
    const s = fresh();
    const plain = { ...ctx, map: { ...MAP, events: [{ ...MAP.events[0]!, on: { choirAt: 'halls' } }] } };
    s.choir.arrived = true;
    triggers(s, plain);
    expect(s.phase).toBe(2);
  });
});
