// Test helpers: a sim over the content pipeline's fixture map (src/content/__fixtures__).
// fx_map: 6×5, 200 starting credits; fx_gun (100, then 80 and 150) is available at the start,
// fx_mortar and fx_sprinkler unlock at wave 2. Pads (col, row): (1,1), (3,1), (4,2), (1,3);
// high ground (3,2); path from (0,0) through (2,0); wreckage (4,3); decor (0,1). Waves: W1 is 3
// fx_walker (0.8 s apart); W2 (10 s countdown) is 2 fx_walker plus 4 fleeing fx_runner.
import { FIXTURE, type FixtureIds } from '../../content/__fixtures__/content.ts';
import { compileContent } from '../../content/compile.ts';
import type { CompiledContent } from '../../content/compiled.ts';
import type { RawContent } from '../../content/types.ts';
import type { SimConfig } from '../config.ts';
import { createSim, type Sim } from '../sim.ts';

export type { FixtureIds };

/**
 * The content fixture as the sim runs it: fx_map's `late_gift` event without its `setClickable`
 * action, which the sim doesn't simulate yet (createSim refuses it; clickable objects are A2M3's).
 * Its other script parts (a cue at W2's countdown, a credit grant 1.5 s into W2) stay.
 */
export const SIM_FIXTURE: RawContent<FixtureIds> = {
  ...FIXTURE,
  maps: {
    fx_map: {
      ...FIXTURE.maps.fx_map,
      events: (FIXTURE.maps.fx_map.events ?? []).map((ev) =>
        Object.assign({}, ev, { actions: ev.actions.filter((a) => !('setClickable' in a)) }),
      ),
    },
  },
};

/** The sim fixture content, compiled once (it's deep-frozen, so sharing it is safe). */
export const FIXTURE_CONTENT: CompiledContent<FixtureIds> = compileContent(SIM_FIXTURE);

/** A valid M1 config on fx_map; override any field. */
export function fixtureConfig(over: Partial<SimConfig<FixtureIds>> = {}): SimConfig<FixtureIds> {
  return {
    content: FIXTURE_CONTENT,
    mapId: 'fx_map',
    seed: 1,
    loadout: ['fx_gun', 'fx_mortar'],
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'fx_strike', slot2: null, slot2State: 'none' },
    scriptFlags: {},
    specsUnlocked: [],
    ...over,
  };
}

/** A fresh sim on fx_map. */
export function fixtureSim(over: Partial<SimConfig<FixtureIds>> = {}): Sim<FixtureIds> {
  return createSim(fixtureConfig(over));
}
