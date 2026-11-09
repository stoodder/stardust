// Test helpers: a sim over the content pipeline's fixture map (src/content/__fixtures__).
// fx_map: 6×5, 200 starting credits; fx_gun (100, then 80 and 150) is available at the start,
// fx_mortar and fx_sprinkler unlock at wave 2. Pads (col, row): (1,1), (3,1), (4,2), (1,3);
// high ground (3,2); path from (0,0) through (2,0); wreckage (4,3); decor (0,1).
import { FIXTURE, type FixtureIds } from '../../content/__fixtures__/content.ts';
import { compileContent } from '../../content/compile.ts';
import type { CompiledContent } from '../../content/compiled.ts';
import type { SimConfig } from '../config.ts';
import { createSim, type Sim } from '../sim.ts';

export type { FixtureIds };

/** The fixture content, compiled once (it's deep-frozen, so sharing it is safe). */
export const FIXTURE_CONTENT: CompiledContent<FixtureIds> = compileContent(FIXTURE);

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
    ...over,
  };
}

/** A fresh sim on fx_map. */
export function fixtureSim(over: Partial<SimConfig<FixtureIds>> = {}): Sim<FixtureIds> {
  return createSim(fixtureConfig(over));
}
