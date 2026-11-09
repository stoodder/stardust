import { describe, expect, it } from 'vitest';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { createNewSave, withPreset } from '../meta/index.ts';
import { companionSlot, createSim, FEATURE_GATES } from '../sim/index.ts';
import {
  battleConfig,
  battleMapIds,
  DEFAULT_MAP_ID,
  defaultLoadout,
  defaultPick,
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

  it("passes the save's set script-readable story flags to map scripts", () => {
    const save = createNewSave();
    expect(battleConfig(DEFAULT_MAP_ID, 1, save).scriptFlags).toEqual({});
    save.story.flags = { spared_quiet_wave: true, peeker_poked: true };
    expect(battleConfig(DEFAULT_MAP_ID, 1, save).scriptFlags).toEqual({ spared_quiet_wave: true });
  });

  it("plays the map's loadout preset when the save has a choice (T201), else everything owned", () => {
    const save = withPreset(DEV_SAVES.all_unlocked.build(), 'a1_m01', {
      towers: ['sprinkler', 'rivet'],
      ability: 'suppressing_fire',
    });
    const cfg = battleConfig(DEFAULT_MAP_ID, 1, save);
    expect(cfg.loadout).toEqual(['sprinkler', 'rivet']);
    expect(cfg.abilities.slot1).toBe('suppressing_fire');
    expect(() => createSim(cfg)).not.toThrow();
    // No choice left (one ability): the skip rule brings everything owned, preset or not.
    save.unlocks.revokedAbilities = ['suppressing_fire'];
    const skipped = battleConfig(DEFAULT_MAP_ID, 1, save);
    expect(skipped.loadout).toEqual(['rivet', 'thumper', 'sprinkler', 'skyhook']);
    expect(skipped.abilities.slot1).toBe('orbital_strike');
  });

  it('defaultPick is the default towers and the par ability, as the save owns them', () => {
    const save = DEV_SAVES.all_unlocked.build();
    const par = { loadout: ['thumper', 'rivet'], technicianAbility: 'orbital_strike' };
    // Five owned towers (Zapcoil plays since T304b): the par build's first, then ownership order.
    expect(defaultPick(save, par)).toEqual({
      towers: ['thumper', 'rivet', 'sprinkler', 'skyhook'],
      ability: 'orbital_strike',
    });
    expect(defaultPick(save, { loadout: [], technicianAbility: 'nope' }).ability).toBe(
      'orbital_strike',
    );
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
    // Every top-rank upgrade arrives (Salvage Rights too, since T304b), plus Story's.
    const sources = new Set(cfg.modifiers.map((m) => m.source));
    expect(sources).toContain('rnd:orbital_strike_mk2');
    expect(sources).toContain('shop:tune_rivet');
    expect(sources).toContain('difficulty:story');
    expect(sources).toContain('shop:salvage_rights');
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

  it('equipped Field Protocols reach the battle as modifiers (T308; Head Start, Specialist)', () => {
    const save = DEV_SAVES.after_a1m4.build();
    expect(save.loadouts.protocols).toEqual(['head_start']);
    const cfg = battleConfig(DEFAULT_MAP_ID, 1, save);
    expect(cfg.modifiers).toContainEqual({
      kind: 'economy',
      stat: 'startCredits',
      pct: 0.1,
      source: 'protocol:head_start',
    });
    const sim = createSim(cfg);
    expect(sim.state.credits).toBe(Math.round(sim.map.startCredits * 1.1));
    // Unequipped: no protocol modifier, the plain start.
    const bare = { ...save, loadouts: { ...save.loadouts, protocols: [] } };
    const plain = battleConfig(DEFAULT_MAP_ID, 1, bare);
    expect(plain.modifiers.some((m) => m.source.startsWith('protocol:'))).toBe(false);
    // Specialist's '*' tower becomes its pick.
    const spec = DEV_SAVES.after_a1m4.build();
    spec.unlocks.protocols.push('specialist');
    spec.loadouts.protocols = ['specialist'];
    spec.loadouts.protocolPicks = { specialist: 'thumper' };
    expect(battleConfig(DEFAULT_MAP_ID, 1, spec).modifiers).toContainEqual({
      kind: 'towerCost',
      tower: 'thumper',
      tiers: 'spec',
      pct: -0.25,
      source: 'protocol:specialist',
    });
  });

  it('a stale equipped list never fails a battle start: what it no longer allows drops', () => {
    const save = DEV_SAVES.after_a1m4.build();
    save.unlocks.protocols = [];
    expect(() => createSim(battleConfig(DEFAULT_MAP_ID, 1, save))).not.toThrow();
    expect(battleConfig(DEFAULT_MAP_ID, 1, save).modifiers.map((m) => m.source)).not.toContain(
      'protocol:head_start',
    );
  });
});
