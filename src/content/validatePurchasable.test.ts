// [purchasable]: a reference profile must be affordable and available on its own timeline
// (design/progression.md § 10). Fixture content with its own campaign plan: `fx_prior` (pays 100
// Stardust) comes before `fx_map`, so `fx_map`'s profile has 100 Stardust and 1 Intel to spend.
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxMap } from './__fixtures__/content.ts';
import { compileContent } from './compile.ts';
import { RAW_CONTENT } from './registry.ts';
import type { IdSpace, MapDef, ProfileDef, RawContent } from './types.ts';
import { DEFAULT_VALIDATION_RULES, validate } from './validate.ts';
import { LIVE_PURCHASE_RULES, type PurchaseRules } from './validatePurchasable.ts';
import { CAMPAIGN } from './campaign.ts';
import { TOWERS_AHEAD_OF_TASK } from './towers/index.ts';
import { PROTOCOLS, UPGRADES } from './upgrades/index.ts';
import { REFERENCE_PROFILES } from './upgrades/reference.ts';

const PRIOR: MapDef<IdSpace> = { ...fxMap, id: 'fx_prior', stardust: 100 };

const RULES: PurchaseRules = {
  plan: ['fx_prior', 'fx_map'],
  upgrades: {
    seed_money: { ...UPGRADES.seed_money, availableAfter: 'fx_prior' },
    orbital_strike_mk2: { ...UPGRADES.orbital_strike_mk2, availableAfter: 'fx_map' },
    protocol_slots: { ...UPGRADES.protocol_slots, availableAfter: 'fx_prior' },
  },
  protocols: {
    head_start: { ...PROTOCOLS.head_start, price: 10, availableAfter: 'fx_prior' },
    linked_up: { ...PROTOCOLS.linked_up, price: 10, availableAfter: 'fx_prior' },
  },
  towers: {
    fx_gun: { how: 'issued', availableAfter: null },
    fx_mortar: { how: 'license', currency: 'stardust', price: 0, availableAfter: null },
    fx_sprinkler: { how: 'issued', availableAfter: 'fx_map' },
  },
  abilities: { fx_strike: { how: 'gift', availableAfter: null } },
  engineering: {
    currency: 'intel',
    availableAfter: 'fx_prior',
    priceByFaction: LIVE_PURCHASE_RULES.engineering.priceByFaction,
  },
  economy: { intelPerMap: 1, baseProtocolSlots: 1, bankResetAfter: [] },
  aheadOfTask: [],
};

/** The fixture with fx_prior before fx_map, and fx_map's profile patched. */
function withProfile(patch: Partial<ProfileDef<IdSpace>>): RawContent<IdSpace> {
  const map = { ...fxMap, referenceProfile: { ...fxMap.referenceProfile, ...patch } };
  return { ...FIXTURE, maps: { fx_prior: PRIOR, fx_map: map }, campaign: ['fx_prior', 'fx_map'] };
}
function errorsOf(raw: RawContent<IdSpace>, rules: PurchaseRules = RULES): string[] {
  return validate(raw, { ...DEFAULT_VALIDATION_RULES, purchases: rules }).filter((e) =>
    e.startsWith('[purchasable]'),
  );
}
function rejects(raw: RawContent<IdSpace>, message: RegExp, rules: PurchaseRules = RULES): void {
  expect(() => compileContent(raw, { ...DEFAULT_VALIDATION_RULES, purchases: rules })).toThrow(
    /\[purchasable\] /,
  );
  expect(errorsOf(raw, rules).join('\n')).toMatch(message);
}

/**
 * The live campaign with A2M1–A2M3 stood in by copies of A1M5 that pay campaign.md § 4.9's
 * first-clear Stardust and carry their rows, so the Act II rows are priced on the real
 * timeline before their maps exist.
 */
