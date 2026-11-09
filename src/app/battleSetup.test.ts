import { describe, expect, it } from 'vitest';
import { createSim } from '../sim/index.ts';
import { battleConfig, battleMapIds, DEFAULT_MAP_ID, randomSeed } from './battleSetup.ts';

describe('battleSetup', () => {
  it('the default map is registered and makes a valid sim', () => {
    expect(battleMapIds()).toContain(DEFAULT_MAP_ID);
    const sim = createSim(battleConfig(DEFAULT_MAP_ID, 1));
    expect(sim.map.id).toBe(DEFAULT_MAP_ID);
    expect(sim.config.loadout.length).toBeGreaterThan(0);
  });

  it('every battle map makes a valid sim', () => {
    for (const id of battleMapIds()) expect(() => createSim(battleConfig(id, 7))).not.toThrow();
  });

  it('rejects unknown maps', () => {
    expect(() => battleConfig('nope', 1)).toThrow(/unknown map/);
  });

  it('random seeds are 32-bit integers', () => {
    const s = randomSeed();
    expect(Number.isInteger(s) && s >= 0 && s < 2 ** 32).toBe(true);
  });
});
