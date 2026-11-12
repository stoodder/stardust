// The reference profile's M5 rows (T500b; story/campaign.md § 4.9): A2M4–A2M6 follow the table,
// and each is priced on the real campaign timeline before its map exists, by standing the map in
// with a copy of A1M5 that pays its first-clear Stardust and carries its row (the
// [purchasable] check, validatePurchasable.ts, reads only registered maps).
import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../campaign.ts';
import { RAW_CONTENT } from '../registry.ts';
import type { IdSpace, MapDef, RawContent } from '../types.ts';
import { DEFAULT_VALIDATION_RULES, validate } from '../validate.ts';
import { LIVE_PURCHASE_RULES, type PurchaseRules } from '../validatePurchasable.ts';
import {
  REFERENCE_ECONOMY,
  REFERENCE_PROFILES,
  REFERENCE_STORY_PRICING,
  REFERENCE_VARIANTS,
  FIN_CHOIR_CELLS,
  type StoryPricing,
} from './reference.ts';
import type { FlagProfileDef, ProfileDef } from '../types.ts';
import type { UpgradeDef } from './types.ts';

/** campaign.md § 4.9's first-clear Stardust for the maps the stand-ins replace. */
const STARDUST = [
  ['a2_m01', 180],
  ['a2_m02', 195],
  ['a2_m03', 210],
  ['a2_m04', 225],
  ['a2_m05', 240],
  ['a2_m06', 260],
  ['a3_m01', 280],
  ['a3_m02', 300],
  ['a3_m03', 320],
] as const;

/** The live campaign with every map through A3M3 present, unbuilt ones stood in. */
function withRows(): RawContent<IdSpace> {
  const a1m5: MapDef<IdSpace> = RAW_CONTENT.maps.a1_m05;
  const maps: Record<string, MapDef<IdSpace>> = { ...RAW_CONTENT.maps };
  const campaign: string[] = [...CAMPAIGN];
  for (const [id, stardust] of STARDUST) {
    if (campaign.includes(id)) continue;
    maps[id] = { ...a1m5, id, stardust, referenceProfile: REFERENCE_PROFILES[id] };
    campaign.push(id);
  }
  return { ...RAW_CONTENT, maps, campaign };
}

/** The [purchasable] errors of `withRows()` under `rules`. */
function purchasable(rules: PurchaseRules): string[] {
  return validate(withRows(), { ...DEFAULT_VALIDATION_RULES, purchases: rules }).filter((e) =>
    e.startsWith('[purchasable]'),
  );
}

