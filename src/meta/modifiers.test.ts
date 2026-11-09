import { describe, expect, it } from 'vitest';
import {
  PROTOCOLS,
  UPGRADES,
  type ProtocolDef,
  type UpgradeDef,
} from '../content/upgrades/index.ts';
import type { IdSpace } from '../content/types.ts';
import { createSim, type Modifier } from '../sim/index.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import {
  DIFFICULTY_MODIFIERS,
  maxRanks,
  metaModifiers,
  protocolSlots,
  saveModifiers,
  type MetaLoadout,
} from './modifiers.ts';
import { abilityPool, protocolPool, protocolSlotCount, towerPool } from './pools.ts';
import { createNewSave } from './saveData.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';

const none: MetaLoadout = { upgrades: {}, protocols: [], difficulty: 'standard' };
const upgrades = Object.values<UpgradeDef>(UPGRADES);
const protocols = Object.values<ProtocolDef>(PROTOCOLS);

describe('meta modifiers', () => {
  it('owning nothing on Standard grants nothing', () => {
    expect(metaModifiers(none)).toEqual([]);
  });

  it.each(upgrades.map((u) => [u.id, u] as const))(
    "upgrade %s: each rank adds its grants, sourced '<kind>:<id>'",
    (id, u) => {
      for (let rank = 1; rank <= u.ranks.length; rank++) {
        const expected = u.ranks
          .slice(0, rank)
          .flatMap((r) => r.grants.map((g) => ({ ...g, source: `${u.kind}:${id}` })));
        expect(metaModifiers({ ...none, upgrades: { [id]: rank } })).toEqual(expected);
      }
    },
  );

  it.each(protocols.map((p) => [p.id, p] as const))(
    "protocol %s: equipped, it grants its grants, sourced 'protocol:<id>'",
    (id, p) => {
      const picks = p.choice === 'tower' ? { [id]: 'rivet' } : undefined;
      const got = metaModifiers({ ...none, protocols: [id], ...(picks && { picks }) });
      const expected = p.grants.map((g) => {
        const m = { ...g, source: `protocol:${id}` };
        return picks !== undefined && 'tower' in m && m.tower === '*'
          ? { ...m, tower: 'rivet' }
          : m;
      });
      expect(got).toEqual(expected);
    },
  );

  it("resolves Specialist's `choice: 'tower'` to the pick, and refuses it without one", () => {
    expect(
      metaModifiers({ ...none, protocols: ['specialist'], picks: { specialist: 'thumper' } }),
    ).toEqual([
      {
        kind: 'towerCost',
        tower: 'thumper',
        tiers: 'spec',
        pct: -0.25,
        source: 'protocol:specialist',
      },
    ]);
    expect(() => metaModifiers({ ...none, protocols: ['specialist'] })).toThrow(
      /'specialist' needs a tower pick/,
    );
    expect(() =>
      metaModifiers({ ...none, protocols: ['head_start'], picks: { head_start: 'rivet' } }),
    ).toThrow(/'head_start' takes no pick/);
    expect(() => metaModifiers({ ...none, picks: { specialist: 'rivet' } })).toThrow(
      /isn't equipped/,
    );
  });

  it('Story difficulty: −30% HP and shields, +50% credits, integrity 30, countdowns +50%', () => {
    expect(metaModifiers({ ...none, difficulty: 'story' })).toEqual([
      { kind: 'enemyStat', stat: 'hp', pct: -0.3, source: 'difficulty:story' },
      { kind: 'enemyStat', stat: 'shield', pct: -0.3, source: 'difficulty:story' },
      { kind: 'economy', stat: 'startCredits', pct: 0.5, source: 'difficulty:story' },
      { kind: 'economy', stat: 'coreIntegrity', set: 30, source: 'difficulty:story' },
      { kind: 'countdown', pct: 0.5, source: 'difficulty:story' },
    ]);
    expect(DIFFICULTY_MODIFIERS.standard).toEqual([]);
  });

  it('Story on A1M1: the sim starts at integrity 30 with +50% credits, and stacks the shop on top', () => {
    const content = compileContent(RAW_CONTENT);
    const map = content.maps.a1_m01;
    const cfg = (modifiers: Modifier<IdSpace>[]) =>
      createSim<IdSpace>({
        content,
        mapId: 'a1_m01',
        seed: 1,
        loadout: map.builds.parBuild.loadout,
        companion: null,
        modifiers,
        difficulty: 'story',
        abilities: { slot1: null, slot2: null, slot2State: 'none' },
        scriptFlags: {},
        specsUnlocked: [],
      });
    const story = cfg(metaModifiers({ ...none, difficulty: 'story' }));
    expect(story.state.integrity).toBe(30);
    expect(story.state.credits).toBe(Math.round(map.startCredits * 1.5));
    const stacked = cfg(
      metaModifiers({
        ...none,
        difficulty: 'story',
        upgrades: { reinforced_core: 3, seed_money: 4 },
      }),
    );
    expect(stacked.state.integrity).toBe(33);
    expect(stacked.state.credits).toBe(Math.round(map.startCredits * (1 + 0.5 + 0.16)));
  });

  it('keeps a stable order: upgrades in catalog order, then protocols, then difficulty', () => {
    const got = metaModifiers({
      upgrades: { seed_money: 1, reinforced_core: 1 },
      protocols: ['linked_up'],
      difficulty: 'story',
    });
    expect(got.map((m) => m.source)).toEqual([
      'shop:reinforced_core',
      'shop:seed_money',
      'protocol:linked_up',
      ...DIFFICULTY_MODIFIERS.story.map((m) => m.source),
    ]);
  });

  it('refuses unknown ids, ranks out of range, duplicates, and too many protocols', () => {
    expect(() => metaModifiers({ ...none, upgrades: { nope: 1 } })).toThrow(
      /unknown upgrade 'nope'/,
    );
    expect(() => metaModifiers({ ...none, upgrades: { seed_money: 5 } })).toThrow(/rank 5/);
    expect(() => metaModifiers({ ...none, upgrades: { seed_money: 1.5 } })).toThrow(/rank 1.5/);
    expect(() => metaModifiers({ ...none, protocols: ['nope'] })).toThrow(/unknown protocol/);
    expect(() => metaModifiers({ ...none, protocols: ['head_start', 'head_start'] })).toThrow(
      /equipped twice/,
    );
    expect(() => metaModifiers({ ...none, protocols: ['head_start', 'linked_up'] })).toThrow(
      /2 protocols equipped, but only 1 slots/,
    );
    expect(
      metaModifiers({
        ...none,
        upgrades: { protocol_slots: 1 },
        protocols: ['head_start', 'linked_up'],
      }),
    ).toHaveLength(2);
  });

  it('counts protocol slots: 1 with the shop, plus R&D slots 2 and 3', () => {
    expect(protocolSlots({})).toBe(1);
    expect(protocolSlots({ protocol_slots: 1 })).toBe(2);
    expect(protocolSlots(maxRanks())).toBe(3);
  });

  it('a save brings its ranks and difficulty, never its owned-but-unequipped protocols', () => {
    const save = DEV_SAVES.all_unlocked.build();
    const mods = saveModifiers(save);
    expect(mods.some((m) => m.source.startsWith('protocol:'))).toBe(false);
    expect(mods).toEqual(
      metaModifiers({ upgrades: maxRanks(), protocols: [], difficulty: 'standard' }),
    );
    save.settings.difficulty = 'story';
    expect(saveModifiers(save).slice(-5)).toEqual(DIFFICULTY_MODIFIERS.story);
    expect(saveModifiers(createNewSave())).toEqual([]);
  });
});

describe('pools', () => {
  it('towers and abilities: owned minus revoked; protocols: owned', () => {
    const save = DEV_SAVES.all_unlocked.build();
    save.unlocks.revokedTowers = ['thumper'];
    save.unlocks.revokedAbilities = ['orbital_strike'];
    expect(towerPool(save)).toEqual(save.unlocks.towers.filter((t) => t !== 'thumper'));
    expect(abilityPool(save)).toEqual(save.unlocks.abilities.filter((a) => a !== 'orbital_strike'));
    expect(protocolPool(save)).toEqual(save.unlocks.protocols);
  });

  it('protocol slots: none before the shop opens', () => {
    const fresh = createNewSave();
    expect(protocolSlotCount(fresh)).toBe(0);
    expect(protocolSlotCount(fresh, ['shop'])).toBe(1);
    const all = DEV_SAVES.all_unlocked.build();
    expect(protocolSlotCount(all, DEV_SAVES.all_unlocked.devUnlocks)).toBe(3);
  });
});
