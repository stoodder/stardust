import { describe, expect, it } from 'vitest';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { createNewSave } from '../meta/index.ts';
import { createSim, FEATURE_GATES } from '../sim/index.ts';
import {
  battleConfig,
  battleMapIds,
  DEFAULT_MAP_ID,
  defaultLoadout,
  hasBattleMap,
  randomSeed,
} from './battleSetup.ts';

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
    expect(hasBattleMap('nope')).toBe(false);
    expect(hasBattleMap(DEFAULT_MAP_ID)).toBe(true);
    expect(() => battleConfig('nope', 1)).toThrow(/unknown map/);
  });

  it('random seeds are 32-bit integers', () => {
    const s = randomSeed();
    expect(Number.isInteger(s) && s >= 0 && s < 2 ** 32).toBe(true);
  });
});

describe('battleSetup from a save', () => {
  it('a new save brings its towers and Orbital Strike into A1M1', () => {
    const cfg = battleConfig(DEFAULT_MAP_ID, 1, createNewSave());
    expect(cfg.loadout).toEqual(['rivet', 'thumper']);
    expect(cfg.abilities.slot1).toBe('orbital_strike');
    expect(cfg.difficulty).toBe('standard');
    expect(() => createSim(cfg)).not.toThrow();
  });

  it('brings every owned tower when there are four or fewer, minus revoked ones', () => {
    const save = DEV_SAVES.after_a1m1.build();
    expect(battleConfig(DEFAULT_MAP_ID, 1, save).loadout).toEqual([
      'rivet',
      'thumper',
      'sprinkler',
    ]);
    save.unlocks.revokedTowers = ['thumper'];
    expect(battleConfig(DEFAULT_MAP_ID, 1, save).loadout).toEqual(['rivet', 'sprinkler']);
  });

  it('caps the loadout at four, par towers first', () => {
    const owned = ['sprinkler', 'a', 'b', 'c', 'rivet', 'thumper'];
    expect(defaultLoadout(owned, [], ['rivet', 'thumper'])).toEqual([
      'rivet',
      'thumper',
      'sprinkler',
      'a',
    ]);
    expect(defaultLoadout(owned, ['a', 'b'], [])).toEqual(['sprinkler', 'c', 'rivet', 'thumper']);
  });

  it('no slot-1 ability when every owned one is revoked', () => {
    const save = createNewSave();
    save.unlocks.revokedAbilities = ['orbital_strike'];
    expect(battleConfig(DEFAULT_MAP_ID, 1, save).abilities.slot1).toBeNull();
  });

  it('leaves out what the sim still refuses, so an ahead-of-the-sim save still plays', () => {
    const save = DEV_SAVES.all_unlocked.build();
    save.settings.difficulty = 'story';
    const cfg = battleConfig(DEFAULT_MAP_ID, 1, save);
    expect(cfg.loadout.length).toBeLessThanOrEqual(4);
    expect(cfg.difficulty).toBe(FEATURE_GATES.storyDifficulty === null ? 'story' : 'standard');
    if (FEATURE_GATES.specs !== null) expect(cfg.specsUnlocked).toEqual([]);
    else expect(cfg.specsUnlocked).toEqual(cfg.loadout);
    expect(() => createSim(cfg)).not.toThrow();
  });
});