describe('REFERENCE_PROFILES, Act II part two (M5)', () => {
  it('follows campaign.md § 4.9 into A2M4 and A2M5', () => {
    const { a2_m03, a2_m04, a2_m05 } = REFERENCE_PROFILES;
    expect(a2_m04.towers).toEqual(a2_m03.towers);
    expect(a2_m04.specs).toEqual(['thumper', 'sprinkler', 'zapcoil']);
    expect(a2_m04.shop).toEqual({ ...a2_m03.shop, tune_zapcoil: 2, tune_rivet: 2 });
    expect(a2_m04.protocols).toEqual(['head_start']);
    expect(a2_m04.technicianAbility).toBe('orbital_strike');
    // C2 Return takes the bank after A2M4: A2M5 buys nothing.
    expect(a2_m05).toEqual(a2_m04);
    expect(REFERENCE_ECONOMY.bankResetAfter).toEqual(['a2_m04']);
  });

  it("follows campaign.md § 4.9 into A2M6: the Prism Spire (A2M5's gift) and Reinforced Core 2", () => {
    const { a2_m05, a2_m06 } = REFERENCE_PROFILES;
    expect(a2_m06.towers).toEqual([...a2_m05.towers, 'prism']);
    expect(a2_m06.specs).toEqual(a2_m05.specs);
    expect(a2_m06.shop).toEqual({ ...a2_m05.shop, reinforced_core: 2 });
  });

  it('prices the rows on the campaign timeline (each stub tower as its task will leave it)', () => {
    // A stub tower (the Scuttle Den until T604) waits for its task: priced as it will be.
    const live = { ...LIVE_PURCHASE_RULES, aheadOfTask: [] };
    expect(purchasable(live)).toEqual([]);
    // While a tower is ahead of its task, every row owning it is refused for it alone: A3M1–A3M4,
    // and A3M4's warren cell (its `referenceProfileByFlag`).
    const ahead = purchasable({ ...LIVE_PURCHASE_RULES, aheadOfTask: ['burrow'] });
    // Every Act III row owns the Den: each map's own and each of its flag cells (A3M4's warren,
    // A3M5's three: T721).
    // The finale's row owns it too (registered by T820).
    const act3 = Object.values(RAW_CONTENT.maps).filter((m) => /^(a3_m0\d|fin_m01)$/.test(m.id));
    const cells = (m: (typeof act3)[number]): number => m.referenceProfileByFlag?.length ?? 0;
    expect(ahead.length).toBe(act3.reduce((n, m) => n + 1 + cells(m), 0));
    for (const e of ahead)
      expect(e).toMatch(/(a3_m0\d|fin_m01)\.referenceProfile.*'burrow' waits for its task/);
    expect(ahead.filter((e) => e.includes('referenceProfileByFlag[0]'))).toHaveLength(
      act3.filter((m) => cells(m) > 0).length,
    );
  });

  it("checks A2M5's row against the bank C2 Return emptied", () => {
    // Anything bought before A2M5 has only what came after the reset to spend: nothing.
    const raw = withRows();
    const a2m5 = raw.maps.a2_m05!;
    const shop = { ...a2m5.referenceProfile.shop, tune_skyhook: 1 };
    const maps = {
      ...raw.maps,
      a2_m05: { ...a2m5, referenceProfile: { ...a2m5.referenceProfile, shop } },
    };
    expect(validate({ ...raw, maps }).join('\n')).toMatch(
      /a2_m05\.referenceProfile: spends 40 Stardust since the bank reset after a2_m04; the maps before it pay 0/,
    );
  });
});

describe('REFERENCE_PROFILES, Act III part one (M6, T600b)', () => {
  const { a2_m06, a3_m01, a3_m02, a3_m03 } = REFERENCE_PROFILES;

  it('follows campaign.md § 4.9 into A3M1: the Scuttle Den (a briefing gift) and Ability Coolant 1', () => {
    expect(a3_m01.towers).toEqual([...a2_m06.towers, 'burrow']);
    expect(a3_m01.specs).toEqual(a2_m06.specs);
    expect(a3_m01.shop).toEqual({ ...a2_m06.shop, ability_coolant: 1 });
    // One slot: Head Start stays on for the Escort.
    expect(a3_m01.protocols).toEqual(['head_start']);
    expect(a3_m01.technicianAbility).toBe('orbital_strike');
  });

  it('follows it into A3M2: the Harpoon and the Mindspike, the Bulkhead on for the Defend', () => {
    expect(a3_m02.towers).toEqual([...a3_m01.towers, 'harpoon', 'mindspike']);
    expect(a3_m02.protocols).toEqual(['emergency_bulkhead']);
    expect(a3_m02.technicianAbility).toBe('orbital_strike');
  });

  it('follows it into A3M3: the Clean Exit took the Rivet and the uplink; Seed Money 2', () => {
    expect(a3_m03.towers).toEqual(a3_m02.towers.filter((t) => t !== 'rivet'));
    expect(a3_m03.towers).toContain('thumper'); // the Everglow class A3M2 didn't take
    expect(a3_m03.shop).toEqual({ ...a3_m02.shop, seed_money: 2 });
    expect(a3_m03.technicianAbility).toBeNull();
  });

  it('owns Head Start and the Bulkhead from A3M1 on, one equipped and one left off (T660)', () => {
    expect([a3_m01.protocols, a3_m01.unequippedProtocols]).toEqual([
      ['head_start'],
      ['emergency_bulkhead'],
    ]);
    expect([a3_m02.protocols, a3_m02.unequippedProtocols]).toEqual([
      ['emergency_bulkhead'],
      ['head_start'],
    ]);
    expect([a3_m03.protocols, a3_m03.unequippedProtocols]).toEqual([
      ['head_start'],
      ['emergency_bulkhead'],
    ]);
  });

  it('prices a protocol owned but left off like an equipped one', () => {
    // Priced past what the campaign pays, each Bulkhead is refused, A3M1's and A3M3's included,
    // where it sits off.
    const protocols = {
      ...LIVE_PURCHASE_RULES.protocols,
      emergency_bulkhead: { ...LIVE_PURCHASE_RULES.protocols.emergency_bulkhead!, price: 5000 },
    };
    const errors = purchasable({ ...LIVE_PURCHASE_RULES, aheadOfTask: [], protocols });
    expect(
      errors
        .map(
          (e) =>
            /maps\.(a3_m0\d|fin_m01)\.referenceProfile(?:ByFlag\[\d\]\.profile)?: spends/.exec(
              e,
            )?.[1],
        )
        .filter((m) => m === undefined || m <= 'a3_m05'),
    ).toEqual([
      'a3_m01',
      'a3_m02',
      'a3_m03',
      'a3_m04',
      'a3_m04',
      // A3M5 (T721): its row and its three flag cells.
      'a3_m05',
      'a3_m05',
      'a3_m05',
      'a3_m05',
    ]);
    // The finale's row (registered by T820) owns the Bulkhead too, left off.
    expect(errors.some((e) => /maps\.fin_m01\.referenceProfile: spends/.test(e))).toBe(true);
    // A protocol is listed once, equipped or not.
    const raw = withRows();
    const a3m1 = raw.maps.a3_m01!;
    const twice = { ...a3m1.referenceProfile, unequippedProtocols: ['head_start'] as const };
    const maps = { ...raw.maps, a3_m01: { ...a3m1, referenceProfile: twice } };
    expect(validate({ ...raw, maps }).join('\n')).toMatch(
      /a3_m01\.referenceProfile\.protocols: 'head_start' is listed twice/,
    );
  });

  it('every Act III row is affordable: Intel 10 by A3M2, as § 4.9 says', () => {
    const live = { ...LIVE_PURCHASE_RULES, aheadOfTask: [] };
    expect(purchasable(live).filter((e) => /a3_m0\d/.test(e))).toEqual([]);
  });
});

