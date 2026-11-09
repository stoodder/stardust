import { describe, expect, it } from 'vitest';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { createNewSave } from '../meta/index.ts';
import { companionSlot, createSim, FEATURE_GATES } from '../sim/index.ts';
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

  it("fills slot 2 with the map's companion, with or without a save", () => {
    for (const id of battleMapIds()) {
      const cfg = battleConfig(id, 1, createNewSave());
      const slot = companionSlot(cfg.content, cfg.content.maps[id]!);
      expect({ companion: cfg.companion, ...cfg.abilities, slot1: null }).toEqual({
        ...slot,
        slot1: null,
      });
      expect(battleConfig(id, 1).abilities.slot2).toBe(slot.slot2);
    }
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
    // Every top-rank upgrade arrives, less Salvage Rights (wreckage is M3), plus Story's.
    const sources = new Set(cfg.modifiers.map((m) => m.source));
    expect(sources).toContain('rnd:orbital_strike_mk2');
    expect(sources).toContain('shop:tune_rivet');
    expect(sources).toContain('difficulty:story');
    expect(sources).not.toContain('shop:salvage_rights');
  });

  it("brings the save's purchases and difficulty in as modifiers (meta/modifiers.ts)", () => {
    const save = createNewSave();
    save.upgrades = { orbital_strike_mk2: 1 };
    expect(battleConfig(DEFAULT_MAP_ID, 1, save).modifiers).toEqual([
      {
        kind: 'abilityStat',
        ability: 'orbital_strike',
        stat: 'radius',
        flat: 0.5,
        source: 'rnd:orbital_strike_mk2',
      },
    ]);
    save.settings.difficulty = 'story';
    const story = battleConfig(DEFAULT_MAP_ID, 1, save);
    expect(story.difficulty).toBe('story');
    const sim = createSim(story);
    expect(sim.state.integrity).toBe(30);
    expect(sim.state.credits).toBe(Math.round(sim.map.startCredits * 1.5));
  });
});
