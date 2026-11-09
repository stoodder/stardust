import { describe, expect, it } from 'vitest';
import { FIXTURE_CONTENT } from '../sim/__fixtures__/sim.ts';
import { policyBuild } from './policies.ts';

const map = FIXTURE_CONTENT.maps.fx_map;
const par = map.builds.parBuild;
const towers = FIXTURE_CONTENT.towers;

describe('policies', () => {
  it('none: no steps and no ability', () => {
    expect(policyBuild('none', map, towers)).toMatchObject({
      loadout: par.loadout,
      technicianAbility: null,
      callEarly: false,
      steps: [],
    });
  });

  it('alwaysCallEarly: the par build with callEarly on', () => {
    expect(policyBuild('alwaysCallEarly', map, towers)).toEqual({ ...par, callEarly: true });
  });

  it('spamCheapest: the cheapest loadout tower on every buildable tile, row by row', () => {
    const b = policyBuild('spamCheapest', map, towers);
    expect(b.steps).toEqual(
      [
        [1, 1],
        [3, 1],
        [3, 2], // high ground
        [4, 2],
        [1, 3],
      ].map((tile) => ({ wave: 1, kind: 'build', tower: 'fx_gun', tile })),
    );
  });

  it('spareFleeing: par with spare runners on for every tower before W1', () => {
    const b = policyBuild('spareFleeing', map, towers);
    expect(b.steps[0]).toEqual({ wave: 1, kind: 'spareRunners', target: 'all', on: true });
    expect(b.steps.slice(1)).toEqual(par.steps);
  });
});