describe('REFERENCE_PROFILES, Act III part two (M7, T700b)', () => {
  const { a3_m03, a3_m04, a3_m05, a3_m06 } = REFERENCE_PROFILES;
  const [warren4] = REFERENCE_VARIANTS.a3_m04;

  it('follows campaign.md § 4.9 into A3M4: the jailbroken Rivet, the Hum Choir, System Reboot', () => {
    expect(a3_m04.towers).toEqual([...a3_m03.towers, 'rivet', 'choir']);
    expect(a3_m04.shop).toEqual(a3_m03.shop);
    expect(a3_m04.technicianAbility).toBe('system_reboot');
    // Head Start carried on from A3M3, whose Holdout benched the Bulkhead (T771, T874): the
    // protocol a live player brings, so A3M4 and A3M5 run what the harness runs.
    expect([a3_m04.protocols, a3_m04.unequippedProtocols]).toEqual([
      ['head_start'],
      ['emergency_bulkhead'],
    ]);
    expect(a3_m05.protocols).toEqual(['head_start']);
    // The warren's Gloop Spitter, given in the briefing.
    expect(warren4?.when).toEqual({ door_choice: 'warren' });
    expect(warren4?.profile.towers).toEqual([...a3_m04.towers, 'gloop']);
  });

  it('into A3M5: the Sproing Pad, the Stasis Bloom (Intel 13), Mindspike tune 1; Rewrite runs Suppressing Fire', () => {
    expect(a3_m05.towers).toEqual([...a3_m04.towers, 'sproing', 'bloom']);
    expect(a3_m05.shop).toEqual({ ...a3_m04.shop, tune_mindspike: 1 });
    expect(a3_m05.technicianAbility).toBe('system_reboot');
    const cell = (door: 'convoy' | 'warren', quill: 'keep' | 'purge' | 'rewrite'): ProfileDef =>
      firstMatch(REFERENCE_VARIANTS.a3_m05, { door_choice: door, quill_choice: quill }) ?? a3_m05;
    for (const door of ['convoy', 'warren'] as const) {
      expect(cell(door, 'rewrite').technicianAbility).toBe('suppressing_fire');
      expect(cell(door, 'keep').technicianAbility).toBe('system_reboot');
      expect(cell(door, 'purge')).toEqual(cell(door, 'keep'));
      expect(cell(door, 'keep').towers.includes('gloop')).toBe(door === 'warren');
    }
  });

  it("into A3M6: the Gloop on both doors, Harpoon tune 2, and Zibzab's crate", () => {
    expect(a3_m06.towers).toEqual([...a3_m05.towers, 'gloop']);
    expect(a3_m06.shop).toEqual({
      ...a3_m05.shop,
      tune_zapcoil: 3,
      tune_lookout: 3,
      tune_harpoon: 3,
    });
    expect(a3_m06.technicianAbility).toBe('suppressing_fire');
    expect(a3_m06.protocols).toEqual(['head_start']);
    expect(REFERENCE_VARIANTS.a3_m06).toEqual([]);
    // The crate's free ranks: what it adds over Harpoon tune 2 and Zapcoil tune 2, all of the
    // Lookout's (meta/storyTransactions.ts `crateContents` installs them; its test pins the rule).
    for (const door of ['convoy', 'warren'] as const) {
      expect(REFERENCE_STORY_PRICING.a3_m06[door].giftedShop).toEqual({
        tune_zapcoil: 3 - (a3_m05.shop.tune_zapcoil ?? 0),
        tune_lookout: 3,
        tune_harpoon: 1,
      });
    }
  });

  it('prices every door and C4 cell on the campaign timeline (jailbreak and crate as the story pays them)', () => {
    for (const door of ['convoy', 'warren'] as const) {
      for (const quill of ['keep', 'purge', 'rewrite'] as const) {
        const flags = { door_choice: door, quill_choice: quill } as const;
        expect(pricedErrors(flags), `${door} × ${quill}`).toEqual([]);
      }
    }
  });

  it('refuses a warren that spends more than the campaign pays once the jailbreak is priced', () => {
    // The story's price counts: the jailbreak at 1,700 overspends from A3M4 on.
    const errors = pricedErrors({ door_choice: 'warren', quill_choice: 'keep' }, 1400);
    expect(errors.join('\n')).toMatch(/a3_m0[4-6]\.referenceProfile: spends \d+ Stardust/);
  });
});