function withActTwoRows(): RawContent<IdSpace> {
  const a1m5: MapDef<IdSpace> = RAW_CONTENT.maps.a1_m05;
  const stand = (id: 'a2_m01' | 'a2_m02' | 'a2_m03', stardust: number): MapDef<IdSpace> => ({
    ...a1m5,
    id,
    stardust,
    referenceProfile: REFERENCE_PROFILES[id],
  });
  const maps = {
    ...RAW_CONTENT.maps,
    a2_m01: stand('a2_m01', 180),
    a2_m02: stand('a2_m02', 195),
    a2_m03: stand('a2_m03', 210),
  };
  return { ...RAW_CONTENT, maps, campaign: [...CAMPAIGN, 'a2_m01', 'a2_m02', 'a2_m03'] };
}

describe('[purchasable]', () => {
  it('passes the live campaign', () => {
    expect(validate(RAW_CONTENT).filter((e) => e.startsWith('[purchasable]'))).toEqual([]);
  });

  it('passes a profile that spends what the earlier maps paid, on items already stocked', () => {
    expect(errorsOf(withProfile({ shop: { seed_money: 1 }, protocols: ['head_start'] }))).toEqual(
      [],
    );
  });

  it('skips maps that are not on the plan (fixtures, dev maps)', () => {
    const raw = withProfile({ shop: { seed_money: 4 } });
    expect(errorsOf(raw, { ...RULES, plan: ['fx_prior'] })).toEqual([]);
  });

  it('fails an item bought before its availableAfter map is won', () => {
    rejects(
      withProfile({ shop: { orbital_strike_mk2: 1 } }),
      /shop\.orbital_strike_mk2: 'orbital_strike_mk2' is available only after fx_map/,
    );
  });

  it('fails a tower, spec unlock, or ability that is not available yet', () => {
    rejects(withProfile({ towers: ['fx_gun', 'fx_sprinkler'] }), /towers: 'fx_sprinkler'/);
    const lateSpecs = { ...RULES, engineering: { ...RULES.engineering, availableAfter: 'fx_map' } };
    rejects(withProfile({ specs: ['fx_gun'] }), /specs: 'fx_gun' specs/, lateSpecs);
    rejects(withProfile({}), /technicianAbility: 'fx_strike' is available only after fx_map/, {
      ...RULES,
      abilities: { fx_strike: { how: 'gift', availableAfter: 'fx_map' } },
    });
  });

  it('fails a tower still ahead of its task: its license is on no shelf yet', () => {
    const ahead = { ...RULES, aheadOfTask: ['fx_mortar'] };
    rejects(withProfile({}), /towers: 'fx_mortar' waits for its task/, ahead);
    expect(errorsOf(withProfile({}))).toEqual([]);
  });

  it('fails what has no catalog or access entry', () => {
    rejects(withProfile({ shop: { tune_rivet: 1 } }), /'tune_rivet' is not a shop or R&D upgrade/);
    rejects(withProfile({ protocols: ['ready_room'] }), /'ready_room' is not a Field Protocol/);
    rejects(withProfile({ technicianAbility: 'fx_suppress' }), /'fx_suppress' isn't a Technician/);
    const { fx_mortar: _gone, ...towers } = RULES.towers;
    rejects(withProfile({}), /'fx_mortar' has no access entry/, { ...RULES, towers });
  });

  it('fails a rank outside the item', () => {
    rejects(withProfile({ shop: { seed_money: 5 } }), /rank 5 must be a whole number from 1 to 4/);
    rejects(withProfile({ shop: { seed_money: 0 } }), /rank 0/);
  });

  it('fails Stardust beyond what the earlier first clears paid', () => {
    // Seed Money 1 + 2 = 80 + 120 = 200 > 100.
    rejects(
      withProfile({ shop: { seed_money: 2 } }),
      /spends 200 Stardust; the maps before it pay 100/,
    );
  });

  it('fails Intel beyond one Victory medal per earlier map', () => {
    // fx_gun is Everglow: its specs cost 2 Intel, and one map before pays 1.
    rejects(withProfile({ specs: ['fx_gun'] }), /spends 2 Intel; Victory medals before it pay 1/);
    expect(
      errorsOf(withProfile({ specs: ['fx_gun'] }), { ...RULES, plan: ['a', 'fx_prior', 'fx_map'] }),
    ).toEqual([]);
  });

  it('fails more protocols than slots, and counts R&D slots', () => {
    const two = withProfile({ protocols: ['head_start', 'linked_up'] });
    rejects(two, /protocols: 2 protocols in 1 slot/);
    const rich = { ...RULES, economy: { ...RULES.economy, intelPerMap: 4 } };
    expect(
      errorsOf(
        withProfile({ protocols: ['head_start', 'linked_up'], shop: { protocol_slots: 1 } }),
        rich,
      ),
    ).toEqual([]);
    rejects(
      withProfile({ protocols: ['head_start', 'head_start'] }),
      /'head_start' is listed twice/,
    );
  });

  it('restarts the Stardust count after a bank reset (C2 Return), keeping what was owned', () => {
    const reset = { ...RULES, economy: { ...RULES.economy, bankResetAfter: ['fx_prior'] } };
    // fx_prior's 100 goes with the bank, so nothing is left to spend on fx_map.
    rejects(
      withProfile({ shop: { seed_money: 1 } }),
      /spends 80 Stardust since the bank reset after fx_prior; the maps before it pay 0/,
      reset,
    );
    // What fx_prior's own profile already owned doesn't count again: fx_first pays for it.
    const first: MapDef<IdSpace> = { ...PRIOR, id: 'fx_first' };
    const priorOwned: MapDef<IdSpace> = {
      ...PRIOR,
      referenceProfile: { ...PRIOR.referenceProfile, shop: { seed_money: 1 } },
    };
    const three = (rank: number): RawContent<IdSpace> => {
      const raw = withProfile({ shop: { seed_money: rank } });
      return {
        ...raw,
        maps: { ...raw.maps, fx_first: first, fx_prior: priorOwned },
        campaign: ['fx_first', 'fx_prior', 'fx_map'],
      };
    };
    const plan3: PurchaseRules = {
      ...reset,
      plan: ['fx_first', 'fx_prior', 'fx_map'],
      upgrades: { ...reset.upgrades, seed_money: { ...UPGRADES.seed_money, availableAfter: null } },
    };
    expect(errorsOf(three(1), plan3)).toEqual([]);
    rejects(three(2), /spends 120 Stardust since the bank reset after fx_prior/, plan3);
  });

  // The campaign's reference profile rows (upgrades/reference.ts; campaign.md § 4.9).
  describe('REFERENCE_PROFILES', () => {
    it('is every registered campaign map’s own referenceProfile', () => {
      for (const id of CAMPAIGN) {
        const row: ProfileDef<IdSpace> | undefined = (
          REFERENCE_PROFILES as Partial<Record<string, ProfileDef<IdSpace>>>
        )[id];
        expect({ id, profile: RAW_CONTENT.maps[id].referenceProfile }).toEqual({
          id,
          profile: row,
        });
      }
    });

    it('prices the Act II rows on the campaign timeline (the Lookout license is on the shelf)', () => {
      expect(TOWERS_AHEAD_OF_TASK).not.toContain('lookout');
      expect(errorsOf(withActTwoRows(), LIVE_PURCHASE_RULES)).toEqual([]);
      // A row owning a tower still ahead of its task is refused for it, and only for it.
      const ahead = { ...LIVE_PURCHASE_RULES, aheadOfTask: ['lookout'] };
      const refused = errorsOf(withActTwoRows(), ahead);
      expect(refused).toHaveLength(3);
      for (const e of refused) expect(e).toMatch(/towers: 'lookout' waits for its task/);
    });

    it('follows campaign.md § 4.9 from A1M5 to A2M3', () => {
      const { a1_m05, a2_m01, a2_m02, a2_m03 } = REFERENCE_PROFILES;
      expect(a2_m01.towers).toEqual([...a1_m05.towers, 'lookout']);
      expect(a2_m01.shop).toEqual(a1_m05.shop);
      expect(a2_m02.specs).toEqual(['thumper', 'sprinkler']);
      expect(a2_m02.shop).toEqual({ ...a1_m05.shop, seed_money: 1, tune_zapcoil: 1 });
      expect(a2_m03.shop).toEqual({ ...a2_m02.shop, tune_sprinkler: 2 });
      expect(a2_m03.towers).toEqual(a2_m01.towers);
    });
  });
});
