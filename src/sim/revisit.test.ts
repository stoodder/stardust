// Revisits and the light in the sim (T410a): a revisit plays as its composed layout (createSim
// refuses nothing), and the lighting schedule and dressing are cosmetic: a run with them hashes
// the same, tick for tick, as the same run without them.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import type { RawContent } from '../content/types.ts';
import { SIM_FIXTURE, fixtureConfig, type FixtureIds } from './__fixtures__/sim.ts';
import { gateRefusals } from './gates.ts';
import { createSim } from './sim.ts';

const MAP = SIM_FIXTURE.maps.fx_map;

/** A run of `content`'s fx_map: a gun, wave 1 called, `ticks` long; its hash each second. */
function hashes(content: CompiledContent<FixtureIds>, ticks: number): string[] {
  const sim = createSim(fixtureConfig({ content }));
  sim.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
  sim.enqueue({ type: 'callWave' });
  const out: string[] = [];
  for (let t = 1; t <= ticks; t++) {
    sim.step();
    if (t % 60 === 0) out.push(sim.hash());
  }
  return out;
}

describe('the light is cosmetic (T410a; D101)', () => {
  it('hashes a run the same with a lighting schedule and dressing as without', () => {
    const lit: RawContent<FixtureIds> = {
      ...SIM_FIXTURE,
      maps: {
        fx_map: {
          ...MAP,
          lighting: [{ wave: 2, env: 'act2.dusk' }],
          dressing: [{ kind: 'greySoil', area: 'all' }],
        },
      },
    };
    const content = compileContent(lit);
    expect(content.maps.fx_map.lighting).toHaveLength(1);
    expect(hashes(content, 900)).toEqual(hashes(compileContent(SIM_FIXTURE), 900));
  });
});

describe('a revisit plays (map.revisit lifted)', () => {
  it('refuses nothing, and plays its composed layout', () => {
    // fx_map revisited in 8×7 at (1, 1): the same road and pads, one tile in.
    const raw: RawContent<FixtureIds> = {
      ...SIM_FIXTURE,
      maps: {
        ...SIM_FIXTURE.maps,
        fx_map: {
          ...MAP,
          revisitOf: 'fx_orig',
          revisitAt: [1, 1],
          size: { cols: 8, rows: 7 },
          // prettier-ignore
          tiles: [
            '........',
            '.******.',
            '.******.',
            '.******.',
            '.******.',
            '.******.',
            '........',
          ],
          paths: [],
          airLanes: [],
          markers: {},
          underWreckage: {},
          salvage: {},
          events: [],
          parBuild: { ...MAP.parBuild, steps: [] },
          noCounterBuilds: {},
          altBuilds: {},
          requiredCounters: [],
        },
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a second fixture map id
        ...({ fx_orig: { ...MAP, id: 'fx_orig', events: [] } } as unknown as Record<string, never>),
      },
    };
    const content = compileContent(raw);
    expect(gateRefusals(fixtureConfig({ content }))).toEqual([]);
    const sim = createSim(fixtureConfig({ content }));
    // fx_map's (1, 1) pad is (2, 2) here; its path tiles are one tile in.
    sim.enqueue({ type: 'build', tile: [2, 2], tower: 'fx_gun' });
    sim.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' }); // the spawn: rejected
    sim.step();
    expect(sim.state.towers.live).toBe(1);
  });
});