describe('REFERENCE_PROFILES, the finale (M8, T800b)', () => {
  const { a3_m06, fin_m01 } = REFERENCE_PROFILES;

  it('follows campaign.md § 4.9 into FIN: A3M6 plus the Mindspike specs (Intel 16)', () => {
    expect(fin_m01.towers).toEqual(a3_m06.towers);
    expect(fin_m01.specs).toEqual([...a3_m06.specs, 'mindspike']);
    expect(fin_m01.shop).toEqual(a3_m06.shop);
    expect(fin_m01.protocols).toEqual(['head_start']);
    expect(fin_m01.technicianAbility).toBe('suppressing_fire');
    // Intel spent by FIN: Thumper 2 + Sprinkler 2 + Zapcoil 3 + Mindspike attune 3 + Bloom 3 +
    // Mindspike specs 3 = 16, under the 17 Victory medals won before it.
    expect(fin_m01.specs).toHaveLength(4);
  });

  it('owns the same in every flag cell; the choir cells resolve to the FIN row', () => {
    expect(REFERENCE_VARIANTS.fin_m01).toEqual([]);
    for (const cell of Object.values(FIN_CHOIR_CELLS)) {
      expect(firstMatch(REFERENCE_VARIANTS.fin_m01, cell) ?? fin_m01).toBe(fin_m01);
    }
    // The smallest choir is every flag's smaller-choir branch, the largest its larger.
    expect(FIN_CHOIR_CELLS.smallest).toEqual({
      spared_quiet_wave: false,
      stardust_choice: 'sold',
      door_choice: 'convoy',
      quill_choice: 'purge',
    });
    expect(FIN_CHOIR_CELLS.largest).toEqual({
      spared_quiet_wave: true,
      stardust_choice: 'returned',
      door_choice: 'warren',
      quill_choice: 'rewrite',
    });
  });

  it('prices the story into the finale as into A3M6 (the jailbreak by door, the crate)', () => {
    expect(REFERENCE_STORY_PRICING.fin_m01).toEqual(REFERENCE_STORY_PRICING.a3_m06);
  });

  it('prices both choir cells on the campaign timeline, the finale included', () => {
    for (const [name, cell] of Object.entries(FIN_CHOIR_CELLS)) {
      const errors = pricedErrors(cell);
      expect(errors, name).toEqual([]);
    }
    // Priced past what the campaign pays, the finale's row is refused too.
    const errors = pricedErrors(FIN_CHOIR_CELLS.largest, 1700);
    expect(errors.join('\n')).toMatch(/fin_m01\.referenceProfile: spends \d+ Stardust/);
  });
});

/** The first cell of `cells` whose `when` every flag in `flags` meets. */
function firstMatch(
  cells: readonly FlagProfileDef[],
  flags: Readonly<Record<string, string | boolean>>,
): ProfileDef | undefined {
  return cells.find((c) => Object.entries(c.when).every(([f, v]) => flags[f] === v))?.profile;
}

/** campaign.md § 4.9's first-clear Stardust for M7's maps and the finale. */
const M7_STARDUST = [
  ['a3_m04', 330],
  ['a3_m05', 355],
  ['a3_m06', 380],
  ['fin_m01', 500],
] as const;

/**
 * The [purchasable] errors of the campaign with M7's maps stood in (A1M5 copies paying their
 * first-clear Stardust), each carrying its cell under `flags`, priced as the story pays: the
 * crate's ranks taken off the shop, and the jailbreak as a stand-in upgrade (`jailbreak`, its
 * `StoryPricing.stardust`, plus `extra` to test the check reads it). Stub towers count as landed.
 */
function pricedErrors(
  flags: { door_choice: 'convoy' | 'warren'; quill_choice: string } & Readonly<
    Record<string, string | boolean>
  >,
  extra = 0,
): string[] {
  const raw = withRows();
  const a1m5: MapDef<IdSpace> = RAW_CONTENT.maps.a1_m05;
  const maps: Record<string, MapDef<IdSpace>> = { ...raw.maps };
  const campaign: string[] = [...raw.campaign];
  for (const [id, stardust] of M7_STARDUST) {
    const cells: readonly FlagProfileDef[] = REFERENCE_VARIANTS[id];
    const profile = firstMatch(cells, flags) ?? REFERENCE_PROFILES[id];
    const pricing: StoryPricing = REFERENCE_STORY_PRICING[id][flags.door_choice];
    const shop: Record<string, number> = { ...profile.shop };
    for (const [item, free] of Object.entries(pricing.giftedShop ?? {})) {
      shop[item] = (shop[item] ?? 0) - (free ?? 0);
      if (shop[item] === 0) delete shop[item];
    }
    if (pricing.stardust + extra > 0) shop['jailbreak'] = 1;
    const priced = { ...profile, shop } as ProfileDef;
    if (!campaign.includes(id)) campaign.push(id);
    maps[id] = { ...(maps[id] ?? a1m5), id, stardust, referenceProfile: priced };
  }
  const jailbreak: UpgradeDef<string, string> = {
    id: 'jailbreak',
    name: 'Jailbreak',
    copy: null,
    kind: 'shop',
    currency: 'stardust',
    availableAfter: 'a3_m03',
    ranks: [{ price: REFERENCE_STORY_PRICING.a3_m04.warren.stardust + extra, grants: [] }],
  };
  // This helper prices the story by hand, so the check's own story pricing is off.
  const rules: PurchaseRules = {
    ...LIVE_PURCHASE_RULES,
    aheadOfTask: [],
    upgrades: { ...LIVE_PURCHASE_RULES.upgrades, jailbreak },
    storyPricing: {},
  };
  return validate(
    { ...raw, maps, campaign },
    { ...DEFAULT_VALIDATION_RULES, purchases: rules },
  ).filter((e) => e.startsWith('[purchasable]'));
}
